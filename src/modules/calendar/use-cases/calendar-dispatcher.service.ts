import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationSeverity, NotificationType } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { EvolutionTenantClient } from '../../chatbotEvolution/use-cases/evolution-tenant.client';
import { CalendarReminderEntity } from '../entities/calendar-event.entity';
import { nextOccurrencesAfter } from './recurrence';
import { WebPushService } from './web-push.service';

const SCAN_WINDOW_MIN = 60 * 24 * 14; // 14 dias à frente
const POLL_INTERVAL_MS = 60_000; // 1 min

@Injectable()
export class CalendarDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CalendarDispatcherService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly evolution: EvolutionTenantClient,
    private readonly webPush: WebPushService,
  ) {}

  onModuleInit() {
    if (process.env.CALENDAR_SCHEDULER_DISABLED === 'true') {
      this.logger.log('Calendar scheduler desativado por env.');
      return;
    }
    // arranque rápido + polling
    this.tick().catch((e) => this.logger.warn(`tick inicial: ${e?.message}`));
    this.timer = setInterval(() => {
      this.tick().catch((e) => this.logger.warn(`tick: ${e?.message}`));
    }, POLL_INTERVAL_MS);
    this.logger.log('Calendar scheduler ativo (intervalo 60s).');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    const now = new Date();
    const horizon = new Date(now.getTime() + SCAN_WINDOW_MIN * 60_000);

    // ----- 1. CalendarEvents com reminders configurados -----
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        OR: [
          { startAt: { lte: horizon, gte: new Date(now.getTime() - 7 * 24 * 3600_000) } },
          { rrule: { not: null } },
        ],
      },
      include: { exceptions: true },
    });

    for (const e of events) {
      const reminders =
        (e.remindersJson as CalendarReminderEntity[] | null) ?? [];
      if (!Array.isArray(reminders) || reminders.length === 0) continue;

      const exceptions = new Set<string>(
        e.exceptions.filter((x) => x.cancelled).map((x) => x.occurrence.toISOString()),
      );
      const occurrences = e.rrule
        ? nextOccurrencesAfter({
            start: e.startAt,
            end: e.endAt,
            rrule: e.rrule,
            recurrenceUntil: e.recurrenceUntil,
            from: new Date(now.getTime() - SCAN_WINDOW_MIN * 60_000),
            maxDate: horizon,
            limit: 100,
          })
        : [{ start: e.startAt, end: e.endAt }];

      for (const occ of occurrences) {
        if (exceptions.has(occ.start.toISOString())) continue;
        for (const r of reminders) {
          const fireAt = new Date(occ.start.getTime() - r.offsetMin * 60_000);
          // dispara se entre o último tick (60s atrás) e agora
          if (fireAt <= now && fireAt > new Date(now.getTime() - POLL_INTERVAL_MS * 2)) {
            for (const channel of r.channels) {
              await this.fireOnce(e, occ.start, channel, r.offsetMin);
            }
          }
        }
      }
    }

    // ----- 2. CompanyReminder vencendo (canal IN_APP padrão) -----
    await this.tickCompanyReminders(now);

    // ----- 3. AccountPayable / AccountReceivable vencendo HOJE -----
    await this.tickAccountsDueToday(now);
  }

  private async fireOnce(
    event: { id: string; companyId: string; userId: string | null; title: string; description: string | null; link: string | null },
    occurrence: Date,
    channel: string,
    offsetMin: number,
  ) {
    // idempotência via unique (eventId, occurrence, channel, offsetMin)
    try {
      await this.prisma.calendarReminderFire.create({
        data: {
          eventId: event.id,
          occurrence,
          channel,
          offsetMin,
          status: 'PENDING',
        },
      });
    } catch {
      return; // já disparado
    }

    const offsetLabel =
      offsetMin === 0
        ? 'agora'
        : offsetMin < 60
          ? `em ${offsetMin} min`
          : offsetMin < 24 * 60
            ? `em ${Math.round(offsetMin / 60)}h`
            : `em ${Math.round(offsetMin / (24 * 60))}d`;
    const body = event.description
      ? `${event.description}\n\nQuando: ${occurrence.toLocaleString('pt-BR')}`
      : `Quando: ${occurrence.toLocaleString('pt-BR')}`;

    let status: 'SENT' | 'FAILED' = 'SENT';
    let errorMessage: string | null = null;

    try {
      if (channel === 'IN_APP') {
        await this.prisma.notification.create({
          data: {
            companyId: event.companyId,
            userId: event.userId,
            type: NotificationType.CUSTOM,
            severity: NotificationSeverity.INFO,
            title: `⏰ ${event.title} (${offsetLabel})`,
            message: body,
            href: event.link ?? '/calendario',
            entity: 'CalendarEvent',
            entityId: event.id,
          },
        });
      } else if (channel === 'EMAIL') {
        const user = event.userId
          ? await this.prisma.users.findUnique({
              where: { id: event.userId },
              select: { email: true, name: true },
            })
          : null;
        if (!user?.email) throw new Error('Usuário sem e-mail');
        const r = await this.email.sendGeneric({
          to: user.email,
          subject: `⏰ ${event.title} (${offsetLabel})`,
          text: body,
        });
        if (!r.ok) throw new Error(r.error ?? 'erro envio email');
      } else if (channel === 'WHATSAPP') {
        const user = event.userId
          ? await this.prisma.users.findUnique({
              where: { id: event.userId },
              select: { phone: true },
            })
          : null;
        if (!user?.phone) throw new Error('Usuário sem telefone');
        await this.evolution.sendText(
          event.companyId,
          user.phone,
          `⏰ *${event.title}* (${offsetLabel})\n\n${body}`,
        );
      } else if (channel === 'PUSH') {
        const r = await this.webPush.sendToUser({
          companyId: event.companyId,
          userId: event.userId,
          title: `⏰ ${event.title}`,
          body: `${offsetLabel} · ${occurrence.toLocaleString('pt-BR')}`,
          url: event.link ?? '/calendario',
          tag: event.id,
        });
        if (r.sent === 0 && r.failed === 0) {
          // sem subscriptions ativas → considera ok (não falha)
        }
      }
    } catch (err: any) {
      status = 'FAILED';
      errorMessage = err?.message ?? String(err);
      this.logger.warn(
        `dispatch ${channel} falhou (event=${event.id}): ${errorMessage}`,
      );
    }

    await this.prisma.calendarReminderFire
      .update({
        where: {
          eventId_occurrence_channel_offsetMin: {
            eventId: event.id,
            occurrence,
            channel,
            offsetMin,
          },
        },
        data: { status, errorMessage },
      })
      .catch(() => undefined);
  }

  /**
   * Lembretes da empresa (CompanyReminder) que venceram nos últimos 2min e
   * ainda não foram notificados — cria notificação in-app. Os outros canais
   * dos reminders ficam pra V2 (modelo CompanyReminder não tem campo `channels`).
   */
  private async tickCompanyReminders(now: Date) {
    const due = await this.prisma.companyReminder.findMany({
      where: {
        doneAt: null,
        notifiedAt: null,
        dueAt: { lte: now, gte: new Date(now.getTime() - 5 * 60_000) },
      },
      take: 50,
    });
    for (const r of due) {
      await this.prisma.notification
        .create({
          data: {
            companyId: r.companyId,
            userId: null,
            type: NotificationType.CUSTOM,
            severity:
              r.priority === 'critical'
                ? NotificationSeverity.CRITICAL
                : r.priority === 'high'
                  ? NotificationSeverity.WARNING
                  : NotificationSeverity.INFO,
            title: `📌 ${r.title}`,
            message: r.description ?? 'Lembrete vencido.',
            href: r.link ?? '/lembretes',
            entity: 'CompanyReminder',
            entityId: r.id,
          },
        })
        .catch(() => undefined);
      await this.prisma.companyReminder
        .update({ where: { id: r.id }, data: { notifiedAt: now } })
        .catch(() => undefined);
    }
  }

  /**
   * Contas a pagar/receber vencendo HOJE — cria 1 notif in-app por conta (idempotente
   * via entity+entityId+createdAt do dia).
   */
  private async tickAccountsDueToday(now: Date) {
    // só dispara entre 08:00 e 08:05 (configurável via env)
    const fireHour = Number(process.env.CALENDAR_DUE_FIRE_HOUR ?? 8);
    if (now.getHours() !== fireHour || now.getMinutes() > 5) return;

    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    const [payables, receivables] = await Promise.all([
      this.prisma.accountPayable.findMany({
        where: { dueDate: { gte: dayStart, lte: dayEnd }, paidAt: null, status: 'PENDING' },
        take: 200,
      }),
      this.prisma.accountReceivable.findMany({
        where: { dueDate: { gte: dayStart, lte: dayEnd }, paidAt: null, status: 'PENDING' },
        take: 200,
      }),
    ]);

    for (const p of payables) {
      const exists = await this.prisma.notification.findFirst({
        where: {
          companyId: p.companyId,
          entity: 'AccountPayable',
          entityId: p.id,
          createdAt: { gte: dayStart },
        },
        select: { id: true },
      });
      if (exists) continue;
      await this.prisma.notification.create({
        data: {
          companyId: p.companyId,
          type: NotificationType.INVOICE_DUE,
          severity: NotificationSeverity.WARNING,
          title: `💸 Conta a pagar vence hoje`,
          message: `${p.description} — ${p.supplierName} — R$ ${p.amount.toString()}`,
          href: `/listar-contas-pagas?id=${p.id}`,
          entity: 'AccountPayable',
          entityId: p.id,
        },
      });
    }

    for (const r of receivables) {
      const exists = await this.prisma.notification.findFirst({
        where: {
          companyId: r.companyId,
          entity: 'AccountReceivable',
          entityId: r.id,
          createdAt: { gte: dayStart },
        },
        select: { id: true },
      });
      if (exists) continue;
      await this.prisma.notification.create({
        data: {
          companyId: r.companyId,
          type: NotificationType.INVOICE_DUE,
          severity: NotificationSeverity.INFO,
          title: `💰 Conta a receber vence hoje`,
          message: `${r.description} — R$ ${r.amount.toString()}`,
          href: `/listar-contas-receber?id=${r.id}`,
          entity: 'AccountReceivable',
          entityId: r.id,
        },
      });
    }
  }
}
