import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '../dto/calendar-event.input';
import {
  CalendarEventEntity,
  CalendarItemEntity,
  CalendarReminderEntity,
} from '../entities/calendar-event.entity';
import { expandRecurrence } from './recurrence';

type RawEvent = Awaited<ReturnType<PrismaService['calendarEvent']['findFirst']>>;

const DEFAULT_CHANNELS = ['IN_APP'];
const VALID_CHANNELS = new Set(['IN_APP', 'EMAIL', 'WHATSAPP', 'PUSH']);
const VALID_SOURCES = new Set([
  'EVENT',
  'REMINDER',
  'PAYABLE',
  'RECEIVABLE',
  'DELIVERY',
  'CONTRACT',
  'ORDER',
]);

const SOURCE_COLORS: Record<string, string> = {
  EVENT: '#3b82f6',
  REMINDER: '#f59e0b',
  PAYABLE: '#ef4444',
  RECEIVABLE: '#10b981',
  DELIVERY: '#8b5cf6',
  CONTRACT: '#06b6d4',
  ORDER: '#ec4899',
};

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  // =============================================================
  // CRUD CalendarEvent
  // =============================================================

  async create(
    companyId: string,
    userId: string | null,
    input: CreateCalendarEventInput,
  ): Promise<CalendarEventEntity> {
    if (!input.title?.trim()) throw new BadRequestException('Título obrigatório.');
    if (input.endAt < input.startAt) {
      throw new BadRequestException('Data final anterior à inicial.');
    }

    const reminders = this.normalizeReminders(input.reminders, input.channels);

    const created = await this.prisma.calendarEvent.create({
      data: {
        companyId,
        userId: input.userId ?? userId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        location: input.location?.trim() || null,
        color: input.color?.trim() || SOURCE_COLORS.EVENT,
        allDay: input.allDay ?? false,
        startAt: input.startAt,
        endAt: input.endAt,
        timezone: input.timezone || 'America/Sao_Paulo',
        rrule: input.rrule?.trim() || null,
        recurrenceUntil: input.recurrenceUntil ?? null,
        category: input.category?.trim() || null,
        priority: input.priority || 'normal',
        link: input.link?.trim() || null,
        channelsJson: this.normalizeChannels(input.channels) as any,
        remindersJson: reminders as any,
        createdBy: userId,
      },
    });
    return this.toEventEntity(created);
  }

  async update(
    companyId: string,
    input: UpdateCalendarEventInput,
  ): Promise<CalendarEventEntity> {
    const existing = await this.prisma.calendarEvent.findUnique({
      where: { id: input.id },
    });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Evento não encontrado.');
    }

    const data: any = {};
    if (input.title !== undefined && input.title !== null) data.title = input.title.trim();
    if (input.description !== undefined) data.description = input.description?.trim() || null;
    if (input.location !== undefined) data.location = input.location?.trim() || null;
    if (input.color !== undefined && input.color) data.color = input.color;
    if (input.allDay !== undefined && input.allDay !== null) data.allDay = input.allDay;
    if (input.startAt) data.startAt = input.startAt;
    if (input.endAt) data.endAt = input.endAt;
    if (input.timezone) data.timezone = input.timezone;
    if (input.rrule !== undefined) data.rrule = input.rrule?.trim() || null;
    if (input.recurrenceUntil !== undefined) data.recurrenceUntil = input.recurrenceUntil;
    if (input.category !== undefined) data.category = input.category?.trim() || null;
    if (input.priority) data.priority = input.priority;
    if (input.link !== undefined) data.link = input.link?.trim() || null;
    if (input.channels !== undefined) {
      data.channelsJson = this.normalizeChannels(input.channels);
    }
    if (input.reminders !== undefined) {
      data.remindersJson = this.normalizeReminders(
        input.reminders,
        input.channels ?? this.fromJson<string[]>(existing.channelsJson),
      );
    }

    const updated = await this.prisma.calendarEvent.update({
      where: { id: input.id },
      data,
    });

    // Mudou data ou rrule → re-armar reminders (limpa fires futuros para gerar de novo)
    if (input.startAt || input.endAt || input.rrule !== undefined || input.reminders !== undefined) {
      await this.prisma.calendarReminderFire.deleteMany({
        where: { eventId: input.id, firedAt: { gt: new Date() } },
      });
    }

    return this.toEventEntity(updated);
  }

  async remove(companyId: string, id: string): Promise<boolean> {
    const existing = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Evento não encontrado.');
    }
    await this.prisma.calendarEvent.delete({ where: { id } });
    return true;
  }

  async findOne(companyId: string, id: string): Promise<CalendarEventEntity> {
    const e = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!e || e.companyId !== companyId) {
      throw new NotFoundException('Evento não encontrado.');
    }
    return this.toEventEntity(e);
  }

  async cancelOccurrence(
    companyId: string,
    eventId: string,
    occurrence: Date,
  ): Promise<boolean> {
    const e = await this.prisma.calendarEvent.findUnique({ where: { id: eventId } });
    if (!e || e.companyId !== companyId) {
      throw new NotFoundException('Evento não encontrado.');
    }
    await this.prisma.calendarEventException.upsert({
      where: { eventId_occurrence: { eventId, occurrence } },
      create: { eventId, occurrence, cancelled: true },
      update: { cancelled: true },
    });
    return true;
  }

  // =============================================================
  // Agregador unificado
  // =============================================================

  async items(
    companyId: string,
    range: { start: Date; end: Date; sources?: string[] | null },
  ): Promise<CalendarItemEntity[]> {
    const sources = (range.sources && range.sources.length > 0
      ? range.sources
      : Array.from(VALID_SOURCES)
    ).filter((s) => VALID_SOURCES.has(s));

    const wants = (s: string) => sources.includes(s);

    const promises: Array<Promise<CalendarItemEntity[]>> = [];
    if (wants('EVENT')) promises.push(this.itemsFromEvents(companyId, range));
    if (wants('REMINDER')) promises.push(this.itemsFromReminders(companyId, range));
    if (wants('PAYABLE')) promises.push(this.itemsFromPayables(companyId, range));
    if (wants('RECEIVABLE'))
      promises.push(this.itemsFromReceivables(companyId, range));
    if (wants('DELIVERY')) promises.push(this.itemsFromDeliveries(companyId, range));
    if (wants('CONTRACT')) promises.push(this.itemsFromContracts(companyId, range));
    if (wants('ORDER')) promises.push(this.itemsFromOrders(companyId, range));

    const results = await Promise.all(promises);
    const flat = results.flat();
    flat.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    return flat;
  }

  private async itemsFromEvents(
    companyId: string,
    range: { start: Date; end: Date },
  ): Promise<CalendarItemEntity[]> {
    // Busca eventos cujo intervalo intersecta o range OU que têm rrule (podem ter
    // ocorrências dentro mesmo se a primeira foi fora).
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        companyId,
        OR: [
          { startAt: { lte: range.end }, endAt: { gte: range.start } },
          { rrule: { not: null } },
        ],
      },
      include: { exceptions: true },
    });

    const items: CalendarItemEntity[] = [];
    for (const e of events) {
      const exceptions = new Set<string>(
        e.exceptions.filter((x) => x.cancelled).map((x) => x.occurrence.toISOString()),
      );
      const occurrences = expandRecurrence({
        start: e.startAt,
        end: e.endAt,
        rrule: e.rrule,
        recurrenceUntil: e.recurrenceUntil,
        rangeStart: range.start,
        rangeEnd: range.end,
        exceptions,
      });
      for (const occ of occurrences) {
        items.push({
          id: `EVENT:${e.id}:${occ.start.toISOString()}`,
          source: 'EVENT',
          sourceId: e.id,
          occurrenceId: e.rrule ? `${e.id}:${occ.start.toISOString()}` : null,
          title: e.title,
          description: e.description,
          color: e.color,
          allDay: e.allDay,
          startAt: occ.start,
          endAt: occ.end,
          status: null,
          priority: e.priority,
          category: e.category,
          link: e.link,
          location: e.location,
          amount: null,
          editable: true,
        });
      }
    }
    return items;
  }

  private async itemsFromReminders(
    companyId: string,
    range: { start: Date; end: Date },
  ): Promise<CalendarItemEntity[]> {
    const rs = await this.prisma.companyReminder.findMany({
      where: {
        companyId,
        dueAt: { gte: range.start, lte: range.end },
      },
    });
    return rs.map((r) => ({
      id: `REMINDER:${r.id}`,
      source: 'REMINDER',
      sourceId: r.id,
      occurrenceId: null,
      title: r.title,
      description: r.description,
      color: r.priority === 'critical' ? '#dc2626' : SOURCE_COLORS.REMINDER,
      allDay: false,
      startAt: r.dueAt,
      endAt: new Date(r.dueAt.getTime() + 30 * 60 * 1000),
      status: r.doneAt ? 'DONE' : r.dueAt < new Date() ? 'OVERDUE' : 'PENDING',
      priority: r.priority,
      category: r.category,
      link: r.link,
      location: null,
      amount: null,
      editable: true,
    }));
  }

  private async itemsFromPayables(
    companyId: string,
    range: { start: Date; end: Date },
  ): Promise<CalendarItemEntity[]> {
    const list = await this.prisma.accountPayable.findMany({
      where: { companyId, dueDate: { gte: range.start, lte: range.end } },
    });
    return list.map((p) => ({
      id: `PAYABLE:${p.id}`,
      source: 'PAYABLE',
      sourceId: p.id,
      occurrenceId: null,
      title: `💸 ${p.description}`,
      description: p.supplierName ? `Fornecedor: ${p.supplierName}` : null,
      color:
        p.status === 'PAID' || p.paidAt
          ? '#10b981'
          : p.dueDate < new Date()
            ? '#dc2626'
            : SOURCE_COLORS.PAYABLE,
      allDay: true,
      startAt: p.dueDate,
      endAt: p.dueDate,
      status: p.status,
      priority: null,
      category: 'financeiro',
      link: `/listar-contas-pagas?id=${p.id}`,
      location: null,
      amount: p.amount.toString(),
      editable: false,
    }));
  }

  private async itemsFromReceivables(
    companyId: string,
    range: { start: Date; end: Date },
  ): Promise<CalendarItemEntity[]> {
    const list = await this.prisma.accountReceivable.findMany({
      where: { companyId, dueDate: { gte: range.start, lte: range.end } },
      include: { customer: { select: { name: true } } },
    });
    return list.map((r) => ({
      id: `RECEIVABLE:${r.id}`,
      source: 'RECEIVABLE',
      sourceId: r.id,
      occurrenceId: null,
      title: `💰 ${r.description}`,
      description: r.customer?.name ? `Cliente: ${r.customer.name}` : null,
      color:
        r.status === 'PAID' || r.paidAt
          ? '#059669'
          : r.dueDate < new Date()
            ? '#dc2626'
            : SOURCE_COLORS.RECEIVABLE,
      allDay: true,
      startAt: r.dueDate,
      endAt: r.dueDate,
      status: r.status,
      priority: null,
      category: 'financeiro',
      link: `/listar-contas-receber?id=${r.id}`,
      location: null,
      amount: r.amount.toString(),
      editable: false,
    }));
  }

  private async itemsFromDeliveries(
    companyId: string,
    range: { start: Date; end: Date },
  ): Promise<CalendarItemEntity[]> {
    const list = await this.prisma.delivery.findMany({
      where: {
        companyId,
        scheduledDate: { not: null, gte: range.start, lte: range.end },
      },
    });
    return list.map((d) => ({
      id: `DELIVERY:${d.id}`,
      source: 'DELIVERY',
      sourceId: d.id,
      occurrenceId: null,
      title: `🚚 ${d.destination || 'Entrega'}`,
      description: d.driver ? `Motorista: ${d.driver}` : null,
      color:
        d.status === 'DELIVERED'
          ? '#10b981'
          : d.status === 'CANCELED'
            ? '#94a3b8'
            : SOURCE_COLORS.DELIVERY,
      allDay: false,
      startAt: d.scheduledDate!,
      endAt: new Date(d.scheduledDate!.getTime() + 60 * 60 * 1000),
      status: d.status,
      priority: null,
      category: 'logistica',
      link: `/entregas`,
      location: d.destination,
      amount: null,
      editable: false,
    }));
  }

  private async itemsFromContracts(
    companyId: string,
    range: { start: Date; end: Date },
  ): Promise<CalendarItemEntity[]> {
    const list = await this.prisma.contract.findMany({
      where: {
        companyId,
        endDate: { not: null, gte: range.start, lte: range.end },
      },
    });
    return list.map((c) => ({
      id: `CONTRACT:${c.id}`,
      source: 'CONTRACT',
      sourceId: c.id,
      occurrenceId: null,
      title: `📑 ${c.title} (vencimento)`,
      description: `Contrato nº ${c.number}`,
      color: SOURCE_COLORS.CONTRACT,
      allDay: true,
      startAt: c.endDate!,
      endAt: c.endDate!,
      status: c.status,
      priority: null,
      category: 'comercial',
      link: `/contratos/${c.id}`,
      location: null,
      amount: c.value.toString(),
      editable: false,
    }));
  }

  private async itemsFromOrders(
    companyId: string,
    range: { start: Date; end: Date },
  ): Promise<CalendarItemEntity[]> {
    const list = await this.prisma.order.findMany({
      where: {
        companyId,
        OR: [
          { expectedDeliveryDate: { gte: range.start, lte: range.end } },
          { dueDate: { gte: range.start, lte: range.end } },
        ],
      },
    });
    const out: CalendarItemEntity[] = [];
    for (const o of list) {
      const when = o.expectedDeliveryDate ?? o.dueDate;
      if (!when) continue;
      out.push({
        id: `ORDER:${o.id}`,
        source: 'ORDER',
        sourceId: o.id,
        occurrenceId: null,
        title: `🛒 Pedido #${o.number}`,
        description: o.customerName ? `Cliente: ${o.customerName}` : null,
        color:
          o.status === 'PAID'
            ? '#10b981'
            : o.status === 'CANCELED'
              ? '#94a3b8'
              : SOURCE_COLORS.ORDER,
        allDay: true,
        startAt: when,
        endAt: when,
        status: o.status,
        priority: null,
        category: 'comercial',
        link: `/pedidos`,
        location: null,
        amount: o.total.toString(),
        editable: false,
      });
    }
    return out;
  }

  // =============================================================
  // Helpers
  // =============================================================

  private normalizeChannels(input?: string[] | null): string[] {
    if (!input || input.length === 0) return DEFAULT_CHANNELS;
    const out = input
      .map((c) => c.toUpperCase().trim())
      .filter((c) => VALID_CHANNELS.has(c));
    return out.length > 0 ? Array.from(new Set(out)) : DEFAULT_CHANNELS;
  }

  private normalizeReminders(
    input?: { offsetMin: number; channels: string[] }[] | null,
    fallbackChannels?: string[] | null,
  ): CalendarReminderEntity[] {
    if (!input || input.length === 0) return [];
    const fallback = this.normalizeChannels(fallbackChannels);
    const seen = new Set<string>();
    const out: CalendarReminderEntity[] = [];
    for (const r of input) {
      const offset = Math.max(0, Math.floor(r.offsetMin));
      const channels = this.normalizeChannels(r.channels?.length ? r.channels : fallback);
      const key = `${offset}:${channels.join(',')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ offsetMin: offset, channels });
    }
    return out;
  }

  private fromJson<T>(v: unknown): T | null {
    if (v === null || v === undefined) return null;
    return v as T;
  }

  private toEventEntity(e: NonNullable<RawEvent>): CalendarEventEntity {
    const channels = this.fromJson<string[]>(e.channelsJson) ?? DEFAULT_CHANNELS;
    const reminders =
      this.fromJson<CalendarReminderEntity[]>(e.remindersJson) ?? [];
    return {
      id: e.id,
      companyId: e.companyId,
      userId: e.userId,
      title: e.title,
      description: e.description,
      location: e.location,
      color: e.color,
      allDay: e.allDay,
      startAt: e.startAt,
      endAt: e.endAt,
      timezone: e.timezone,
      rrule: e.rrule,
      recurrenceUntil: e.recurrenceUntil,
      category: e.category,
      priority: e.priority,
      link: e.link,
      reminders,
      channels,
      createdBy: e.createdBy,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  }
}
