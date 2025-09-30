import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CompanyWithoutPlanError } from 'src/core/exceptions/company-without-plan.exception';
import { RedisService } from '../../../infra/cache/redis.service';
import { PlanDto } from 'src/core/dtos/plan.dto';

@Injectable()
export class GetPlanService {
  private readonly redis: RedisService;
  private readonly prisma: PrismaService;

  constructor(redis: RedisService, prisma: PrismaService) {
    this.prisma = prisma;
    this.redis = redis;
  }

  async getPlanByCompanyId(companyId: string): Promise<PlanDto> {
    const cacheKey = `auth:company:plan:${companyId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (
          parsed &&
          typeof parsed === 'object' &&
          'id' in parsed &&
          'name' in parsed
        ) {
          return parsed;
        } else {
          console.warn('⚠️ CACHE CORROMPIDO OU INVÁLIDO — IGNORANDO');
        }
      } catch (err) {
        console.error(
          '❌ CACHE INVÁLIDO (JSON parse error) — IGNORANDO',
          err.message,
        );
      }
    }

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

    // Salva no cache — SEM JSON.stringify manual
    await this.redis.set(cacheKey, planDto, 3600);

    return planDto;
  }
}
