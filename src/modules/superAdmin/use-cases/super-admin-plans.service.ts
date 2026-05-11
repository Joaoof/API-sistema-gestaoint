import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  CreatePlanInput, ModuleAdminDto, PlanAdminDto, UpsertPlanModuleInput,
} from '../dto/super-admin.dto';

@Injectable()
export class SuperAdminPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async listModules(): Promise<ModuleAdminDto[]> {
    const mods = await this.prisma.module.findMany({ orderBy: { name: 'asc' } });
    return mods.map((m) => ({
      id: m.id,
      name: m.name,
      module_key: m.module_key,
      description: m.description,
    }));
  }

  async listPlans(): Promise<PlanAdminDto[]> {
    const plans = await this.prisma.plan.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        module: { include: { module: true } },
        _count: { select: { companyPlans: true } },
      },
    });

    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      isActive: p.isActive,
      createdAt: p.createdAt,
      companiesCount: p._count.companyPlans,
      modules: p.module.map((pm) => ({
        id: pm.id,
        moduleId: pm.moduleId,
        module_key: pm.module.module_key,
        moduleName: pm.module.name,
        permission: pm.permission,
        isActive: pm.isActive,
      })),
    }));
  }

  async createPlan(input: CreatePlanInput) {
    const exists = await this.prisma.plan.findUnique({ where: { name: input.name } });
    if (exists) throw new BadRequestException('Plano com esse nome já existe.');
    return this.prisma.plan.create({
      data: { name: input.name, description: input.description, isActive: true },
    });
  }

  async setActive(planId: string, isActive: boolean) {
    return this.prisma.plan.update({ where: { id: planId }, data: { isActive } });
  }

  async deletePlan(planId: string) {
    const inUse = await this.prisma.companyPlan.count({ where: { planId } });
    if (inUse > 0) {
      throw new BadRequestException(`Plano em uso por ${inUse} empresa(s). Mude-as primeiro.`);
    }
    await this.prisma.planModule.deleteMany({ where: { planId } });
    return this.prisma.plan.delete({ where: { id: planId } });
  }

  /**
   * Define permissões de um módulo num plano. Cria, atualiza ou remove
   * o PlanModule conforme `permission`:
   *   - []           → desliga o módulo (deleta)
   *   - ['READ']     → cria/atualiza com READ
   *   - ['READ','WRITE'] → cria/atualiza com ambos
   */
  async upsertPlanModule(input: UpsertPlanModuleInput) {
    const [plan, module] = await Promise.all([
      this.prisma.plan.findUnique({ where: { id: input.planId } }),
      this.prisma.module.findUnique({ where: { module_key: input.module_key } }),
    ]);
    if (!plan) throw new NotFoundException('Plano não encontrado.');
    if (!module) throw new NotFoundException(`Módulo ${input.module_key} não encontrado.`);

    const valid = input.permission.filter((p) => ['READ', 'WRITE'].includes(p));

    const existing = await this.prisma.planModule.findFirst({
      where: { planId: input.planId, moduleId: module.id },
    });

    if (valid.length === 0) {
      if (existing) await this.prisma.planModule.delete({ where: { id: existing.id } });
      return { removed: true };
    }

    if (existing) {
      return this.prisma.planModule.update({
        where: { id: existing.id },
        data: { permission: valid, isActive: true },
      });
    }
    return this.prisma.planModule.create({
      data: { planId: input.planId, moduleId: module.id, permission: valid, isActive: true },
    });
  }
}
