import { Injectable, BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "prisma/prisma.service";
import { CashMovement } from "src/core/entities/cash-movement.entity";
import { CashMovementRepository } from "src/core/ports/cash-movement.repository";
import { RedisService } from "src/infra/cache/redis.service";
import { FindAllCashMovementInput } from "src/infra/graphql/dto/find-all-cash-movement.input";

@Injectable()
export class PrismaCashMovementRepository implements CashMovementRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) { }

    private buildWhere(filters?: FindAllCashMovementInput, userId?: string): Prisma.CashMovementWhereInput {
        const where: Prisma.CashMovementWhereInput = {
            user_id: userId,
        };

        if (!filters) return where;

        if (filters.search) {
            where.description = {
                contains: filters.search,
                mode: 'insensitive',
            };
        }

        if (filters.type) {
            where.type = filters.type;
        }

        if (filters.category) {
            where.category = filters.category;
        }

        if (filters.dateFrom || filters.dateTo) {
            where.date = {};
            if (filters.dateFrom) {
                where.date.gte = filters.dateFrom;
            }
            if (filters.dateTo) {
                where.date.lte = filters.dateTo;
            }
        }

        if (filters.valueMin !== undefined || filters.valueMax !== undefined) {
            where.value = {};
            if (filters.valueMin !== undefined) {
                where.value.gte = filters.valueMin
            }
            if (filters.valueMax !== undefined) {
                where.value.lte = filters.valueMax
            }
        }

        return where;
    }

    async create(movement: CashMovement): Promise<void> {
        if (!movement.user_id) {
            throw new BadRequestException('user_id é obrigatório');
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

        const listCacheKey = `cashMovements:${movement.user_id}:${JSON.stringify({})}`; // ou filtro default
        await this.redis.del(listCacheKey);

    }

    async findById(id: string): Promise<CashMovement | null> {
        const cacheKey = `cashMovement:${id}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) return CashMovement.fromPrisma(JSON.parse(cached));

        const data = await this.prisma.cashMovement.findUnique({ where: { id } });
        if (!data) return null;

        const movement = CashMovement.fromPrisma(data);
        await this.redis.setex(cacheKey, 120, JSON.stringify(movement));
        return movement;
    }

    async findAll(userId: string, filters?: FindAllCashMovementInput): Promise<CashMovement[]> {
        const cacheKey = `cashMovements:${userId}:${JSON.stringify(filters || {})}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached).map(CashMovement.fromPrisma);

        const where = this.buildWhere(filters, userId);

        const movements = await this.prisma.cashMovement.findMany({
            where,
            orderBy: { date: 'desc' },
        });

        await this.redis.setex(cacheKey, 120, JSON.stringify(movements));
        return movements.map(CashMovement.fromPrisma);
    }
}
