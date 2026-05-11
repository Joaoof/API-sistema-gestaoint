import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { parseOfx } from './ofx-parser';

interface ActorContext {
  userId: string;
  companyId: string;
}

/**
 * Tolerância de match automático:
 *  - Valor exato
 *  - Data ± MATCH_DAYS dias
 *  - Mesmo banco
 *  - Sinal: OFX CREDIT (amount > 0) → CashMovement ENTRY
 *           OFX DEBIT  (amount < 0) → CashMovement EXIT
 */
const MATCH_DAYS = 2;

@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async importOfx(
    actor: ActorContext,
    args: { bankId: string; fileName: string; content: string },
  ) {
    const bank = await this.prisma.bank.findFirst({
      where: { id: args.bankId, companyId: actor.companyId },
    });
    if (!bank) throw new NotFoundException('Banco não encontrado.');

    const parsed = parseOfx(args.content);

    return this.prisma.$transaction(async (tx) => {
      const imp = await tx.bankStatementImport.create({
        data: {
          companyId: actor.companyId,
          bankId: args.bankId,
          fileName: args.fileName,
          format: 'OFX',
          rangeStart: parsed.rangeStart,
          rangeEnd: parsed.rangeEnd,
          totalItems: parsed.transactions.length,
          importedBy: actor.userId,
        },
      });

      // Anti-duplicata por fitId (mesmo banco)
      const fitIds = parsed.transactions.map((t) => t.fitId).filter((x): x is string => !!x);
      const existing = fitIds.length
        ? await tx.bankStatementItem.findMany({
            where: { bankId: args.bankId, fitId: { in: fitIds } },
            select: { fitId: true },
          })
        : [];
      const existingFits = new Set(existing.map((e) => e.fitId).filter((x): x is string => !!x));

      const toCreate = parsed.transactions
        .filter((t) => !t.fitId || !existingFits.has(t.fitId))
        .map((t) => ({
          importId: imp.id,
          companyId: actor.companyId,
          bankId: args.bankId,
          fitId: t.fitId,
          trnType: t.trnType,
          postedAt: t.postedAt,
          amount: t.amount,
          memo: t.memo,
          checkNum: t.checkNum,
        }));

      if (toCreate.length === 0) {
        return { import: imp, itemsCreated: 0, duplicatesSkipped: parsed.transactions.length };
      }

      await tx.bankStatementItem.createMany({ data: toCreate });
      await tx.bankStatementImport.update({
        where: { id: imp.id },
        data: { totalItems: toCreate.length },
      });

      return {
        import: imp,
        itemsCreated: toCreate.length,
        duplicatesSkipped: parsed.transactions.length - toCreate.length,
      };
    });
  }

  /** Tenta casar cada item UNMATCHED com um CashMovement existente. */
  async autoMatch(actor: ActorContext, importId: string) {
    const items = await this.prisma.bankStatementItem.findMany({
      where: {
        importId,
        companyId: actor.companyId,
        matchedStatus: 'UNMATCHED',
      },
    });

    let matched = 0;
    for (const item of items) {
      const isCredit = Number(item.amount) >= 0;
      const absValue = Math.abs(Number(item.amount));
      const windowStart = new Date(item.postedAt);
      windowStart.setDate(windowStart.getDate() - MATCH_DAYS);
      const windowEnd = new Date(item.postedAt);
      windowEnd.setDate(windowEnd.getDate() + MATCH_DAYS);

      const candidate = await this.prisma.cashMovement.findFirst({
        where: {
          companyId: actor.companyId,
          bankId: item.bankId,
          value: absValue,
          type: isCredit ? 'ENTRY' : 'EXIT',
          date: { gte: windowStart, lte: windowEnd },
          status: 'COMPLETED',
          // Não casa de novo se já está vinculado
          NOT: {
            id: {
              in: await this.prisma.bankStatementItem.findMany({
                where: {
                  companyId: actor.companyId,
                  cashMovementId: { not: null },
                  NOT: { id: item.id },
                },
                select: { cashMovementId: true },
              }).then((r) => r.map((x) => x.cashMovementId).filter((x): x is string => !!x)),
            },
          },
        },
      });

      if (candidate) {
        await this.prisma.bankStatementItem.update({
          where: { id: item.id },
          data: { matchedStatus: 'AUTO', cashMovementId: candidate.id },
        });
        matched += 1;
      }
    }

    await this.prisma.bankStatementImport.update({
      where: { id: importId },
      data: { matchedItems: { increment: matched } },
    });

    return { matched, total: items.length };
  }

  async manualMatch(
    actor: ActorContext,
    itemId: string,
    cashMovementId: string,
  ) {
    const [item, movement] = await Promise.all([
      this.prisma.bankStatementItem.findFirst({
        where: { id: itemId, companyId: actor.companyId },
      }),
      this.prisma.cashMovement.findFirst({
        where: { id: cashMovementId, companyId: actor.companyId },
      }),
    ]);
    if (!item) throw new NotFoundException('Item OFX não encontrado.');
    if (!movement) throw new NotFoundException('Movimento não encontrado.');

    return this.prisma.bankStatementItem.update({
      where: { id: itemId },
      data: { matchedStatus: 'MANUAL', cashMovementId },
    });
  }

  /** Cria um CashMovement novo a partir de um item OFX órfão. */
  async createMovementFromItem(actor: ActorContext, itemId: string) {
    const item = await this.prisma.bankStatementItem.findFirst({
      where: { id: itemId, companyId: actor.companyId },
    });
    if (!item) throw new NotFoundException('Item OFX não encontrado.');
    if (item.cashMovementId) {
      throw new BadRequestException('Item já está vinculado a um movimento.');
    }

    const isCredit = Number(item.amount) >= 0;
    const absValue = Math.abs(Number(item.amount));

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.cashMovement.create({
        data: {
          companyId: actor.companyId,
          type: isCredit ? 'ENTRY' : 'EXIT',
          category: isCredit ? 'OTHER_IN' : 'EXPENSE',
          value: absValue,
          description: item.memo ?? `Importado OFX — ${item.trnType}`,
          user_id: actor.userId,
          bankId: item.bankId,
          typePayment: 'BANK_TRANSFER',
          status: 'COMPLETED',
          referenceCode: item.fitId ?? null,
          date: item.postedAt,
          paidAt: item.postedAt,
          notes: 'Criado a partir de conciliação OFX',
        },
      });
      await tx.bankStatementItem.update({
        where: { id: item.id },
        data: { matchedStatus: 'CREATED', cashMovementId: movement.id },
      });
      return movement;
    });
  }

  async ignore(actor: ActorContext, itemId: string) {
    const item = await this.prisma.bankStatementItem.findFirst({
      where: { id: itemId, companyId: actor.companyId },
    });
    if (!item) throw new NotFoundException('Item OFX não encontrado.');
    return this.prisma.bankStatementItem.update({
      where: { id: itemId },
      data: { matchedStatus: 'IGNORED' },
    });
  }

  async listImports(companyId: string, limit = 50) {
    return this.prisma.bankStatementImport.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  async getImport(companyId: string, importId: string) {
    const imp = await this.prisma.bankStatementImport.findFirst({
      where: { id: importId, companyId },
      include: {
        items: { orderBy: { postedAt: 'asc' } },
      },
    });
    if (!imp) throw new NotFoundException('Importação não encontrada.');
    return imp;
  }
}
