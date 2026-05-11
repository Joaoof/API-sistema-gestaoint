import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  WebhookConnectionDto, WebhookEventDto, WebhooksOverview,
} from '../dto/super-admin.dto';

@Injectable()
export class SuperAdminWebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<WebhooksOverview> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const since24h = new Date(now.getTime() - 24 * 3600_000);

    const [connected, failing, eventsToday, pixLogs] = await Promise.all([
      this.prisma.bankConnection.count({ where: { status: 'CONNECTED' } }),
      this.prisma.bankConnection.count({ where: { status: 'AUTH_FAIL' } }),
      this.prisma.webhookLog.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.webhookLog.findMany({
        where: { event: 'PIX_IN', createdAt: { gte: since24h } },
        select: { payload: true },
      }),
    ]);

    let pixInLast24h = 0;
    for (const l of pixLogs) {
      const p: any = l.payload;
      const value = Number(p?.valor ?? p?.amount ?? p?.value ?? 0);
      if (!Number.isNaN(value)) pixInLast24h += value;
    }

    return { connected, failing, eventsToday, pixInLast24h };
  }

  async listConnections(): Promise<WebhookConnectionDto[]> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const connections = await this.prisma.bankConnection.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const companyIds = [...new Set(connections.map((c) => c.companyId))];
    const companies = await this.prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, name: true },
    });
    const cMap = new Map(companies.map((c) => [c.id, c.name]));

    // Eventos hoje por provider — agregação simples
    const eventsTodayByProvider = await this.prisma.webhookLog.groupBy({
      by: ['provider'],
      _count: { id: true },
      where: { createdAt: { gte: startOfToday } },
    });
    const evMap = new Map(eventsTodayByProvider.map((e) => [e.provider, e._count.id]));

    return connections.map((c) => ({
      id: c.id,
      provider: c.provider,
      bankId: c.bankId,
      companyId: c.companyId,
      companyName: cMap.get(c.companyId) ?? null,
      status: c.status,
      lastSyncAt: c.lastSyncAt,
      lastErrorAt: c.lastErrorAt,
      lastErrorMsg: c.lastErrorMsg,
      eventsToday: evMap.get(c.provider) ?? 0,
      createdAt: c.createdAt,
    }));
  }

  async listEvents(args?: { provider?: string; take?: number }): Promise<WebhookEventDto[]> {
    const events = await this.prisma.webhookLog.findMany({
      where: args?.provider ? { provider: args.provider } : undefined,
      orderBy: { createdAt: 'desc' },
      take: args?.take ?? 100,
    });
    return events.map((e) => ({
      id: e.id,
      provider: e.provider,
      event: e.event,
      processed: e.processed,
      errorMsg: e.errorMsg,
      refType: e.refType,
      refId: e.refId,
      payloadJson: JSON.stringify(e.payload),
      createdAt: e.createdAt,
    }));
  }
}
