import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

interface DayProjection {
  date: string;
  expectedIn: number;
  expectedOut: number;
  netForDay: number;
  cumulativeBalance: number;
}

export interface CashFlowProjection {
  startBalance: number;
  days: DayProjection[];
  totalIn: number;
  totalOut: number;
  finalBalance: number;
}

interface MonthRow {
  month: string;
  revenue: number;
  cogs: number; // custo dos produtos vendidos
  grossProfit: number;
  expenses: number;
  netIncome: number;
}

export interface DREReport {
  from: string;
  to: string;
  months: MonthRow[];
  totals: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    netIncome: number;
  };
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function ym(d: Date): string {
  return d.toISOString().slice(0, 7);
}

@Injectable()
export class FinancialsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fluxo de caixa PROJETADO para os próximos N dias.
   * Saldo inicial = soma de ENTRY - EXIT de CashMovement COMPLETED até hoje.
   * Projeção: para cada dia futuro, soma:
   *  - Entradas esperadas: AR PENDING/OVERDUE com dueDate no dia
   *  - Saídas esperadas: AP PENDING/OVERDUE com dueDate no dia
   *  - Contas fixas recorrentes (RecurringBill ativas) com dayOfMonth no dia
   */
  async projection(companyId: string, days = 90): Promise<CashFlowProjection> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(today.getDate() + days);

    // 1) Saldo realizado (entradas - saídas COMPLETED até agora)
    const completed = await this.prisma.cashMovement.findMany({
      where: { companyId, status: 'COMPLETED', date: { lte: today } },
      select: { type: true, value: true },
    });
    const startBalance = completed.reduce(
      (s, m) => s + (m.type === 'ENTRY' ? Number(m.value) : -Number(m.value)),
      0,
    );

    // 2) AR pendentes futuros (incluindo vencidos = expectativa hoje)
    const pendingAR = await this.prisma.accountReceivable.findMany({
      where: {
        companyId,
        status: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { lte: horizon },
      },
      select: { dueDate: true, amount: true, paidAmount: true },
    });

    // 3) AP pendentes futuros
    const pendingAP = await this.prisma.accountPayable.findMany({
      where: {
        companyId,
        status: { in: ['PENDING', 'OVERDUE'] },
        dueDate: { lte: horizon },
      },
      select: { dueDate: true, amount: true, paidAmount: true },
    });

    // 4) Contas fixas mensais ativas — projeta uma instância por mês no horizonte
    const recurring = await this.prisma.recurringBill.findMany({
      where: { companyId, active: true },
      select: { dayOfMonth: true, amount: true, lastGeneratedFor: true },
    });

    // Bucketing diário
    const byDay = new Map<string, { in: number; out: number }>();
    const bump = (date: Date, inAmt: number, outAmt: number) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      // Vencidos contam pra HOJE (representa a expectativa imediata)
      const effective = d < today ? today : d;
      const key = ymd(effective);
      const cur = byDay.get(key) ?? { in: 0, out: 0 };
      cur.in += inAmt;
      cur.out += outAmt;
      byDay.set(key, cur);
    };

    for (const ar of pendingAR) {
      bump(ar.dueDate, Number(ar.amount) - Number(ar.paidAmount), 0);
    }
    for (const ap of pendingAP) {
      bump(ap.dueDate, 0, Number(ap.amount) - Number(ap.paidAmount));
    }

    // Recorrentes — para cada mês no horizonte, projeta se ainda não foi materializada
    const cur = new Date(today);
    cur.setDate(1);
    while (cur <= horizon) {
      const yearMonth = ym(cur);
      for (const r of recurring) {
        if (r.lastGeneratedFor === yearMonth) continue; // já materializada → vira AP real
        const day = Math.min(
          r.dayOfMonth,
          new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate(),
        );
        const dueDate = new Date(cur.getFullYear(), cur.getMonth(), day);
        if (dueDate >= today && dueDate <= horizon) {
          bump(dueDate, 0, Number(r.amount));
        }
      }
      cur.setMonth(cur.getMonth() + 1);
    }

    // Gera lista de dias com cumulative
    const result: DayProjection[] = [];
    let cumulative = startBalance;
    let totalIn = 0;
    let totalOut = 0;
    for (let i = 0; i <= days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const key = ymd(d);
      const day = byDay.get(key) ?? { in: 0, out: 0 };
      const net = day.in - day.out;
      cumulative += net;
      totalIn += day.in;
      totalOut += day.out;
      result.push({
        date: key,
        expectedIn: day.in,
        expectedOut: day.out,
        netForDay: net,
        cumulativeBalance: cumulative,
      });
    }

    return {
      startBalance,
      days: result,
      totalIn,
      totalOut,
      finalBalance: cumulative,
    };
  }

  /**
   * DRE gerencial — receita, custo (COGS), despesas e lucro líquido por mês.
   * Receita = CashMovement ENTRY category=SALE (recebimento de caixa)
   * COGS = soma de (OrderItem.quantity * Product.averageCost) dos pedidos
   *        confirmados/pagos no mês (custo dos produtos saídos)
   * Despesas = CashMovement EXIT exceto category=OTHER_IN
   * Lucro = Receita - COGS - Despesas
   */
  async dre(companyId: string, fromYearMonth: string, toYearMonth: string): Promise<DREReport> {
    const [fy, fm] = fromYearMonth.split('-').map(Number);
    const [ty, tm] = toYearMonth.split('-').map(Number);
    const from = new Date(fy, fm - 1, 1);
    const to = new Date(ty, tm, 0, 23, 59, 59); // último dia do mês `to`

    // Movimentações no período
    const movements = await this.prisma.cashMovement.findMany({
      where: {
        companyId,
        status: 'COMPLETED',
        date: { gte: from, lte: to },
      },
      select: { date: true, type: true, category: true, value: true },
    });

    // Pedidos confirmados/pagos no período (para COGS)
    const orders = await this.prisma.order.findMany({
      where: {
        companyId,
        status: { in: ['CONFIRMED', 'PAID'] },
        createdAt: { gte: from, lte: to },
      },
      include: {
        items: {
          include: {
            product: { select: { averageCost: true, costPrice: true } },
          },
        },
      },
    });

    // Inicializa map por mês
    const byMonth = new Map<string, MonthRow>();
    const initMonth = (key: string) => {
      if (!byMonth.has(key)) {
        byMonth.set(key, {
          month: key,
          revenue: 0,
          cogs: 0,
          grossProfit: 0,
          expenses: 0,
          netIncome: 0,
        });
      }
      return byMonth.get(key)!;
    };

    for (const m of movements) {
      const key = ym(m.date);
      const row = initMonth(key);
      const v = Number(m.value);
      if (m.type === 'ENTRY' && m.category === 'SALE') {
        row.revenue += v;
      } else if (m.type === 'EXIT' && m.category !== 'OTHER_IN') {
        row.expenses += v;
      }
    }

    for (const o of orders) {
      const key = ym(o.createdAt);
      const row = initMonth(key);
      for (const item of o.items) {
        const cost = Number(
          item.product?.averageCost ?? item.product?.costPrice ?? 0,
        );
        row.cogs += cost * item.quantity;
      }
    }

    // Garante todos os meses do range, mesmo vazios
    const monthsAll: MonthRow[] = [];
    const cursor = new Date(from);
    while (cursor <= to) {
      const key = ym(cursor);
      const row = byMonth.get(key) ?? {
        month: key,
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        expenses: 0,
        netIncome: 0,
      };
      row.grossProfit = row.revenue - row.cogs;
      row.netIncome = row.grossProfit - row.expenses;
      monthsAll.push(row);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const totals = monthsAll.reduce(
      (acc, m) => ({
        revenue: acc.revenue + m.revenue,
        cogs: acc.cogs + m.cogs,
        grossProfit: acc.grossProfit + m.grossProfit,
        expenses: acc.expenses + m.expenses,
        netIncome: acc.netIncome + m.netIncome,
      }),
      { revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, netIncome: 0 },
    );

    return {
      from: fromYearMonth,
      to: toYearMonth,
      months: monthsAll,
      totals,
    };
  }
}
