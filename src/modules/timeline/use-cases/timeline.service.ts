import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  TimelineCategory,
  TimelineEvent,
  TimelineEventType,
} from '../entities/timeline-event.entity';

interface TimelineFilter {
  fromDate?: Date;
  toDate?: Date;
  types?: TimelineEventType[];
  categories?: TimelineCategory[];
  limit?: number;
}

const FINANCIAL = [
  TimelineEventType.ORDER_PAID,
  TimelineEventType.RECEIVABLE_CREATED,
  TimelineEventType.RECEIVABLE_PAID,
  TimelineEventType.RECEIVABLE_OVERDUE,
  TimelineEventType.PAYABLE_CREATED,
  TimelineEventType.PAYABLE_PAID,
  TimelineEventType.CASH_ENTRY,
  TimelineEventType.CASH_EXIT,
];
const COMMERCIAL = [
  TimelineEventType.ORDER_CREATED,
  TimelineEventType.ORDER_CANCELED,
  TimelineEventType.CUSTOMER_CREATED,
];
const OPERATIONAL = [
  TimelineEventType.DELIVERY_CREATED,
  TimelineEventType.DELIVERY_DELIVERED,
  TimelineEventType.STOCK_LOW,
];
const COMMUNICATIONS = [
  TimelineEventType.WHATSAPP_MESSAGE_IN,
  TimelineEventType.WHATSAPP_CALL,
  TimelineEventType.WHATSAPP_CHATBOT_FIRED,
  TimelineEventType.WHATSAPP_REMINDER_DUE,
];
const ALERTS = [
  TimelineEventType.RECEIVABLE_OVERDUE,
  TimelineEventType.STOCK_LOW,
  TimelineEventType.WHATSAPP_REMINDER_DUE,
  TimelineEventType.ORDER_CANCELED,
];

const CATEGORY_BY_TYPE: Record<TimelineEventType, TimelineCategory[]> = {
  [TimelineEventType.ORDER_CREATED]: [TimelineCategory.COMMERCIAL, TimelineCategory.ACTIVITY],
  [TimelineEventType.ORDER_PAID]: [TimelineCategory.FINANCIAL, TimelineCategory.COMMERCIAL],
  [TimelineEventType.ORDER_CANCELED]: [TimelineCategory.COMMERCIAL, TimelineCategory.ALERTS],
  [TimelineEventType.RECEIVABLE_CREATED]: [TimelineCategory.FINANCIAL],
  [TimelineEventType.RECEIVABLE_PAID]: [TimelineCategory.FINANCIAL],
  [TimelineEventType.RECEIVABLE_OVERDUE]: [TimelineCategory.FINANCIAL, TimelineCategory.ALERTS],
  [TimelineEventType.PAYABLE_CREATED]: [TimelineCategory.FINANCIAL],
  [TimelineEventType.PAYABLE_PAID]: [TimelineCategory.FINANCIAL],
  [TimelineEventType.CASH_ENTRY]: [TimelineCategory.FINANCIAL],
  [TimelineEventType.CASH_EXIT]: [TimelineCategory.FINANCIAL],
  [TimelineEventType.CUSTOMER_CREATED]: [TimelineCategory.COMMERCIAL],
  [TimelineEventType.DELIVERY_CREATED]: [TimelineCategory.OPERATIONAL],
  [TimelineEventType.DELIVERY_DELIVERED]: [TimelineCategory.OPERATIONAL],
  [TimelineEventType.STOCK_LOW]: [TimelineCategory.OPERATIONAL, TimelineCategory.ALERTS],
  [TimelineEventType.WHATSAPP_MESSAGE_IN]: [TimelineCategory.COMMUNICATIONS],
  [TimelineEventType.WHATSAPP_CALL]: [TimelineCategory.COMMUNICATIONS],
  [TimelineEventType.WHATSAPP_REMINDER_DUE]: [TimelineCategory.COMMUNICATIONS, TimelineCategory.ALERTS],
  [TimelineEventType.WHATSAPP_CHATBOT_FIRED]: [TimelineCategory.COMMUNICATIONS],
};

const ICON_BY_TYPE: Record<TimelineEventType, { icon: string; color: string }> = {
  [TimelineEventType.ORDER_CREATED]: { icon: 'sale', color: 'blue' },
  [TimelineEventType.ORDER_PAID]: { icon: 'sale', color: 'emerald' },
  [TimelineEventType.ORDER_CANCELED]: { icon: 'sale', color: 'rose' },
  [TimelineEventType.RECEIVABLE_CREATED]: { icon: 'receivable', color: 'amber' },
  [TimelineEventType.RECEIVABLE_PAID]: { icon: 'receivable', color: 'emerald' },
  [TimelineEventType.RECEIVABLE_OVERDUE]: { icon: 'receivable', color: 'rose' },
  [TimelineEventType.PAYABLE_CREATED]: { icon: 'payable', color: 'amber' },
  [TimelineEventType.PAYABLE_PAID]: { icon: 'payable', color: 'slate' },
  [TimelineEventType.CASH_ENTRY]: { icon: 'cash', color: 'emerald' },
  [TimelineEventType.CASH_EXIT]: { icon: 'cash', color: 'rose' },
  [TimelineEventType.CUSTOMER_CREATED]: { icon: 'customer', color: 'violet' },
  [TimelineEventType.DELIVERY_CREATED]: { icon: 'delivery', color: 'blue' },
  [TimelineEventType.DELIVERY_DELIVERED]: { icon: 'delivery', color: 'emerald' },
  [TimelineEventType.STOCK_LOW]: { icon: 'stock', color: 'amber' },
  [TimelineEventType.WHATSAPP_MESSAGE_IN]: { icon: 'message', color: 'emerald' },
  [TimelineEventType.WHATSAPP_CALL]: { icon: 'call', color: 'violet' },
  [TimelineEventType.WHATSAPP_REMINDER_DUE]: { icon: 'reminder', color: 'amber' },
  [TimelineEventType.WHATSAPP_CHATBOT_FIRED]: { icon: 'chatbot', color: 'violet' },
};

function decorate(
  partial: Omit<TimelineEvent, 'categories' | 'iconKey' | 'colorKey'>,
): TimelineEvent {
  const meta = ICON_BY_TYPE[partial.type];
  return {
    ...partial,
    categories: CATEGORY_BY_TYPE[partial.type] ?? [TimelineCategory.ACTIVITY],
    iconKey: meta.icon,
    colorKey: meta.color,
  };
}

@Injectable()
export class TimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async fetch(
    companyId: string,
    filter: TimelineFilter = {},
  ): Promise<TimelineEvent[]> {
    const fromDate = filter.fromDate ?? new Date(Date.now() - 7 * 86400_000);
    const toDate = filter.toDate ?? new Date();
    const limit = Math.min(filter.limit ?? 200, 500);

    // Filtra por categorias se fornecidas, expandindo pra types
    let typeFilter = filter.types;
    if (!typeFilter && filter.categories?.length) {
      const set = new Set<TimelineEventType>();
      for (const c of filter.categories) {
        const arr =
          c === TimelineCategory.FINANCIAL
            ? FINANCIAL
            : c === TimelineCategory.COMMERCIAL
              ? COMMERCIAL
              : c === TimelineCategory.OPERATIONAL
                ? OPERATIONAL
                : c === TimelineCategory.COMMUNICATIONS
                  ? COMMUNICATIONS
                  : c === TimelineCategory.ALERTS
                    ? ALERTS
                    : Object.values(TimelineEventType);
        arr.forEach((t) => set.add(t));
      }
      typeFilter = Array.from(set);
    }
    const includes = (t: TimelineEventType) =>
      !typeFilter || typeFilter.includes(t);

    const events: TimelineEvent[] = [];

    // Orders — companyId não está em Order, usa criadoPor.companyId via createdBy.
    // Como Order não tem companyId direto, passamos pelo customer ou via createdBy.
    // Na ausência de filtro multi-tenant rígido, usamos fromDate/toDate.
    if (
      includes(TimelineEventType.ORDER_CREATED) ||
      includes(TimelineEventType.ORDER_PAID) ||
      includes(TimelineEventType.ORDER_CANCELED)
    ) {
      const orders = await this.prisma.order.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          createdBy: { select: { name: true, company_id: true } },
        },
      });
      for (const o of orders) {
        if (o.createdBy && o.createdBy.company_id !== companyId) continue;
        const total = Number(o.total);
        if (o.status === 'PAID' && includes(TimelineEventType.ORDER_PAID)) {
          events.push(
            decorate({
              id: `order-paid-${o.id}`,
              type: TimelineEventType.ORDER_PAID,
              at: o.updatedAt,
              title: `Pedido #${o.number} pago`,
              description: o.customerName ?? null,
              actor: o.createdBy?.name ?? o.sellerName,
              amount: total,
              entityId: o.id,
              entityType: 'Order',
            }),
          );
        } else if (
          (o.status === 'CANCELED' || o.status === 'REFUNDED') &&
          includes(TimelineEventType.ORDER_CANCELED)
        ) {
          events.push(
            decorate({
              id: `order-canceled-${o.id}`,
              type: TimelineEventType.ORDER_CANCELED,
              at: o.updatedAt,
              title: `Pedido #${o.number} cancelado`,
              description: o.customerName ?? null,
              actor: o.createdBy?.name,
              amount: total,
              entityId: o.id,
              entityType: 'Order',
            }),
          );
        } else if (includes(TimelineEventType.ORDER_CREATED)) {
          events.push(
            decorate({
              id: `order-created-${o.id}`,
              type: TimelineEventType.ORDER_CREATED,
              at: o.createdAt,
              title: `Nova venda #${o.number}`,
              description: o.customerName ?? null,
              actor: o.createdBy?.name ?? o.sellerName,
              amount: total,
              entityId: o.id,
              entityType: 'Order',
            }),
          );
        }
      }
    }

    // AccountReceivable
    if (
      includes(TimelineEventType.RECEIVABLE_CREATED) ||
      includes(TimelineEventType.RECEIVABLE_PAID) ||
      includes(TimelineEventType.RECEIVABLE_OVERDUE)
    ) {
      const ARs = await this.prisma.accountReceivable.findMany({
        where: {
          OR: [
            { createdAt: { gte: fromDate, lte: toDate } },
            { paidAt: { gte: fromDate, lte: toDate } },
          ],
        },
        include: { customer: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });
      const now = new Date();
      for (const ar of ARs) {
        const amount = Number(ar.amount);
        if (
          ar.status === 'PAID' &&
          ar.paidAt &&
          includes(TimelineEventType.RECEIVABLE_PAID)
        ) {
          events.push(
            decorate({
              id: `ar-paid-${ar.id}`,
              type: TimelineEventType.RECEIVABLE_PAID,
              at: ar.paidAt,
              title: `Recebido de ${ar.customer?.name ?? 'cliente'}`,
              description: ar.description,
              amount,
              entityId: ar.id,
              entityType: 'AccountReceivable',
            }),
          );
        } else if (
          (ar.status === 'PENDING' || ar.status === 'OVERDUE') &&
          ar.dueDate < now &&
          includes(TimelineEventType.RECEIVABLE_OVERDUE)
        ) {
          const days = Math.floor(
            (now.getTime() - ar.dueDate.getTime()) / 86400_000,
          );
          if (days > 0) {
            events.push(
              decorate({
                id: `ar-overdue-${ar.id}`,
                type: TimelineEventType.RECEIVABLE_OVERDUE,
                at: ar.dueDate,
                title: `⚠️ ${ar.customer?.name ?? 'Cliente'} em atraso`,
                description: `${ar.description} • ${days}d`,
                amount,
                entityId: ar.id,
                entityType: 'AccountReceivable',
              }),
            );
          }
        }
        if (
          ar.createdAt >= fromDate &&
          ar.createdAt <= toDate &&
          includes(TimelineEventType.RECEIVABLE_CREATED)
        ) {
          events.push(
            decorate({
              id: `ar-created-${ar.id}`,
              type: TimelineEventType.RECEIVABLE_CREATED,
              at: ar.createdAt,
              title: `Conta a receber criada`,
              description: `${ar.customer?.name ?? 'Cliente'} • ${ar.description}`,
              amount,
              entityId: ar.id,
              entityType: 'AccountReceivable',
            }),
          );
        }
      }
    }

    // AccountPayable
    if (
      includes(TimelineEventType.PAYABLE_CREATED) ||
      includes(TimelineEventType.PAYABLE_PAID)
    ) {
      const APs = await this.prisma.accountPayable.findMany({
        where: {
          OR: [
            { createdAt: { gte: fromDate, lte: toDate } },
            { paidAt: { gte: fromDate, lte: toDate } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });
      for (const ap of APs) {
        const amount = Number(ap.amount);
        if (
          ap.status === 'PAID' &&
          ap.paidAt &&
          includes(TimelineEventType.PAYABLE_PAID)
        ) {
          events.push(
            decorate({
              id: `ap-paid-${ap.id}`,
              type: TimelineEventType.PAYABLE_PAID,
              at: ap.paidAt,
              title: `Pago a ${ap.supplierName}`,
              description: ap.description,
              amount,
              entityId: ap.id,
              entityType: 'AccountPayable',
            }),
          );
        } else if (
          ap.createdAt >= fromDate &&
          ap.createdAt <= toDate &&
          includes(TimelineEventType.PAYABLE_CREATED)
        ) {
          events.push(
            decorate({
              id: `ap-created-${ap.id}`,
              type: TimelineEventType.PAYABLE_CREATED,
              at: ap.createdAt,
              title: `Conta a pagar criada`,
              description: `${ap.supplierName} • ${ap.description}`,
              amount,
              entityId: ap.id,
              entityType: 'AccountPayable',
            }),
          );
        }
      }
    }

    // CashMovement
    if (
      includes(TimelineEventType.CASH_ENTRY) ||
      includes(TimelineEventType.CASH_EXIT)
    ) {
      const movs = await this.prisma.cashMovement.findMany({
        where: {
          date: { gte: fromDate, lte: toDate },
          user: { company_id: companyId },
        },
        orderBy: { date: 'desc' },
        include: { user: { select: { name: true } } },
        take: limit,
      });
      for (const m of movs) {
        if (m.type === 'ENTRY' && includes(TimelineEventType.CASH_ENTRY)) {
          events.push(
            decorate({
              id: `cash-${m.id}`,
              type: TimelineEventType.CASH_ENTRY,
              at: m.date,
              title: '🟢 Entrada no caixa',
              description: m.description,
              actor: m.user?.name,
              amount: Number(m.value),
              entityId: m.id,
              entityType: 'CashMovement',
            }),
          );
        } else if (m.type === 'EXIT' && includes(TimelineEventType.CASH_EXIT)) {
          events.push(
            decorate({
              id: `cash-${m.id}`,
              type: TimelineEventType.CASH_EXIT,
              at: m.date,
              title: '🔴 Saída do caixa',
              description: m.description,
              actor: m.user?.name,
              amount: Number(m.value),
              entityId: m.id,
              entityType: 'CashMovement',
            }),
          );
        }
      }
    }

    // Customer (sem companyId direto — heurística: dedupe pelo período)
    if (includes(TimelineEventType.CUSTOMER_CREATED)) {
      const customers = await this.prisma.customer.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      for (const c of customers) {
        events.push(
          decorate({
            id: `customer-${c.id}`,
            type: TimelineEventType.CUSTOMER_CREATED,
            at: c.createdAt,
            title: `Novo cliente cadastrado`,
            description: c.name,
            entityId: c.id,
            entityType: 'Customer',
          }),
        );
      }
    }

    // Delivery — passa por order.createdBy.company_id
    if (
      includes(TimelineEventType.DELIVERY_CREATED) ||
      includes(TimelineEventType.DELIVERY_DELIVERED)
    ) {
      const deliveries = await this.prisma.delivery.findMany({
        where: {
          OR: [
            { createdAt: { gte: fromDate, lte: toDate } },
            { deliveredAt: { gte: fromDate, lte: toDate } },
          ],
          order: { createdBy: { company_id: companyId } },
        },
        include: {
          order: { select: { number: true, customerName: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });
      for (const d of deliveries) {
        if (
          d.status === 'DELIVERED' &&
          d.deliveredAt &&
          includes(TimelineEventType.DELIVERY_DELIVERED)
        ) {
          events.push(
            decorate({
              id: `del-done-${d.id}`,
              type: TimelineEventType.DELIVERY_DELIVERED,
              at: d.deliveredAt,
              title: `Entrega concluída #${d.order?.number ?? ''}`.trim(),
              description: d.order?.customerName ?? null,
              actor: d.driver,
              entityId: d.id,
              entityType: 'Delivery',
            }),
          );
        } else if (
          d.createdAt >= fromDate &&
          d.createdAt <= toDate &&
          includes(TimelineEventType.DELIVERY_CREATED)
        ) {
          events.push(
            decorate({
              id: `del-new-${d.id}`,
              type: TimelineEventType.DELIVERY_CREATED,
              at: d.createdAt,
              title: `Nova entrega agendada`,
              description: d.order?.customerName ?? null,
              actor: d.driver,
              entityId: d.id,
              entityType: 'Delivery',
            }),
          );
        }
      }
    }

    // Estoque baixo — snapshot atual (não tem timestamp histórico)
    if (
      includes(TimelineEventType.STOCK_LOW) &&
      (!filter.fromDate || filter.fromDate.getTime() >= Date.now() - 86400_000)
    ) {
      const lowStock = await this.prisma.product.findMany({
        where: {
          quantity: { lte: 0 },
          deletedAt: null,
        },
        take: 20,
        orderBy: { updatedAt: 'desc' },
      });
      for (const p of lowStock) {
        events.push(
          decorate({
            id: `stock-low-${p.id}`,
            type: TimelineEventType.STOCK_LOW,
            at: p.updatedAt,
            title: `Estoque zerado: ${p.nameProduct}`,
            description: `Quantidade: ${p.quantity}`,
            entityId: p.id,
            entityType: 'Product',
          }),
        );
      }
    }

    // WhatsApp message INBOUND (último contato por peer)
    if (includes(TimelineEventType.WHATSAPP_MESSAGE_IN)) {
      const messages = await this.prisma.messageLog.findMany({
        where: {
          companyId,
          channel: 'WHATSAPP',
          direction: 'INBOUND',
          createdAt: { gte: fromDate, lte: toDate },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      for (const m of messages) {
        const meta = (m.metadataJson ?? {}) as Record<string, unknown>;
        if (meta.kind === 'call' && includes(TimelineEventType.WHATSAPP_CALL)) {
          events.push(
            decorate({
              id: `wa-call-${m.id}`,
              type: TimelineEventType.WHATSAPP_CALL,
              at: m.createdAt,
              title: m.body,
              description: (meta.pushName as string) ?? m.fromAddress ?? null,
              peerNumber: m.fromAddress,
              entityId: m.id,
              entityType: 'MessageLog',
            }),
          );
        } else {
          events.push(
            decorate({
              id: `wa-msg-${m.id}`,
              type: TimelineEventType.WHATSAPP_MESSAGE_IN,
              at: m.createdAt,
              title: `Mensagem de ${(meta.pushName as string) ?? m.fromAddress ?? 'contato'}`,
              description: m.body.slice(0, 120),
              peerNumber: m.fromAddress,
              entityId: m.id,
              entityType: 'MessageLog',
            }),
          );
        }
      }
    }

    // Reminders disparados
    if (includes(TimelineEventType.WHATSAPP_REMINDER_DUE)) {
      const reminders = await this.prisma.whatsappReminder.findMany({
        where: {
          companyId,
          dueAt: { gte: fromDate, lte: toDate },
        },
        orderBy: { dueAt: 'desc' },
        take: limit,
      });
      for (const r of reminders) {
        events.push(
          decorate({
            id: `reminder-${r.id}`,
            type: TimelineEventType.WHATSAPP_REMINDER_DUE,
            at: r.dueAt,
            title: `🔔 Lembrete: ${r.title}`,
            description: r.description ?? null,
            peerNumber: r.peerNumber,
            entityId: r.id,
            entityType: 'WhatsappReminder',
          }),
        );
      }
    }

    // Chatbot fired
    if (includes(TimelineEventType.WHATSAPP_CHATBOT_FIRED)) {
      const fires = await this.prisma.whatsappChatbotLog.findMany({
        where: { companyId, firedAt: { gte: fromDate, lte: toDate } },
        orderBy: { firedAt: 'desc' },
        take: limit,
      });
      for (const f of fires) {
        events.push(
          decorate({
            id: `bot-${f.id}`,
            type: TimelineEventType.WHATSAPP_CHATBOT_FIRED,
            at: f.firedAt,
            title: `🤖 Chatbot respondeu automaticamente`,
            description: f.triggerText?.slice(0, 80) ?? null,
            peerNumber: f.peerNumber,
            entityId: f.id,
            entityType: 'WhatsappChatbotLog',
          }),
        );
      }
    }

    // Ordena cronologicamente
    events.sort((a, b) => b.at.getTime() - a.at.getTime());
    return events.slice(0, limit);
  }
}
