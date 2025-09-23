import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CashMovement } from 'src/core/entities/cash-movement.entity';
import { DashboardMovement } from 'src/core/entities/dashboard-movement.entity';
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

        await this.redis.delete(`cashMovements:${movement.user_id}:all`, movement.user_id);
    }

    async findById(id: string): Promise<CashMovement | null> {
        const data = await this.prisma.cashMovement.findUnique({ where: { id } });
        return data ? CashMovement.fromPrisma(data) : null;
    }

    async findAll(userId: string, filters?: FindAllCashMovementInput): Promise<CashMovement[]> {
        const cacheKey = `cashMovements:${userId}:all`;
        console.log(`[CACHE] Buscando chave: ${cacheKey}`);

        const cached = await this.redis.get(cacheKey);
        console.log(`[CACHE] Valor retornado do Redis:`, cached);

        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) {
                    console.log(`[CACHE] ✅ HIT! Retornando ${parsed.length} itens do cache.`);
                    return parsed.map(CashMovement.fromPrisma);
                } else {
                    console.warn('⚠️ Cache inválido (não é array) — buscando do banco');
                }
            } catch (e) {
                console.warn('⚠️ Erro ao parsear cache — buscando do banco', e);
            }
        }

        console.log('[CACHE] ❌ MISS — buscando do banco de dados...');
        const movements = await this.prisma.cashMovement.findMany({
            where: { user_id: userId },
            orderBy: { date: 'desc' },
        });

        console.log(`[CACHE] 📥 Salvando ${movements.length} itens no cache...`, movements);

        // ✅ CORREÇÃO IMPORTANTE: Sintaxe correta para definir TTL no Redis (v4+ ou ioredis)
        await this.redis.set(cacheKey, JSON.stringify(movements), 3600); // ← ANTES ERA SÓ 3600 (ERRADO)

        console.log(`[CACHE] 💾 Salvo com sucesso no Redis com chave: ${cacheKey}`);

        return movements.map(CashMovement.fromPrisma);
    }


    async dashboardMovement(userId: string, date?: string): Promise<DashboardMovement> {
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
                        gte: new Date(new Date(targetDate).getFullYear(), new Date(targetDate).getMonth(), 1),
                        lte: new Date(new Date(targetDate).getFullYear(), new Date(targetDate).getMonth() + 1, 0, 23, 59, 59, 999),
                    },
                },
            }),
        ]);

        const entriesToday = dailyData
            .filter(m => m.type === 'ENTRY')
            .reduce((sum, m) => sum + Number(m.value), 0);

        const exitsToday = dailyData
            .filter(m => m.type === 'EXIT')
            .reduce((sum, m) => sum + Number(m.value), 0);

        return new DashboardMovement(
            Number(entriesToday.toFixed(2)),
            Number(exitsToday.toFixed(2)),
            Number((entriesToday - exitsToday).toFixed(2)),
            Number((monthlyData._sum.value || 0).toFixed(2))
        );
    }


    async getDailyStats(userId: string, start: Date, end: Date) {
        return await this.prisma.cashMovement.groupBy({
            by: ['type'],
            where: {
                user_id: userId,
                date: { gte: start, lte: end }
            },
            _sum: { value: true }
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