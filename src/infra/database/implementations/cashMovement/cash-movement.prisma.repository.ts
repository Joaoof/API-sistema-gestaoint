import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CashMovement } from 'src/core/entities/cash-movement.entity';
import { CashMovementRepository } from 'src/core/ports/cash-movement.repository';
import { RedisService } from 'src/infra/cache/redis.service';
import { FindAllCashMovementInput } from 'src/infra/graphql/dto/find-all-cash-movement.input';

@Injectable()
export class PrismaCashMovementRepository implements CashMovementRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) { }

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

        await this.redis.del(`cashMovements:${movement.user_id}:all`);
    }

    async findById(id: string): Promise<CashMovement | null> {
        const data = await this.prisma.cashMovement.findUnique({ where: { id } });
        return data ? CashMovement.fromPrisma(data) : null;
    }

    async findAll(userId: string, filters?: FindAllCashMovementInput): Promise<CashMovement[]> {
        const cacheKey = `cashMovements:${userId}:all`;
        const cached = await this.redis.get(cacheKey);

        if (cached) {
            return JSON.parse(cached).map(CashMovement.fromPrisma);
        }

        const movements = await this.prisma.cashMovement.findMany({
            where: { user_id: userId },
            orderBy: { date: 'desc' },
        });

        await this.redis.setex(cacheKey, 120, JSON.stringify(movements));

        return movements.map(CashMovement.fromPrisma);
    }
}