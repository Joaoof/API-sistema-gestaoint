import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { buildPixBrCode, makePixTxid } from './pix-brcode.helper';

export const CREDIT_PACKAGES = [
  { brl: 50, base: 1000, bonus: 0 },
  { brl: 70, base: 1400, bonus: 100 }, // +7%
  { brl: 100, base: 2000, bonus: 300 }, // +15%
] as const;

export type CreditPackageBrl = (typeof CREDIT_PACKAGES)[number]['brl'];

const PIX_KEY = process.env.PIX_KEY ?? '63991021043';
const PIX_MERCHANT_NAME = process.env.PIX_MERCHANT_NAME ?? 'GESTAOINT';
const PIX_MERCHANT_CITY = process.env.PIX_MERCHANT_CITY ?? 'BRASILIA';
const PURCHASE_EXPIRES_HOURS = 24;

export class InsufficientCreditsError extends ForbiddenException {
  constructor(public readonly balance: number, public readonly required: number) {
    super(
      `Créditos insuficientes (saldo: ${balance}, necessário: ${required}). Compre mais créditos para continuar.`,
    );
  }
}

@Injectable()
export class AiCreditsService {
  private readonly logger = new Logger(AiCreditsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateAccount(companyId: string) {
    const found = await this.prisma.aiCreditAccount.findUnique({
      where: { companyId },
    });
    if (found) return found;
    return this.prisma.aiCreditAccount.create({ data: { companyId } });
  }

  /** Verifica saldo + retorna se está em "low" (abaixo do threshold). */
  async checkBalance(companyId: string) {
    const acc = await this.getOrCreateAccount(companyId);
    return {
      balance: acc.balance,
      lowThreshold: acc.lowThreshold,
      isLow: acc.balance <= acc.lowThreshold,
      isEmpty: acc.balance <= 0,
    };
  }

  /**
   * Debita créditos. Lança `InsufficientCreditsError` se faltar saldo.
   * Idempotência: se `refId` já existir como CONSUMPTION, não duplica.
   */
  async consume(args: {
    companyId: string;
    amount: number;
    description: string;
    userId?: string;
    refType?: string;
    refId?: string;
  }) {
    if (args.amount <= 0) return null;

    return this.prisma.$transaction(async (tx) => {
      const acc = await tx.aiCreditAccount.upsert({
        where: { companyId: args.companyId },
        update: {},
        create: { companyId: args.companyId },
      });

      if (args.refId) {
        const dup = await tx.aiCreditTransaction.findFirst({
          where: { accountId: acc.id, kind: 'CONSUMPTION', refId: args.refId },
        });
        if (dup) return dup;
      }

      if (acc.balance < args.amount) {
        throw new InsufficientCreditsError(acc.balance, args.amount);
      }

      const newBalance = acc.balance - args.amount;
      await tx.aiCreditAccount.update({
        where: { id: acc.id },
        data: {
          balance: newBalance,
          totalConsumed: acc.totalConsumed + args.amount,
        },
      });

      return tx.aiCreditTransaction.create({
        data: {
          accountId: acc.id,
          companyId: args.companyId,
          kind: 'CONSUMPTION',
          amount: -args.amount,
          balanceAfter: newBalance,
          refType: args.refType ?? null,
          refId: args.refId ?? null,
          description: args.description,
          userId: args.userId ?? null,
        },
      });
    });
  }

  /**
   * Cria uma compra: monta o BR Code, marca como PENDING.
   */
  async requestPurchase(args: {
    companyId: string;
    packageBrl: number;
    userId: string;
  }) {
    const pkg = CREDIT_PACKAGES.find((p) => p.brl === args.packageBrl);
    if (!pkg) throw new BadRequestException('Pacote inválido. Use 50, 70 ou 100.');

    const account = await this.getOrCreateAccount(args.companyId);
    const txid = makePixTxid('GES');

    const pixCopyPaste = buildPixBrCode({
      pixKey: PIX_KEY,
      amount: pkg.brl,
      txid,
      merchantName: PIX_MERCHANT_NAME,
      merchantCity: PIX_MERCHANT_CITY,
      description: `${pkg.base + pkg.bonus} CREDITOS IA`,
    });

    const expiresAt = new Date(Date.now() + PURCHASE_EXPIRES_HOURS * 3600 * 1000);

    const purchase = await this.prisma.aiCreditPurchase.create({
      data: {
        accountId: account.id,
        companyId: args.companyId,
        packageBrl: pkg.brl,
        creditsBase: pkg.base,
        creditsBonus: pkg.bonus,
        creditsTotal: pkg.base + pkg.bonus,
        pixKey: PIX_KEY,
        pixCopyPaste,
        pixTxid: txid,
        expiresAt,
        createdByUserId: args.userId,
      },
    });

    return purchase;
  }

  /**
   * Confirma o pagamento. Adiciona créditos atomicamente.
   * Apenas super-admin pode confirmar.
   */
  async confirmPurchase(args: { purchaseId: string; superAdminUserId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.aiCreditPurchase.findUnique({
        where: { id: args.purchaseId },
      });
      if (!purchase) throw new NotFoundException('Compra não encontrada.');
      if (purchase.status !== 'PENDING') {
        throw new BadRequestException(`Compra já está em status ${purchase.status}.`);
      }

      const acc = await tx.aiCreditAccount.findUnique({
        where: { id: purchase.accountId },
      });
      if (!acc) throw new NotFoundException('Conta de créditos não encontrada.');

      const newBalance = acc.balance + purchase.creditsTotal;

      await tx.aiCreditAccount.update({
        where: { id: acc.id },
        data: {
          balance: newBalance,
          totalPurchased: acc.totalPurchased + purchase.creditsTotal,
          lowNotifiedAt: null, // limpa flag de notificação
        },
      });

      await tx.aiCreditTransaction.create({
        data: {
          accountId: acc.id,
          companyId: purchase.companyId,
          kind: 'PURCHASE',
          amount: purchase.creditsTotal,
          balanceAfter: newBalance,
          refType: 'AiCreditPurchase',
          refId: purchase.id,
          description: `Compra confirmada — R$ ${purchase.packageBrl} → ${purchase.creditsTotal} créditos`,
          userId: args.superAdminUserId,
        },
      });

      return tx.aiCreditPurchase.update({
        where: { id: purchase.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paidByUserId: args.superAdminUserId,
        },
      });
    });
  }

  async cancelPurchase(args: { purchaseId: string; userId: string }) {
    const purchase = await this.prisma.aiCreditPurchase.findUnique({
      where: { id: args.purchaseId },
    });
    if (!purchase) throw new NotFoundException('Compra não encontrada.');
    if (purchase.status !== 'PENDING') {
      throw new BadRequestException(`Não é possível cancelar (status ${purchase.status}).`);
    }
    return this.prisma.aiCreditPurchase.update({
      where: { id: purchase.id },
      data: { status: 'CANCELED' },
    });
  }

  async listPurchases(args: { companyId?: string; status?: string; limit?: number }) {
    return this.prisma.aiCreditPurchase.findMany({
      where: {
        ...(args.companyId ? { companyId: args.companyId } : {}),
        ...(args.status ? { status: args.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(args.limit ?? 50, 200),
    });
  }

  async listTransactions(args: { companyId: string; limit?: number }) {
    return this.prisma.aiCreditTransaction.findMany({
      where: { companyId: args.companyId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(args.limit ?? 50, 200),
    });
  }

  async listAccountsForAdmin() {
    return this.prisma.aiCreditAccount.findMany({
      orderBy: { balance: 'asc' },
      include: { _count: { select: { transactions: true, purchases: true } } },
    });
  }
}
