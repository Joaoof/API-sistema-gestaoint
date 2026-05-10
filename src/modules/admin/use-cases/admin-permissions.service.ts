import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import { AuditAction } from '@prisma/client';
import {
  AdminAssignPlanInput,
  AdminCreateModuleInput,
  AdminCreatePlanInput,
  AdminUpdatePlanInput,
  AdminUpsertPlanModuleInput,
} from '../dto/admin.input';
import {
  AdminCompanyEntity,
  AdminModuleEntity,
  AdminPlanEntity,
} from '../entities/admin.entities';

@Injectable()
export class AdminPermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  // ============ Plans ============

  async listPlans(): Promise<AdminPlanEntity[]> {
    const rows = await this.prisma.plan.findMany({
      include: {
        module: {
          include: { module: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? null,
      isActive: p.isActive,
      modules: p.module.map((pm) => ({
        id: pm.id,
        planId: pm.planId,
        moduleId: pm.moduleId,
        isActive: pm.isActive,
        permission: pm.permission,
        module: pm.module
          ? {
              id: pm.module.id,
              name: pm.module.name,
              module_key: pm.module.module_key,
              description: pm.module.description ?? null,
            }
          : null,
      })),
    }));
  }

  async createPlan(actor: AuditActor, input: AdminCreatePlanInput): Promise<AdminPlanEntity> {
    const exists = await this.prisma.plan.findUnique({ where: { name: input.name } });
    if (exists) throw new ConflictException('Plano com esse nome já existe.');
    const created = await this.prisma.plan.create({
      data: { name: input.name, description: input.description ?? null },
    });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Plan',
      entityId: created.id,
      action: AuditAction.CREATE,
      after: created as any,
    });
    return { ...created, description: created.description ?? null, modules: [] };
  }

  async updatePlan(actor: AuditActor, input: AdminUpdatePlanInput): Promise<AdminPlanEntity> {
    const existing = await this.prisma.plan.findUnique({ where: { id: input.id } });
    if (!existing) throw new NotFoundException('Plano não encontrado.');
    const updated = await this.prisma.plan.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      include: { module: { include: { module: true } } },
    });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Plan',
      entityId: updated.id,
      action: AuditAction.UPDATE,
      before: existing as any,
      after: updated as any,
    });
    return {
      id: updated.id,
      name: updated.name,
      description: updated.description ?? null,
      isActive: updated.isActive,
      modules: updated.module.map((pm) => ({
        id: pm.id,
        planId: pm.planId,
        moduleId: pm.moduleId,
        isActive: pm.isActive,
        permission: pm.permission,
        module: pm.module
          ? {
              id: pm.module.id,
              name: pm.module.name,
              module_key: pm.module.module_key,
              description: pm.module.description ?? null,
            }
          : null,
      })),
    };
  }

  async deletePlan(actor: AuditActor, id: string): Promise<boolean> {
    const inUse = await this.prisma.companyPlan.count({ where: { planId: id, isActive: true } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Plano em uso por ${inUse} empresa(s). Desative ou troque antes de apagar.`,
      );
    }
    const existing = await this.prisma.plan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Plano não encontrado.');

    await this.prisma.$transaction([
      this.prisma.planModule.deleteMany({ where: { planId: id } }),
      this.prisma.plan.delete({ where: { id } }),
    ]);

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Plan',
      entityId: id,
      action: AuditAction.DELETE,
      before: existing as any,
    });
    return true;
  }

  // ============ Modules ============

  async listModules(): Promise<AdminModuleEntity[]> {
    const rows = await this.prisma.module.findMany({ orderBy: { name: 'asc' } });
    return rows.map((m) => ({
      id: m.id,
      name: m.name,
      module_key: m.module_key,
      description: m.description ?? null,
    }));
  }

  async createModule(actor: AuditActor, input: AdminCreateModuleInput): Promise<AdminModuleEntity> {
    const exists = await this.prisma.module.findUnique({ where: { module_key: input.module_key } });
    if (exists) throw new ConflictException('module_key já existe.');
    const created = await this.prisma.module.create({
      data: {
        name: input.name,
        module_key: input.module_key,
        description: input.description ?? null,
      },
    });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Module',
      entityId: created.id,
      action: AuditAction.CREATE,
      after: created as any,
    });
    return {
      id: created.id,
      name: created.name,
      module_key: created.module_key,
      description: created.description ?? null,
    };
  }

  // ============ PlanModule (permissões por plano) ============

  async upsertPlanModule(
    actor: AuditActor,
    input: AdminUpsertPlanModuleInput,
  ): Promise<boolean> {
    const existing = await this.prisma.planModule.findFirst({
      where: { planId: input.planId, moduleId: input.moduleId },
    });

    if (existing) {
      await this.prisma.planModule.update({
        where: { id: existing.id },
        data: {
          permission: input.permission,
          isActive: input.isActive ?? true,
        },
      });
    } else {
      await this.prisma.planModule.create({
        data: {
          planId: input.planId,
          moduleId: input.moduleId,
          permission: input.permission,
          isActive: input.isActive ?? true,
        },
      });
    }

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'PlanModule',
      entityId: `${input.planId}:${input.moduleId}`,
      action: existing ? AuditAction.UPDATE : AuditAction.CREATE,
      after: { ...input } as any,
    });
    return true;
  }

  async removePlanModule(
    actor: AuditActor,
    planId: string,
    moduleId: string,
  ): Promise<boolean> {
    const row = await this.prisma.planModule.findFirst({
      where: { planId, moduleId },
    });
    if (!row) return false;
    await this.prisma.planModule.delete({ where: { id: row.id } });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'PlanModule',
      entityId: `${planId}:${moduleId}`,
      action: AuditAction.DELETE,
      before: row as any,
    });
    return true;
  }

  // ============ Companies x Plans ============

  async listCompanies(): Promise<AdminCompanyEntity[]> {
    const rows = await this.prisma.company.findMany({
      include: {
        Users: { where: { is_active: true }, select: { id: true } },
        companyPlan: { where: { isActive: true }, include: { plan: true } },
      },
      orderBy: { name: 'asc' },
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email ?? null,
      userCount: c.Users.length,
      currentPlanId: c.companyPlan?.planId ?? null,
      currentPlanName: c.companyPlan?.plan?.name ?? null,
    }));
  }

  async assignPlan(actor: AuditActor, input: AdminAssignPlanInput): Promise<boolean> {
    const company = await this.prisma.company.findUnique({ where: { id: input.companyId } });
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    const plan = await this.prisma.plan.findUnique({ where: { id: input.planId } });
    if (!plan) throw new NotFoundException('Plano não encontrado.');

    // Apenas 1 plano ativo por empresa (relação 1-1 no schema). Substitui.
    const existing = await this.prisma.companyPlan.findUnique({
      where: { company_id: input.companyId },
    });

    if (existing) {
      await this.prisma.companyPlan.update({
        where: { id: existing.id },
        data: { planId: input.planId, isActive: true, startDate: new Date(), endDate: null },
      });
    } else {
      await this.prisma.companyPlan.create({
        data: {
          company_id: input.companyId,
          planId: input.planId,
          isActive: true,
        },
      });
    }

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'CompanyPlan',
      entityId: input.companyId,
      action: AuditAction.UPDATE,
      after: { companyId: input.companyId, planId: input.planId } as any,
      reason: 'Atribuição de plano pelo super-admin.',
    });

    return true;
  }
}
