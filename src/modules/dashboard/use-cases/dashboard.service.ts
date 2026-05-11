import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

export interface DashboardOverview {
  daily: { sales: number; profit: number; cost: number; ordersCount: number };
  monthly: { sales: number; profit: number; expenses: number; cost: number };
  margin: number; // % no mês
  sales30Days: Array<{ date: string; sales: number; orders: number }>;
  revenueVsExpenses6m: Array<{ month: string; revenue: number; expenses: number }>;
  expensesByCategory: Array<{ category: string; amount: number }>;
  topProducts: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
  topCategoriesByRevenue: Array<{ categoryId: string | null; name: string; revenue: number }>;
  inventory: {
    totalProducts: number;
    totalStockValue: number;
    lowStockCount: number;
    lowStockItems: Array<{ id: string; name: string; quantity: number; minStock: number }>;
  };
}

const CATEGORY_LABEL: Record<string, string> = {
  SALE: 'Vendas',
  CHANGE: 'Trocos',
  OTHER_IN: 'Outras entradas',
  EXPENSE: 'Despesa',
  WITHDRAWAL: 'Retirada',
  PAYMENT: 'Pagamento de conta',
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function ym(d: Date): string {
  return d.toISOString().slice(0, 7);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(companyId: string): Promise<DashboardOverview> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = new Date(todayStart.getTime() + 86400_000 - 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

    const [
      todayOrders,
      monthOrders,
      monthMovements,
      sales30,
      expenses6m,
      lowStock,
      productsCount,
      stockValueAgg,
    ] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          companyId,
          status: { in: ['CONFIRMED', 'PAID'] },
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        include: {
          items: { include: { product: { select: { averageCost: true, costPrice: true } } } },
        },
      }),
      this.prisma.order.findMany({
        where: {
          companyId,
          status: { in: ['CONFIRMED', 'PAID'] },
          createdAt: { gte: monthStart, lte: now },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  nameProduct: true,
                  averageCost: true,
                  costPrice: true,
                  categoryId: true,
                  category: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.cashMovement.findMany({
        where: {
          companyId,
          status: 'COMPLETED',
          date: { gte: monthStart, lte: now },
        },
        select: { type: true, category: true, value: true },
      }),
      this.prisma.order.findMany({
        where: {
          companyId,
          status: { in: ['CONFIRMED', 'PAID'] },
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { createdAt: true, total: true },
      }),
      this.prisma.cashMovement.findMany({
        where: {
          companyId,
          status: 'COMPLETED',
          date: { gte: sixMonthsAgo, lte: now },
        },
        select: { date: true, type: true, value: true, category: true },
      }),
      this.prisma.inventory.findMany({
        where: { companyId, quantity: { lte: 10 } },
        include: { product: { select: { nameProduct: true, minStock: true } } },
        orderBy: { quantity: 'asc' },
        take: 50,
      }),
      this.prisma.product.count({ where: { companyId, deletedAt: null } }),
      this.prisma.$queryRaw<Array<{ total_value: any }>>`
        SELECT COALESCE(SUM("quantity" * "averageCost"), 0) AS total_value
        FROM "Product"
        WHERE "companyId" = ${companyId} AND "deletedAt" IS NULL
      `,
    ]);

    // ---------- Daily KPI ----------
    let dailySales = 0;
    let dailyCost = 0;
    for (const o of todayOrders) {
      dailySales += Number(o.total);
      for (const item of o.items) {
        const cost = Number(item.product?.averageCost ?? item.product?.costPrice ?? 0);
        dailyCost += cost * item.quantity;
      }
    }
    const dailyProfit = dailySales - dailyCost;

    // ---------- Monthly KPI ----------
    let monthlySales = 0;
    let monthlyCost = 0;
    const productMap = new Map<
      string,
      { id: string; name: string; quantity: number; revenue: number }
    >();
    const categoryMap = new Map<string, { id: string | null; name: string; revenue: number }>();

    for (const o of monthOrders) {
      monthlySales += Number(o.total);
      for (const item of o.items) {
        const cost = Number(item.product?.averageCost ?? item.product?.costPrice ?? 0);
        monthlyCost += cost * item.quantity;
        const revenue = Number(item.unitPrice) * item.quantity - Number(item.discount);

        // Top produtos
        const pid = item.productId;
        if (!productMap.has(pid)) {
          productMap.set(pid, {
            id: pid,
            name: item.product?.nameProduct ?? item.productName,
            quantity: 0,
            revenue: 0,
          });
        }
        const p = productMap.get(pid)!;
        p.quantity += item.quantity;
        p.revenue += revenue;

        // Top categorias
        const catId = item.product?.categoryId ?? null;
        const catName = item.product?.category?.name ?? 'Sem categoria';
        const catKey = catId ?? '__null__';
        if (!categoryMap.has(catKey)) {
          categoryMap.set(catKey, { id: catId, name: catName, revenue: 0 });
        }
        categoryMap.get(catKey)!.revenue += revenue;
      }
    }

    let monthlyExpenses = 0;
    const expByCategory = new Map<string, number>();
    for (const m of monthMovements) {
      const value = Number(m.value);
      if (m.type === 'EXIT') {
        monthlyExpenses += value;
        const lbl = CATEGORY_LABEL[m.category] ?? m.category;
        expByCategory.set(lbl, (expByCategory.get(lbl) ?? 0) + value);
      }
    }
    const monthlyProfit = monthlySales - monthlyCost - monthlyExpenses;
    const margin = monthlySales > 0 ? (monthlyProfit / monthlySales) * 100 : 0;

    // ---------- Sales 30d (série diária) ----------
    const dailyMap = new Map<string, { sales: number; orders: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(thirtyDaysAgo.getDate() + i);
      dailyMap.set(ymd(d), { sales: 0, orders: 0 });
    }
    for (const o of sales30) {
      const key = ymd(o.createdAt);
      const bucket = dailyMap.get(key);
      if (bucket) {
        bucket.sales += Number(o.total);
        bucket.orders += 1;
      }
    }
    const sales30Days = Array.from(dailyMap.entries()).map(([date, v]) => ({
      date,
      sales: v.sales,
      orders: v.orders,
    }));

    // ---------- Revenue vs Expenses 6m ----------
    const sixMap = new Map<string, { revenue: number; expenses: number }>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(sixMonthsAgo.getMonth() + i);
      sixMap.set(ym(d), { revenue: 0, expenses: 0 });
    }
    for (const m of expenses6m) {
      const key = ym(m.date);
      const bucket = sixMap.get(key);
      if (!bucket) continue;
      const value = Number(m.value);
      if (m.type === 'ENTRY' && m.category === 'SALE') {
        bucket.revenue += value;
      } else if (m.type === 'EXIT' && m.category !== 'OTHER_IN') {
        bucket.expenses += value;
      }
    }
    const revenueVsExpenses6m = Array.from(sixMap.entries()).map(([month, v]) => ({
      month,
      revenue: v.revenue,
      expenses: v.expenses,
    }));

    // ---------- Top products / categories ----------
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p) => ({ productId: p.id, name: p.name, quantity: p.quantity, revenue: p.revenue }));

    const topCategoriesByRevenue = Array.from(categoryMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((c) => ({ categoryId: c.id, name: c.name, revenue: c.revenue }));

    const expensesByCategory = Array.from(expByCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount }));

    // ---------- Inventory ----------
    const lowStockItems = lowStock
      .filter((i) => i.quantity <= (i.product?.minStock ?? 5))
      .map((i) => ({
        id: i.id,
        name: i.product?.nameProduct ?? 'Produto',
        quantity: i.quantity,
        minStock: i.product?.minStock ?? 0,
      }));

    const totalStockValue = Number(stockValueAgg?.[0]?.total_value ?? 0);

    return {
      daily: {
        sales: dailySales,
        profit: dailyProfit,
        cost: dailyCost,
        ordersCount: todayOrders.length,
      },
      monthly: {
        sales: monthlySales,
        profit: monthlyProfit,
        expenses: monthlyExpenses,
        cost: monthlyCost,
      },
      margin,
      sales30Days,
      revenueVsExpenses6m,
      expensesByCategory,
      topProducts,
      topCategoriesByRevenue,
      inventory: {
        totalProducts: productsCount,
        totalStockValue,
        lowStockCount: lowStockItems.length,
        lowStockItems: lowStockItems.slice(0, 10),
      },
    };
  }
}
