import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CashMovement } from 'src/core/entities/cash-movement.entity';
import { DashboardMovement } from 'src/core/entities/dashboard-movement.entity';
import { CashMovementRepository } from 'src/core/ports/cash-movement.repository';
import { RedisService } from 'src/infra/cache/redis.service';
import { FindAllCashMovementInput } from 'src/infra/graphql/dto/find-all-cash-movement.input';
import { startOfDay, endOfDay } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

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

    async dashboardMovement(userId: string): Promise<any> {
        const timeZone = 'America/Sao_Paulo'; 
        const now = new Date();

        const today = fromZonedTime(startOfDay(now), timeZone);
        const endToday = fromZonedTime(endOfDay(now), timeZone);

        const startOfMonth = fromZonedTime(
            new Date(now.getFullYear(), now.getMonth(), 1),
            timeZone
        );
        const endOfMonth = fromZonedTime(
            new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
            timeZone
        );

        const [todayData, monthlySum] = await Promise.all([
            this.prisma.cashMovement.groupBy({
                by: ['type'],
                where: {
                    user_id: userId,
                    date: { gte: today, lte: endToday },
                },
                _sum: { value: true },
            }),

            this.prisma.cashMovement.aggregate({
                _sum: { value: true },
                where: {
                    user_id: userId,
                    date: { gte: startOfMonth, lte: endOfMonth },
                },
            }),
        ]);

        await this.prisma.cashMovement.findMany({
            where: {
                user_id: userId,
                date: { gte: today, lte: endToday },
            },
            select: { id: true, type: true, value: true, date: true },
        })
        const entriesToday = Number(todayData.find((g) => g.type === 'ENTRY')?._sum.value || 0);
        const exitsToday = Number(todayData.find((g) => g.type === 'EXIT')?._sum.value || 0);

        console.log('entriesToday calculado =>', entriesToday);
        console.log('exitsToday calculado =>', exitsToday);

        return new DashboardMovement(
            Number(entriesToday.toFixed(2)),
            Number(exitsToday.toFixed(2)),
            Number((entriesToday - exitsToday).toFixed(2)),
            Number((monthlySum._sum.value || 0).toFixed(2)),
        );

    }




}