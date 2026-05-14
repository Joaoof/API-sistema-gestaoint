import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { PrismaService } from '../../../../prisma/prisma.service';
import { RedisService } from '../../../infra/cache/redis.service';

export type EffectiveFeature = {
  module_key: string;
  name: string;
  enabled: boolean;
  source: 'plan' | 'override' | 'plan+override';
  permission: string[];
  hasConfig: boolean;
};

const CACHE_TTL_SECONDS = 600; // 10 min

/**
 * Calcula os módulos efetivos de uma empresa.
 *
 * Regra: começa do conjunto liberado pelo plano (PlanModule.isActive=true)
 * e aplica os overrides — `enabled=true` adiciona, `enabled=false` remove.
 *
 * Cacheado no Redis com chave `ff:effective:<companyId>`. Invalidação
 * obrigatória após qualquer mudança via `invalidate(companyId)`.
 */
@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
  ) {}

  private cacheKey(companyId: string) {
    return `ff:effective:${companyId}`;
  }

  async getEffectiveModules(companyId: string): Promise<EffectiveFeature[]> {
    const key = this.cacheKey(companyId);
    const cached = await this.redis.get(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed as EffectiveFeature[];
      } catch {
        this.logger.warn(`Cache corrompido em ${key} — ignorando.`);
      }
    }

    const [companyPlan, overrides, catalog] = await Promise.all([
      this.prisma.companyPlan.findFirst({
        where: { company_id: companyId, isActive: true },
        include: {
          plan: {
            include: {
              module: {
                where: { isActive: true },
                include: { module: true },
              },
            },
          },
        },
      }),
      this.prisma.companyModuleOverride.findMany({
        where: { companyId },
      }),
      this.prisma.module.findMany(),
    ]);

    const catalogByKey = new Map(catalog.map((m) => [m.module_key, m]));

    // 1) Base = módulos do plano
    const planModules = new Map<
      string,
      { permission: string[]; name: string }
    >();
    for (const pm of companyPlan?.plan.module ?? []) {
      planModules.set(pm.module.module_key, {
        permission: Array.from(new Set(pm.permission)),
        name: pm.module.name,
      });
    }

    // 2) Sobrepõe overrides
    const out: EffectiveFeature[] = [];
    const seen = new Set<string>();

    for (const ov of overrides) {
      seen.add(ov.module_key);
      const fromPlan = planModules.get(ov.module_key);
      const catEntry = catalogByKey.get(ov.module_key);
      if (!catEntry && !fromPlan) continue; // override pra módulo inexistente, ignora

      // override.enabled=false desliga o módulo (mesmo se plano libera)
      if (!ov.enabled) continue;

      out.push({
        module_key: ov.module_key,
        name: fromPlan?.name ?? catEntry?.name ?? ov.module_key,
        enabled: true,
        source: fromPlan ? 'plan+override' : 'override',
        permission: fromPlan?.permission ?? ['READ', 'WRITE'],
        hasConfig: ov.config !== null && ov.config !== undefined,
      });
    }

    for (const [mk, pm] of planModules.entries()) {
      if (seen.has(mk)) continue;
      out.push({
        module_key: mk,
        name: pm.name,
        enabled: true,
        source: 'plan',
        permission: pm.permission,
        hasConfig: false,
      });
    }

    await this.redis.set(key, out, CACHE_TTL_SECONDS);
    return out;
  }

  async hasModule(companyId: string, module_key: string): Promise<boolean> {
    const list = await this.getEffectiveModules(companyId);
    return list.some((f) => f.module_key === module_key && f.enabled);
  }

  async invalidate(companyId: string): Promise<void> {
    await this.redisClient.del(this.cacheKey(companyId));
  }
}
