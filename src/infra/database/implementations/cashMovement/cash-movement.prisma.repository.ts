import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { CashMovement } from '../../../../core/entities/movements/cash-movement.entity';
import { DashboardMovement } from '../../../../core/entities/dashboard-movement.entity';
import {
  CashMovementRepository,
  CashMovementSummary,
  PaginatedCashMovements,
} from '../../../../core/ports/cash-movement.repository';
import { RedisService } from '../../../../infra/cache/redis.service';
import { FindAllCashMovementInput } from '../../../../core/use-cases/cashMovement/dtos/find-all-cash-movement.input';
import { UpdateCashMovementInput } from '../../../../core/use-cases/cashMovement/dtos/update-cash-movement.input';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

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

    if (movement.bankId) {
      // Permite qualquer usuário da MESMA empresa usar o banco (não só o dono).
      // Banco é recurso compartilhado da empresa: se a Maria cadastrou e o
      // João lança movimento, ambos devem conseguir desde que estejam na
      // mesma empresa.
      const bank = await this.prisma.bank.findUnique({
        where: { id: movement.bankId },
        select: { id: true, user: { select: { company_id: true } } },
      });
      if (!bank) {
        throw new BadRequestException('Banco não encontrado.');
      }
      const movementUser = await this.prisma.users.findUnique({
        where: { id: movement.user_id },
        select: { company_id: true },
      });
      if (
        !movementUser ||
        bank.user?.company_id !== movementUser.company_id
      ) {
        throw new BadRequestException(
          'Banco pertence a outra empresa — selecione um banco válido.',
        );
      }
    }

    await this.prisma.cashMovement.create({
      data: {
        id: movement.id,
        companyId: movement.companyId,
        type: movement.type,
        category: movement.category,
        typePayment: movement.typePayment ?? undefined,
        status: movement.status,
        value: movement.value,
        description: movement.description,
        date: movement.date,
        dueDate: movement.dueDate ?? undefined,
        paidAt: movement.paidAt ?? undefined,
        referenceCode: movement.referenceCode ?? undefined,
        counterpartyName: movement.counterpartyName ?? undefined,
        counterpartyDocument: movement.counterpartyDocument ?? undefined,
        notes: movement.notes ?? undefined,
        attachmentUrl: movement.attachmentUrl ?? undefined,
        user_id: movement.user_id,
        bankId: movement.bankId ?? undefined,
      },
    });

    await this.invalidateUserCache(movement.user_id);
  }

  async findById(id: string): Promise<CashMovement | null> {
    const data = await this.prisma.cashMovement.findUnique({ where: { id } });
    return data ? CashMovement.fromPrisma(data) : null;
  }

  async findAll(
    userId: string,
    filters?: FindAllCashMovementInput,
  ): Promise<CashMovement[]> {
    const where = this.buildWhere(userId, filters);
    const orderBy = this.buildOrderBy(filters);

    const rows = await this.prisma.cashMovement.findMany({
      where,
      orderBy,
    });

    return rows.map(CashMovement.fromPrisma);
  }

  async findPaginated(
    userId: string,
    filters?: FindAllCashMovementInput,
  ): Promise<PaginatedCashMovements> {
    const where = this.buildWhere(userId, filters);
    const orderBy = this.buildOrderBy(filters);

    const page = Math.max(1, filters?.page ?? DEFAULT_PAGE);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, filters?.pageSize ?? DEFAULT_PAGE_SIZE),
    );

    const [rows, total, summary] = await Promise.all([
      this.prisma.cashMovement.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.cashMovement.count({ where }),
      this.computeSummary(where),
    ]);

    return {
      items: rows.map(CashMovement.fromPrisma),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      summary,
    };
  }

  async dashboardMovement(
    userId: string,
    date?: string,
  ): Promise<DashboardMovement> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const [dailyData, monthlyData] = await Promise.all([
      this.prisma.cashMovement.findMany({
        where: {
          user_id: userId,
          date: {
            gte: new Date(`${targetDate}T00:00:00.000Z`),
            lte: new Date(`${targetDate}T23:59:59.999Z`),
          },
        },
      }),
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
    return this.prisma.cashMovement.groupBy({
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

    return this.prisma.cashMovement.aggregate({
      _sum: { value: true },
      where: {
        user_id: userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });
  }

  async deleteCashMovement(
    userId: string,
    movementId: string,
  ): Promise<boolean> {
    const found = await this.prisma.cashMovement.findUnique({
      where: { id: movementId },
    });
    if (!found) return false;

    if (found.user_id !== userId) {
      throw new Error('Você não tem permissão para deletar esse movimento');
    }

    await this.prisma.cashMovement.delete({ where: { id: movementId } });
    await this.invalidateUserCache(userId);
    return true;
  }

  async updateMovement(
    movementId: string,
    movement: UpdateCashMovementInput,
  ): Promise<boolean> {
    const found = await this.prisma.cashMovement.findUnique({
      where: { id: movementId },
    });
    if (!found) return false;

    const data: Prisma.CashMovementUpdateInput = {};
    if (movement.type !== undefined) data.type = movement.type;
    if (movement.category !== undefined) data.category = movement.category;
    if (movement.typePayment !== undefined)
      data.typePayment = movement.typePayment ?? null;
    if (movement.status !== undefined) data.status = movement.status;
    if (movement.value !== undefined) data.value = movement.value;
    if (movement.description !== undefined)
      data.description = movement.description;
    if (movement.date !== undefined) data.date = movement.date;
    if (movement.dueDate !== undefined) data.dueDate = movement.dueDate;
    if (movement.paidAt !== undefined) data.paidAt = movement.paidAt;
    if (movement.referenceCode !== undefined)
      data.referenceCode = movement.referenceCode;
    if (movement.counterpartyName !== undefined)
      data.counterpartyName = movement.counterpartyName;
    if (movement.counterpartyDocument !== undefined)
      data.counterpartyDocument = movement.counterpartyDocument;
    if (movement.notes !== undefined) data.notes = movement.notes;
    if (movement.attachmentUrl !== undefined)
      data.attachmentUrl = movement.attachmentUrl;
    if (movement.bankId !== undefined) {
      if (movement.bankId) {
        const bank = await this.prisma.bank.findUnique({
          where: { id: movement.bankId },
          select: { id: true, user_id: true },
        });
        if (!bank || bank.user_id !== found.user_id) {
          throw new BadRequestException('Banco inválido.');
        }
        data.bank = { connect: { id: movement.bankId } };
      } else {
        data.bank = { disconnect: true };
      }
    }

    await this.prisma.cashMovement.update({
      where: { id: movementId },
      data,
    });

    await this.invalidateUserCache(found.user_id);
    return true;
  }

  private buildWhere(
    userId: string,
    filters?: FindAllCashMovementInput,
  ): Prisma.CashMovementWhereInput {
    const where: Prisma.CashMovementWhereInput = { user_id: userId };

    if (!filters) return where;

    if (filters.type) where.type = filters.type;

    if (filters.categories?.length) {
      where.category = { in: filters.categories };
    }

    if (filters.paymentMethods?.length) {
      where.typePayment = { in: filters.paymentMethods };
    }

    if (filters.statuses?.length) {
      where.status = { in: filters.statuses };
    }

    if (filters.bankId) {
      where.bankId = filters.bankId;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    if (filters.minValue != null || filters.maxValue != null) {
      where.value = {};
      if (filters.minValue != null) where.value.gte = filters.minValue;
      if (filters.maxValue != null) where.value.lte = filters.maxValue;
    }

    if (filters.referenceCode) {
      where.referenceCode = {
        contains: filters.referenceCode,
        mode: 'insensitive',
      };
    }

    if (filters.counterparty) {
      where.OR = [
        {
          counterpartyName: {
            contains: filters.counterparty,
            mode: 'insensitive',
          },
        },
        {
          counterpartyDocument: {
            contains: filters.counterparty,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (filters.search) {
      const term = filters.search;
      const orClauses: Prisma.CashMovementWhereInput[] = [
        { description: { contains: term, mode: 'insensitive' } },
        { referenceCode: { contains: term, mode: 'insensitive' } },
        { counterpartyName: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
      ];
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { OR: orClauses },
      ];
    }

    return where;
  }

  private buildOrderBy(
    filters?: FindAllCashMovementInput,
  ): Prisma.CashMovementOrderByWithRelationInput {
    const direction = filters?.sortDirection === 'ASC' ? 'asc' : 'desc';
    switch (filters?.sortBy) {
      case 'VALUE':
        return { value: direction };
      case 'CREATED_AT':
        return { createdAt: direction };
      case 'DUE_DATE':
        return { dueDate: direction };
      case 'DATE':
      default:
        return { date: direction };
    }
  }

  private async computeSummary(
    where: Prisma.CashMovementWhereInput,
  ): Promise<CashMovementSummary> {
    const [byType, byCategory, pendingAgg, overdueAgg, totalCount] =
      await Promise.all([
        this.prisma.cashMovement.groupBy({
          by: ['type'],
          where,
          _sum: { value: true },
        }),
        this.prisma.cashMovement.groupBy({
          by: ['category'],
          where,
          _sum: { value: true },
          _count: { _all: true },
        }),
        this.prisma.cashMovement.aggregate({
          where: { ...where, status: 'PENDING' },
          _sum: { value: true },
        }),
        this.prisma.cashMovement.aggregate({
          where: { ...where, status: 'OVERDUE' },
          _sum: { value: true },
        }),
        this.prisma.cashMovement.count({ where }),
      ]);

    const totalEntries =
      Number(byType.find((t) => t.type === 'ENTRY')?._sum.value ?? 0) || 0;
    const totalExits =
      Number(byType.find((t) => t.type === 'EXIT')?._sum.value ?? 0) || 0;

    return {
      totalCount,
      totalEntries: round2(totalEntries),
      totalExits: round2(totalExits),
      balance: round2(totalEntries - totalExits),
      pendingTotal: round2(Number(pendingAgg._sum.value ?? 0)),
      overdueTotal: round2(Number(overdueAgg._sum.value ?? 0)),
      byCategory: byCategory.map((c) => ({
        category: c.category,
        total: round2(Number(c._sum.value ?? 0)),
        count: c._count._all,
      })),
    };
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    const cacheKey = `cashMovements:${userId}:all`;
    try {
      await this.redis.delete(cacheKey);
    } catch {
      // cache invalidation is best-effort; never break the write path
    }
  }
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}
