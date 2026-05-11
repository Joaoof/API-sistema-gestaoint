import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  AiOverview, AiOverviewKpis, AiPurchaseAdminDto, AiTransactionAdminDto, AiCompanyConsumption,
} from '../dto/super-admin.dto';

@Injectable()
export class SuperAdminAiService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<AiOverview> {
    const now = new Date();
    const since30d = new Date(now.getTime() - 30 * 86400_000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [revenueAgg, soldAgg, conversationsToday, pending] = await Promise.all([
      this.prisma.aiCreditPurchase.aggregate({
        _sum: { packageBrl: true },
        where: { status: 'PAID', paidAt: { gte: since30d } },
      }),
      this.prisma.aiCreditPurchase.aggregate({
        _sum: { creditsTotal: true },
        where: { status: 'PAID', paidAt: { gte: since30d } },
      }),
      this.prisma.aiCreditTransaction.count({
        where: { kind: 'CONSUMPTION', createdAt: { gte: startOfToday } },
      }),
      this.prisma.aiCreditPurchase.count({
        where: { status: 'PENDING', expiresAt: { gt: now } },
      }),
    ]);

    const kpis: AiOverviewKpis = {
      revenue30d: revenueAgg._sum.packageBrl ?? 0,
      creditsSold30d: soldAgg._sum.creditsTotal ?? 0,
      conversationsToday,
      pendingPurchases: pending,
    };

    // Top consumidores: agrupa transações de consumo dos últimos 30d
    const consumed = await this.prisma.aiCreditTransaction.groupBy({
      by: ['companyId'],
      _sum: { amount: true },
      where: { kind: 'CONSUMPTION', createdAt: { gte: since30d } },
      orderBy: { _sum: { amount: 'asc' } }, // mais negativo = mais consumido
      take: 5,
    });

    const companyIds = consumed.map((c) => c.companyId);
    const [accounts, companies] = await Promise.all([
      this.prisma.aiCreditAccount.findMany({ where: { companyId: { in: companyIds } } }),
      this.prisma.company.findMany({
        where: { id: { in: companyIds } },
        select: { id: true, name: true },
      }),
    ]);
    const acctMap = new Map(accounts.map((a) => [a.companyId, a.balance]));
    const companyMap = new Map(companies.map((c) => [c.id, c.name]));

    const topConsumers: AiCompanyConsumption[] = consumed.map((c) => ({
      companyId: c.companyId,
      companyName: companyMap.get(c.companyId) ?? c.companyId,
      consumed30d: Math.abs(c._sum.amount ?? 0),
      balance: acctMap.get(c.companyId) ?? 0,
    }));

    return { kpis, topConsumers };
  }

  async listPurchases(args?: { status?: string; take?: number }): Promise<AiPurchaseAdminDto[]> {
    const purchases = await this.prisma.aiCreditPurchase.findMany({
      where: args?.status ? { status: args.status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: args?.take ?? 50,
    });

    const companyIds = [...new Set(purchases.map((p) => p.companyId))];
    const userIds = [...new Set(purchases.map((p) => p.createdByUserId))];

    const [companies, users] = await Promise.all([
      this.prisma.company.findMany({
        where: { id: { in: companyIds } },
        select: { id: true, name: true },
      }),
      this.prisma.users.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      }),
    ]);
    const cMap = new Map(companies.map((c) => [c.id, c.name]));
    const uMap = new Map(users.map((u) => [u.id, u.name]));

    return purchases.map((p) => ({
      id: p.id,
      companyId: p.companyId,
      companyName: cMap.get(p.companyId) ?? null,
      userId: p.createdByUserId,
      userName: uMap.get(p.createdByUserId) ?? null,
      packageBrl: p.packageBrl,
      creditsTotal: p.creditsTotal,
      pixTxid: p.pixTxid,
      status: p.status,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
    }));
  }

  async listTransactions(args?: { take?: number }): Promise<AiTransactionAdminDto[]> {
    const txs = await this.prisma.aiCreditTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: args?.take ?? 50,
    });
    const companyIds = [...new Set(txs.map((t) => t.companyId))];
    const companies = await this.prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, name: true },
    });
    const cMap = new Map(companies.map((c) => [c.id, c.name]));

    return txs.map((t) => ({
      id: t.id,
      companyId: t.companyId,
      companyName: cMap.get(t.companyId) ?? null,
      kind: t.kind,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      description: t.description,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Confirma manualmente uma compra PENDING (uso: super-admin recebeu PIX
   * fora do webhook). Credita a conta e cria a transação.
   */
  async confirmPurchase(purchaseId: string, adminUserId: string) {
    const purchase = await this.prisma.aiCreditPurchase.findUnique({
      where: { id: purchaseId },
    });
    if (!purchase) throw new NotFoundException('Compra não encontrada.');
    if (purchase.status !== 'PENDING') {
      throw new BadRequestException(`Compra está em status ${purchase.status}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.aiCreditPurchase.update({
        where: { id: purchaseId },
        data: { status: 'PAID', paidAt: new Date(), paidByUserId: adminUserId },
      });

      const account = await tx.aiCreditAccount.update({
        where: { companyId: purchase.companyId },
        data: {
          balance: { increment: purchase.creditsTotal },
          totalPurchased: { increment: purchase.creditsTotal },
        },
      });

      await tx.aiCreditTransaction.create({
        data: {
          accountId: account.id,
          companyId: purchase.companyId,
          kind: 'PURCHASE',
          amount: purchase.creditsTotal,
          balanceAfter: account.balance,
          refType: 'AiCreditPurchase',
          refId: purchase.id,
          description: `Compra confirmada manualmente — pacote R$ ${purchase.packageBrl}`,
          userId: adminUserId,
        },
      });

      return { confirmed: true, newBalance: account.balance };
    });
  }
}
