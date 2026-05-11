import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ActivityItem, GrowthPoint, HealthStatus,
  SuperAdminOverview, SuperAdminOverviewKpis,
} from '../dto/super-admin.dto';

@Injectable()
export class SuperAdminMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(): Promise<SuperAdminOverview> {
    const [kpis, health, recentActivity, growth30d] = await Promise.all([
      this.buildKpis(),
      this.buildHealth(),
      this.buildRecentActivity(),
      this.buildGrowth30d(),
    ]);
    return { kpis, health, recentActivity, growth30d };
  }

  private async buildKpis(): Promise<SuperAdminOverviewKpis> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const since30d = new Date(now.getTime() - 30 * 86400_000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      companies, companiesNewThisMonth,
      users, usersNewThisMonth,
      pendingInvites, activePlans,
      revenueAgg, webhooksFailing, eventsToday,
    ] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.users.count(),
      this.prisma.users.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.invitation.count({
        where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
      }),
      this.prisma.plan.count({ where: { isActive: true } }),
      this.prisma.aiCreditPurchase.aggregate({
        _sum: { packageBrl: true },
        where: { status: 'PAID', paidAt: { gte: since30d } },
      }),
      this.prisma.bankConnection.count({ where: { status: 'AUTH_FAIL' } }),
      this.prisma.webhookLog.count({ where: { createdAt: { gte: startOfToday } } }),
    ]);

    return {
      companies,
      companiesNewThisMonth,
      users,
      usersNewThisMonth,
      pendingInvites,
      activePlans,
      aiCreditsRevenue30d: revenueAgg._sum.packageBrl ?? 0,
      webhooksFailing,
      eventsToday,
    };
  }

  private async buildHealth(): Promise<HealthStatus[]> {
    const items: HealthStatus[] = [];

    // DB — se chegou aqui, o DB respondeu
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      items.push({ service: 'database', status: 'ok' });
    } catch (e: any) {
      items.push({ service: 'database', status: 'down', detail: e?.message });
    }

    // Email (Resend) — só warn se a env não estiver
    items.push({
      service: 'email',
      status: process.env.RESEND_API_KEY ? 'ok' : 'warn',
      detail: process.env.RESEND_API_KEY ? undefined : 'RESEND_API_KEY não configurada',
    });

    // OpenAI
    items.push({
      service: 'openai',
      status: process.env.OPENAI_API_KEY ? 'ok' : 'warn',
      detail: process.env.OPENAI_API_KEY ? undefined : 'OPENAI_API_KEY não configurada',
    });

    // Banks — soma falhas atuais
    const itauFails = await this.prisma.bankConnection.count({
      where: { provider: 'DIRECT_ITAU', status: 'AUTH_FAIL' },
    });
    const bbFails = await this.prisma.bankConnection.count({
      where: { provider: 'DIRECT_BB', status: 'AUTH_FAIL' },
    });
    items.push({
      service: 'itau-webhook',
      status: itauFails > 0 ? 'warn' : 'ok',
      detail: itauFails > 0 ? `${itauFails} conexão(ões) com auth falha` : undefined,
    });
    items.push({
      service: 'bb-webhook',
      status: bbFails > 0 ? 'warn' : 'ok',
      detail: bbFails > 0 ? `${bbFails} conexão(ões) com auth falha` : undefined,
    });

    items.push({
      service: 'pix',
      status: process.env.PIX_KEY ? 'ok' : 'warn',
      detail: process.env.PIX_KEY ? undefined : 'PIX_KEY não configurada',
    });

    return items;
  }

  private async buildRecentActivity(): Promise<ActivityItem[]> {
    // Junta últimos audit logs + invitations aceitos + compras IA pagas
    const [logs, accepted, paidPurchases] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { user: { select: { name: true } }, company: { select: { name: true } } },
      }),
      this.prisma.invitation.findMany({
        where: { acceptedAt: { not: null } },
        orderBy: { acceptedAt: 'desc' },
        take: 5,
      }),
      this.prisma.aiCreditPurchase.findMany({
        where: { status: 'PAID' },
        orderBy: { paidAt: 'desc' },
        take: 5,
      }),
    ]);

    const items: ActivityItem[] = [];

    for (const l of logs) {
      items.push({
        id: `log-${l.id}`,
        who: l.user?.name ?? 'Sistema',
        action: `${l.action.toLowerCase()} ${l.entity.toLowerCase()}`,
        target: l.entityId,
        at: l.createdAt,
        companyName: l.company?.name,
      });
    }
    for (const i of accepted) {
      if (!i.acceptedAt) continue;
      items.push({
        id: `inv-${i.id}`,
        who: i.email,
        action: 'aceitou convite',
        target: i.role,
        at: i.acceptedAt,
      });
    }
    for (const p of paidPurchases) {
      if (!p.paidAt) continue;
      items.push({
        id: `pur-${p.id}`,
        who: 'Sistema',
        action: 'confirmou compra IA',
        target: `R$ ${p.packageBrl}`,
        at: p.paidAt,
      });
    }

    return items
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 12);
  }

  private async buildGrowth30d(): Promise<GrowthPoint[]> {
    const now = new Date();
    const points: GrowthPoint[] = [];

    // 12 buckets de ~2.5 dias cada
    const bucketSize = 2.5 * 86400_000;
    for (let i = 11; i >= 0; i--) {
      const end = new Date(now.getTime() - i * bucketSize);
      const start = new Date(end.getTime() - bucketSize);

      const [companies, users] = await Promise.all([
        this.prisma.company.count({ where: { createdAt: { gte: start, lt: end } } }),
        this.prisma.users.count({ where: { createdAt: { gte: start, lt: end } } }),
      ]);

      points.push({
        label: `${start.getDate()}/${start.getMonth() + 1}`,
        companies,
        users,
      });
    }
    return points;
  }
}
