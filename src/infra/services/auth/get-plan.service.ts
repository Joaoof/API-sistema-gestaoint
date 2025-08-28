import { Inject } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { CompanyWithoutPlanError } from "src/core/exceptions/company-without-plan.exception";
import { REDIS_CLIENT } from "src/infra/cache/redis.constants";
import { RedisService } from "src/infra/cache/redis.service";
import { PlanDto } from "src/infra/graphql/dto/plan.dto";

export class GetPlanService {
    constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisService, private readonly prisma: PrismaService) { }

    async getPlanByCompanyId(companyId: string): Promise<PlanDto> {
        const cacheKey = `auth:company:plan:${companyId}`;

        const cached = await this.redis.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const companyPlan = await this.prisma.companyPlan.findFirst({
            where: {
                company_id: companyId,
                isActive: true,
            },
            include: {
                plan: {
                    include: {
                        module: {
                            where: {
                                isActive: true,
                            }, include: {
                                module: {
                                    select: {
                                        module_key: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        if (!companyPlan || !companyPlan.plan) {
            throw new CompanyWithoutPlanError();
        }

        const plan = companyPlan.plan;

        const planDto: PlanDto = {
            id: plan.id,
            name: plan.name,
            modules: plan.module.map((pm) => ({
                module_key: pm.module.module_key,
                name: pm.module.name,
                permission: Array.from(new Set(pm.permission)),
                isActive: true,
            })),
        };

        await this.redis.setex(cacheKey, 3600, JSON.stringify(planDto));

        return planDto;
    }

}