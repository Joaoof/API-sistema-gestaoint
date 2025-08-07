import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { CashMovement } from "src/core/entities/cash-movement.entity";
import { CashMovementRepository } from "src/core/ports/cash-movement.repository";
import { RedisService } from "src/infra/cache/redis.service";

@Injectable()
export class PrismaCashMovementRepository implements CashMovementRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService
    ) { }

    async create(movement: CashMovement): Promise<void> {
        await this.prisma.cashMovement.create({
            data: {
                type: movement.type,
                category: movement.category,
                value: movement.value,
                description: movement.description,
                date: movement.date ?? new Date(),
                user_id: movement.user_id ?? ''
            },
        });
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

    async findAll(): Promise<CashMovement[]> {
        const cacheKey = 'cashMovement:all';
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached).map(CashMovement.fromPrisma);

        const movements = await this.prisma.cashMovement.findMany({
            orderBy: { date: 'desc' },
        });

        await this.redis.setex(cacheKey, 120, JSON.stringify(movements));
        return movements.map(CashMovement.fromPrisma);
    }
}
