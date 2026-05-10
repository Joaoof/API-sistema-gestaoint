import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

export interface DailyReport {
  date: string; // YYYY-MM-DD
  totals: {
    salesCount: number;
    salesAmount: number;
    receivedAmount: number;
    paidAmount: number;
    netAmount: number;
  };
  paymentMethods: Record<string, { count: number; amount: number }>;
  pendingReceivables: number;
  pendingPayables: number;
  text: string;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totals: {
    salesCount: number;
    salesAmount: number;
    receivedAmount: number;
    paidAmount: number;
    netAmount: number;
  };
  topCustomers: Array<{ name: string; total: number }>;
  topProducts: Array<{ name: string; quantity: number; total: number }>;
  text: string;
}

export interface AlertsReport {
  generatedAt: string;
  hasAlerts: boolean;
  overdueReceivables: Array<{
    id: string;
    customer: string;
    amount: number;
    daysOverdue: number;
  }>;
  upcomingPayables: Array<{
    id: string;
    supplier: string;
    amount: number;
    daysToDue: number;
  }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    quantity: number;
    minStock: number;
  }>;
  text: string;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function brl(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Espécie',
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão crédito',
  DEBIT_CARD: 'Cartão débito',
  BANK_TRANSFER: 'Transferência',
  BANK_SLIP: 'Boleto',
  CHECK: 'Cheque',
  OTHER: 'Outro',
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async daily(reference?: Date): Promise<DailyReport> {
    const ref = reference ?? new Date();
    const from = startOfDay(ref);
    const to = endOfDay(ref);

    const [movements, pendingAR, pendingAP] = await Promise.all([
      this.prisma.cashMovement.findMany({
        where: { date: { gte: from, lte: to }, status: 'COMPLETED' },
      }),
      this.prisma.accountReceivable.aggregate({
        where: { status: { in: ['PENDING', 'OVERDUE'] } },
        _sum: { amount: true },
      }),
      this.prisma.accountPayable.aggregate({
        where: { status: { in: ['PENDING', 'OVERDUE'] } },
        _sum: { amount: true },
      }),
    ]);

    const paymentMethods: Record<string, { count: number; amount: number }> = {};
    let salesCount = 0;
    let salesAmount = 0;
    let receivedAmount = 0;
    let paidAmount = 0;

    for (const m of movements) {
      const value = Number(m.value);
      if (m.type === 'ENTRY') receivedAmount += value;
      else paidAmount += value;
      if (m.category === 'SALE') {
        salesCount += 1;
        salesAmount += value;
      }
      const key = m.typePayment ?? 'OTHER';
      if (!paymentMethods[key]) paymentMethods[key] = { count: 0, amount: 0 };
      paymentMethods[key].count += 1;
      paymentMethods[key].amount += value;
    }

    const netAmount = receivedAmount - paidAmount;
    const dateStr = from.toISOString().slice(0, 10);

    const lines = [
      `*Resumo do dia* — ${from.toLocaleDateString('pt-BR')}`,
      ``,
      `Vendas: *${salesCount}* (${brl(salesAmount)})`,
      `Recebido: *${brl(receivedAmount)}*`,
      `Pago: *${brl(paidAmount)}*`,
      `Saldo do dia: *${brl(netAmount)}*`,
      ``,
    ];

    if (Object.keys(paymentMethods).length) {
      lines.push(`*Por forma de pagamento:*`);
      for (const [k, v] of Object.entries(paymentMethods)) {
        lines.push(`• ${PAYMENT_LABELS[k] ?? k}: ${v.count}x — ${brl(v.amount)}`);
      }
      lines.push(``);
    }

    const arPending = Number(pendingAR._sum.amount ?? 0);
    const apPending = Number(pendingAP._sum.amount ?? 0);
    lines.push(`A receber em aberto: ${brl(arPending)}`);
    lines.push(`A pagar em aberto: ${brl(apPending)}`);

    return {
      date: dateStr,
      totals: { salesCount, salesAmount, receivedAmount, paidAmount, netAmount },
      paymentMethods,
      pendingReceivables: arPending,
      pendingPayables: apPending,
      text: lines.join('\n'),
    };
  }

  async weekly(reference?: Date): Promise<WeeklyReport> {
    const ref = reference ?? new Date();
    const day = ref.getDay(); // 0 = domingo
    const monday = new Date(ref);
    const diffToMonday = day === 0 ? -6 : 1 - day;
    monday.setDate(ref.getDate() + diffToMonday - 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const from = startOfDay(monday);
    const to = endOfDay(sunday);

    const [movements, ordersWithCustomer] = await Promise.all([
      this.prisma.cashMovement.findMany({
        where: { date: { gte: from, lte: to }, status: 'COMPLETED' },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: {
          customer: { select: { name: true } },
          items: {
            include: { product: { select: { nameProduct: true } } },
          },
        },
      }),
    ]);

    let salesCount = 0;
    let salesAmount = 0;
    let receivedAmount = 0;
    let paidAmount = 0;

    for (const m of movements) {
      const value = Number(m.value);
      if (m.type === 'ENTRY') receivedAmount += value;
      else paidAmount += value;
      if (m.category === 'SALE') {
        salesCount += 1;
        salesAmount += value;
      }
    }

    const customerTotals = new Map<string, number>();
    const productTotals = new Map<string, { quantity: number; total: number }>();

    for (const o of ordersWithCustomer) {
      const cName = o.customer?.name ?? o.customerName ?? 'Sem cliente';
      const orderTotal = Number(o.total ?? 0);
      customerTotals.set(cName, (customerTotals.get(cName) ?? 0) + orderTotal);

      for (const item of o.items) {
        const pName = item.product?.nameProduct ?? 'Produto';
        const cur = productTotals.get(pName) ?? { quantity: 0, total: 0 };
        cur.quantity += Number(item.quantity ?? 0);
        cur.total += Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0);
        productTotals.set(pName, cur);
      }
    }

    const topCustomers = Array.from(customerTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }));

    const topProducts = Array.from(productTotals.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, v]) => ({ name, quantity: v.quantity, total: v.total }));

    const netAmount = receivedAmount - paidAmount;

    const lines = [
      `*Resumo da semana* — ${from.toLocaleDateString('pt-BR')} a ${sunday.toLocaleDateString('pt-BR')}`,
      ``,
      `Vendas: *${salesCount}* (${brl(salesAmount)})`,
      `Recebido: *${brl(receivedAmount)}*`,
      `Pago: *${brl(paidAmount)}*`,
      `Saldo: *${brl(netAmount)}*`,
      ``,
    ];

    if (topCustomers.length) {
      lines.push(`*Top clientes:*`);
      topCustomers.forEach((c, i) =>
        lines.push(`${i + 1}. ${c.name} — ${brl(c.total)}`),
      );
      lines.push(``);
    }

    if (topProducts.length) {
      lines.push(`*Top produtos:*`);
      topProducts.forEach((p, i) =>
        lines.push(
          `${i + 1}. ${p.name} — ${p.quantity}un (${brl(p.total)})`,
        ),
      );
    }

    return {
      weekStart: from.toISOString().slice(0, 10),
      weekEnd: sunday.toISOString().slice(0, 10),
      totals: { salesCount, salesAmount, receivedAmount, paidAmount, netAmount },
      topCustomers,
      topProducts,
      text: lines.join('\n'),
    };
  }

  async alerts(): Promise<AlertsReport> {
    const today = startOfDay(new Date());
    const in3days = new Date(today);
    in3days.setDate(today.getDate() + 3);

    const [overdueAR, upcomingAP, lowStock] = await Promise.all([
      this.prisma.accountReceivable.findMany({
        where: {
          status: { in: ['PENDING', 'OVERDUE'] },
          dueDate: { lt: today },
        },
        include: { customer: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      this.prisma.accountPayable.findMany({
        where: {
          status: 'PENDING',
          dueDate: { gte: today, lte: in3days },
        },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      this.prisma.inventory.findMany({
        where: { quantity: { lte: 5 } },
        include: { product: { select: { nameProduct: true } } },
        orderBy: { quantity: 'asc' },
        take: 20,
      }),
    ]);

    const overdueReceivables = overdueAR.map((r) => {
      const days = Math.floor(
        (today.getTime() - new Date(r.dueDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return {
        id: r.id,
        customer: r.customer?.name ?? 'Sem cliente',
        amount: Number(r.amount),
        daysOverdue: days,
      };
    });

    const upcomingPayables = upcomingAP.map((p) => {
      const days = Math.floor(
        (new Date(p.dueDate).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return {
        id: p.id,
        supplier: p.supplierName,
        amount: Number(p.amount),
        daysToDue: days,
      };
    });

    const lowStockProducts = lowStock
      .filter((i) => i.quantity <= i.minStock)
      .map((i) => ({
        id: i.id,
        name: i.product?.nameProduct ?? 'Produto',
        quantity: i.quantity,
        minStock: i.minStock,
      }));

    const hasAlerts =
      overdueReceivables.length > 0 ||
      upcomingPayables.length > 0 ||
      lowStockProducts.length > 0;

    const lines: string[] = [];
    if (hasAlerts) {
      lines.push(`⚠️ *Alertas* — ${new Date().toLocaleString('pt-BR')}`);
      lines.push(``);
      if (overdueReceivables.length) {
        lines.push(`*Recebíveis vencidos (${overdueReceivables.length}):*`);
        overdueReceivables
          .slice(0, 5)
          .forEach((r) =>
            lines.push(
              `• ${r.customer} — ${brl(r.amount)} (${r.daysOverdue}d)`,
            ),
          );
        if (overdueReceivables.length > 5)
          lines.push(`...e mais ${overdueReceivables.length - 5}`);
        lines.push(``);
      }
      if (upcomingPayables.length) {
        lines.push(`*Contas vencendo nos próximos 3 dias:*`);
        upcomingPayables
          .slice(0, 5)
          .forEach((p) =>
            lines.push(
              `• ${p.supplier} — ${brl(p.amount)} (em ${p.daysToDue}d)`,
            ),
          );
        if (upcomingPayables.length > 5)
          lines.push(`...e mais ${upcomingPayables.length - 5}`);
        lines.push(``);
      }
      if (lowStockProducts.length) {
        lines.push(`*Estoque baixo (${lowStockProducts.length}):*`);
        lowStockProducts
          .slice(0, 5)
          .forEach((p) =>
            lines.push(`• ${p.name} — ${p.quantity}un (mín ${p.minStock})`),
          );
        if (lowStockProducts.length > 5)
          lines.push(`...e mais ${lowStockProducts.length - 5}`);
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      hasAlerts,
      overdueReceivables,
      upcomingPayables,
      lowStockProducts,
      text: lines.join('\n'),
    };
  }
}
