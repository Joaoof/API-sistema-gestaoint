import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { CompanyWithoutPlanError } from "src/core/exceptions/company-without-plan.exception";
import { REDIS_CLIENT } from "src/infra/cache/redis.constants";
import { RedisService } from "src/infra/cache/redis.service";
import { PlanDto } from "src/infra/graphql/dto/plan.dto";

@Injectable()
export class GetPlanService {
    constructor(private readonly redis: RedisService, private readonly prisma: PrismaService) { }

    async getPlanByCompanyId(companyId: string): Promise<PlanDto> {
        const cacheKey = `auth:company:plan:${companyId}`;
        console.log('CACHE KEY:', cacheKey);

        // Tenta do cache
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            console.log('🎯 SERVINDO DO CACHE');
            console.log('CACHE RAW:', cached); // ← veja o que realmente está lá

            try {
                const parsed = JSON.parse(cached);

                // ✅ VALIDAÇÃO: só aceita se for objeto e tiver id e name
                if (parsed && typeof parsed === 'object' && 'id' in parsed && 'name' in parsed) {
                    console.log('✅ CACHE VÁLIDO:', parsed);
                    return parsed;
                } else {
                    console.warn('⚠️ CACHE CORROMPIDO OU INVÁLIDO — IGNORANDO');
                    // Não retorna — deixa buscar do banco
                }
            } catch (err) {
                console.error('❌ CACHE INVÁLIDO (JSON parse error) — IGNORANDO', err.message);
                // Não retorna — deixa buscar do banco
            }
        }

        console.log('🔍 BUSCANDO NO BANCO...');

        const companyPlan = await this.prisma.companyPlan.findFirst({
            where: { company_id: companyId, isActive: true },
            include: {
                plan: {
                    include: {
                        module: {
                            where: { isActive: true },
                            include: {
                                module: {
                                    select: { module_key: true, name: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!companyPlan || !companyPlan.plan) {
            throw new CompanyWithoutPlanError();
        }

        const plan = companyPlan.plan;

        // 👇 LOG CRÍTICO — VEJA O QUE REALMENTE VEIO DO BANCO
        console.log('📊 DADOS DO BANCO - plan.name:', {
            value: plan.name,
            type: typeof plan.name,
            isNull: plan.name === null,
            isUndefined: plan.name === undefined
        });

        // ✅ SOLUÇÃO FINAL: SEMPRE FORNECER STRING VÁLIDA
        const planDto: PlanDto = {
            id: plan.id,
            name: plan.name?.trim() || 'Plano Padrão', // 👈 NUNCA undefined, NUNCA null
            modules: plan.module.map((pm) => ({
                module_key: pm.module.module_key,
                name: pm.module.name,
                permission: Array.from(new Set(pm.permission)),
                isActive: true,
            })),
        };

        console.log('✅ DTO MONTADO:', planDto);

        // Salva no cache — SEM JSON.stringify manual
        await this.redis.set(cacheKey, planDto, 3600);
        console.log('💾 SALVO NO CACHE');

        return planDto;
    }

}