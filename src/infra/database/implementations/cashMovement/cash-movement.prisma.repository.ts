import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { CashMovement } from 'src/core/entities/movements/cash-movement.entity';
import { DashboardMovement } from 'src/core/entities/dashboard-movement.entity';
import { CashMovementRepository } from 'src/core/ports/cash-movement.repository';
import { RedisService } from '../../../../infra/cache/redis.service';

@Injectable()
export class PrismaCashMovementRepository implements CashMovementRepository {
  private readonly prisma: PrismaService;
  private readonly redis: RedisService;
  constructor(prisma: PrismaService, redis: RedisService) {
    this.prisma = prisma;
    this.redis = redis;
  }

  async create(movement: CashMovement): Promise<void> {
    if (!movement.user_id) {
      throw new BadRequestException('userId é obrigatório');
    }

    await this.prisma.cashMovement.create({
      data: {
        type: movement.type,
        category: movement.category,
        value: movement.value,
        description: movement.description,
        date: movement.date ?? new Date(),
        user_id: movement.user_id,
      },
    });

    await this.prisma
      .$executeRaw`REFRESH MATERIALIZED VIEW mv_cash_movements_per_user;`;
    await this.prisma.$executeRaw`REFRESH MATERIALIZED VIEW auth_login_view;`;

    const cacheKey = `cashMovements:${movement.user_id}:all`;
    console.log(
      `[REDIS CREATE] 🔑 Chave: "${cacheKey}" | Len: ${cacheKey.length} | User: "${movement.user_id}" | User Len: ${movement.user_id.length}`,
    );

    try {
      const result = await this.redis.delete(cacheKey);
      console.log(`[REDIS CREATE] 🗑️ DEL retornou:`, result); // Deve ser 1 (se existia) ou 0 (se não existia)
    } catch (err) {
      console.error(`[REDIS CREATE] ❌ Erro no DEL:`, err);
    }

    console.log(
      `[REDIS CREATE] ✅ Cache invalidado para usuário: ${movement.user_id}`,
    );
  }

  async findById(id: string): Promise<CashMovement | null> {
    const data = await this.prisma.cashMovement.findUnique({ where: { id } });
    return data ? CashMovement.fromPrisma(data) : null;
  }

  async findAll(userId: string): Promise<CashMovement[]> {
    await this.prisma
      .$executeRaw`REFRESH MATERIALIZED VIEW mv_cash_movements_per_user;`;

    // 1) Consulta ÚNICA à materialized view usando índice composto
    const rows = await this.prisma.mvCashMovementsPerUser.findMany({
      where: { user_id: userId },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        user_id: true,
        type: true,
        category: true,
        value: true,
        description: true,
        date: true,
      },
    });

    console.debug(`DEBUG rows filtrados por ${userId}:`, rows);
    return rows.map(CashMovement.fromPrisma);
  }

  async dashboardMovement(
    userId: string,
    date?: string,
  ): Promise<DashboardMovement> {
    const targetDate = date || new Date().toISOString().split('T')[0]; // ex: "2025-08-18"

    const [dailyData, monthlyData] = await Promise.all([
      // 🔹 Dados do dia
      this.prisma.cashMovement.findMany({
        where: {
          user_id: userId,
          date: {
            gte: new Date(`${targetDate}T00:00:00.000Z`),
            lte: new Date(`${targetDate}T23:59:59.999Z`),
          },
        },
      }),
      // 🔹 Total do mês
      this.prisma.cashMovement.aggregate({
        _sum: { value: true },
        where: {
          user_id: userId,
          date: {
            gte: new Date(
              new Date(targetDate).getFullYear(),
              new Date(targetDate).getMonth(),
              1,
            ),
            lte: new Date(
              new Date(targetDate).getFullYear(),
              new Date(targetDate).getMonth() + 1,
              0,
              23,
              59,
              59,
              999,
            ),
          },
        },
      }),
    ]);

    const entriesToday = dailyData
      .filter((m) => m.type === 'ENTRY')
      .reduce((sum, m) => sum + Number(m.value), 0);

    const exitsToday = dailyData
      .filter((m) => m.type === 'EXIT')
      .reduce((sum, m) => sum + Number(m.value), 0);

    return new DashboardMovement(
      Number(entriesToday.toFixed(2)),
      Number(exitsToday.toFixed(2)),
      Number((entriesToday - exitsToday).toFixed(2)),
      Number((monthlyData._sum.value || 0).toFixed(2)),
    );
  }

  async getDailyStats(userId: string, start: Date, end: Date) {
    return await this.prisma.cashMovement.groupBy({
      by: ['type'],
      where: {
        user_id: userId,
        date: { gte: start, lte: end },
      },
      _sum: { value: true },
    });
  }

  async getMonthlyTotal(userId: string, year: number, month: number) {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    return await this.prisma.cashMovement.aggregate({
      _sum: { value: true },
      where: {
        user_id: userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });
  }
}
