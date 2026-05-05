import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  OpportunityActivityStatus,
  OpportunityStage,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import {
  CreateActivityInput,
  CreateOpportunityInput,
  OpportunityFilterInput,
  UpdateActivityInput,
  UpdateOpportunityInput,
} from '../dto/opportunity.input';
import {
  OpportunityActivityEntity,
  OpportunityEntity,
  PipelineStageEntity,
} from '../entities/opportunity.entity';

type RawOpportunity = Prisma.OpportunityGetPayload<{}>;
type RawActivity = Prisma.OpportunityActivityGetPayload<{}>;

function toEntity(raw: RawOpportunity): OpportunityEntity {
  return {
    id: raw.id,
    companyId: raw.companyId,
    customerId: raw.customerId,
    customerName: raw.customerName,
    customerPhone: raw.customerPhone,
    customerEmail: raw.customerEmail,
    title: raw.title,
    source: raw.source,
    stage: raw.stage,
    value: Number(raw.value),
    probability: raw.probability,
    expectedCloseDate: raw.expectedCloseDate,
    closedAt: raw.closedAt,
    ownerUserId: raw.ownerUserId,
    sellerId: raw.sellerId,
    notes: raw.notes,
    lostReason: raw.lostReason,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function toActivityEntity(raw: RawActivity): OpportunityActivityEntity {
  return {
    id: raw.id,
    opportunityId: raw.opportunityId,
    type: raw.type,
    status: raw.status,
    title: raw.title,
    description: raw.description,
    dueDate: raw.dueDate,
    completedAt: raw.completedAt,
    assignedToUserId: raw.assignedToUserId,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function snapshot(raw: RawOpportunity): Record<string, unknown> {
  return { ...raw, value: Number(raw.value) };
}

const STAGES: OpportunityStage[] = [
  OpportunityStage.NEW,
  OpportunityStage.QUALIFIED,
  OpportunityStage.PROPOSAL,
  OpportunityStage.NEGOTIATION,
  OpportunityStage.WON,
  OpportunityStage.LOST,
];

@Injectable()
export class OpportunityUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  private buildWhere(
    companyId: string,
    filter: OpportunityFilterInput = {},
  ): Prisma.OpportunityWhereInput {
    return {
      companyId,
      ...(filter.stage ? { stage: filter.stage } : {}),
      ...(filter.ownerUserId ? { ownerUserId: filter.ownerUserId } : {}),
      ...(filter.customerId ? { customerId: filter.customerId } : {}),
      ...(filter.search
        ? {
            OR: [
              { title: { contains: filter.search, mode: 'insensitive' } },
              { customerName: { contains: filter.search, mode: 'insensitive' } },
              { source: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  async list(
    companyId: string,
    filter: OpportunityFilterInput = {},
  ): Promise<OpportunityEntity[]> {
    const rows = await this.prisma.opportunity.findMany({
      where: this.buildWhere(companyId, filter),
      orderBy: [{ updatedAt: 'desc' }],
      take: 500,
    });
    return rows.map(toEntity);
  }

  async pipeline(
    companyId: string,
    filter: OpportunityFilterInput = {},
  ): Promise<PipelineStageEntity[]> {
    const where = this.buildWhere(companyId, filter);
    const items = await this.prisma.opportunity.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      take: 500,
    });
    const grouped = new Map<OpportunityStage, RawOpportunity[]>();
    for (const stage of STAGES) grouped.set(stage, []);
    for (const it of items) {
      grouped.get(it.stage)?.push(it);
    }
    return STAGES.map((stage) => {
      const arr = grouped.get(stage) ?? [];
      const totalValue = arr.reduce((sum, o) => sum + Number(o.value), 0);
      return {
        stage,
        count: arr.length,
        totalValue,
        items: arr.map(toEntity),
      };
    });
  }

  async findById(
    companyId: string,
    id: string,
  ): Promise<OpportunityEntity> {
    const opp = await this.prisma.opportunity.findUnique({ where: { id } });
    if (!opp || opp.companyId !== companyId) {
      throw new NotFoundException('Oportunidade não encontrada.');
    }
    return toEntity(opp);
  }

  async create(
    actor: AuditActor,
    input: CreateOpportunityInput,
  ): Promise<OpportunityEntity> {
    if (!input.customerId && !input.customerName) {
      throw new BadRequestException(
        'Informe um cliente existente ou ao menos o nome.',
      );
    }
    if (input.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: input.customerId },
      });
      if (!customer) {
        throw new BadRequestException('Cliente inválido.');
      }
    }

    const created = await this.prisma.opportunity.create({
      data: {
        companyId: actor.companyId,
        customerId: input.customerId ?? null,
        customerName: input.customerName ?? null,
        customerPhone: input.customerPhone ?? null,
        customerEmail: input.customerEmail ?? null,
        title: input.title.trim(),
        source: input.source ?? null,
        stage: input.stage,
        value: input.value,
        probability: input.probability,
        expectedCloseDate: input.expectedCloseDate ?? null,
        ownerUserId: input.ownerUserId ?? actor.userId,
        sellerId: input.sellerId ?? null,
        notes: input.notes ?? null,
      },
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Opportunity',
      entityId: created.id,
      action: AuditAction.CREATE,
      after: snapshot(created),
    });
    return toEntity(created);
  }

  async update(
    actor: AuditActor,
    id: string,
    input: UpdateOpportunityInput,
  ): Promise<OpportunityEntity> {
    const existing = await this.prisma.opportunity.findUnique({ where: { id } });
    if (!existing || existing.companyId !== actor.companyId) {
      throw new NotFoundException('Oportunidade não encontrada.');
    }

    const closeNow =
      input.stage &&
      (input.stage === OpportunityStage.WON ||
        input.stage === OpportunityStage.LOST) &&
      !existing.closedAt;

    const reopen =
      input.stage &&
      input.stage !== OpportunityStage.WON &&
      input.stage !== OpportunityStage.LOST &&
      existing.closedAt;

    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: {
        ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
        ...(input.customerName !== undefined ? { customerName: input.customerName } : {}),
        ...(input.customerPhone !== undefined ? { customerPhone: input.customerPhone } : {}),
        ...(input.customerEmail !== undefined ? { customerEmail: input.customerEmail } : {}),
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.source !== undefined ? { source: input.source } : {}),
        ...(input.stage !== undefined ? { stage: input.stage } : {}),
        ...(input.value !== undefined ? { value: input.value } : {}),
        ...(input.probability !== undefined
          ? { probability: input.probability }
          : {}),
        ...(input.expectedCloseDate !== undefined
          ? { expectedCloseDate: input.expectedCloseDate }
          : {}),
        ...(input.ownerUserId !== undefined ? { ownerUserId: input.ownerUserId } : {}),
        ...(input.sellerId !== undefined ? { sellerId: input.sellerId } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.lostReason !== undefined ? { lostReason: input.lostReason } : {}),
        ...(closeNow ? { closedAt: new Date() } : {}),
        ...(reopen ? { closedAt: null } : {}),
      },
    });

    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Opportunity',
      entityId: id,
      action: AuditAction.UPDATE,
      before: snapshot(existing),
      after: snapshot(updated),
    });
    return toEntity(updated);
  }

  async moveStage(
    actor: AuditActor,
    id: string,
    stage: OpportunityStage,
  ): Promise<OpportunityEntity> {
    return this.update(actor, id, { stage });
  }

  async remove(actor: AuditActor, id: string): Promise<boolean> {
    const existing = await this.prisma.opportunity.findUnique({ where: { id } });
    if (!existing || existing.companyId !== actor.companyId) {
      throw new NotFoundException('Oportunidade não encontrada.');
    }
    await this.prisma.opportunity.delete({ where: { id } });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Opportunity',
      entityId: id,
      action: AuditAction.DELETE,
      before: snapshot(existing),
    });
    return true;
  }

  // Activities
  async listActivities(
    companyId: string,
    opportunityId: string,
  ): Promise<OpportunityActivityEntity[]> {
    const opp = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
    });
    if (!opp || opp.companyId !== companyId) {
      throw new NotFoundException('Oportunidade não encontrada.');
    }
    const rows = await this.prisma.opportunityActivity.findMany({
      where: { opportunityId },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map(toActivityEntity);
  }

  async addActivity(
    actor: AuditActor,
    opportunityId: string,
    input: CreateActivityInput,
  ): Promise<OpportunityActivityEntity> {
    const opp = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
    });
    if (!opp || opp.companyId !== actor.companyId) {
      throw new NotFoundException('Oportunidade não encontrada.');
    }
    const created = await this.prisma.opportunityActivity.create({
      data: {
        opportunityId,
        type: input.type,
        title: input.title.trim(),
        description: input.description ?? null,
        dueDate: input.dueDate ?? null,
        assignedToUserId: input.assignedToUserId ?? actor.userId,
      },
    });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'OpportunityActivity',
      entityId: created.id,
      action: AuditAction.CREATE,
      after: created,
    });
    return toActivityEntity(created);
  }

  async updateActivity(
    actor: AuditActor,
    id: string,
    input: UpdateActivityInput,
  ): Promise<OpportunityActivityEntity> {
    const existing = await this.prisma.opportunityActivity.findUnique({
      where: { id },
      include: { opportunity: true },
    });
    if (!existing || existing.opportunity.companyId !== actor.companyId) {
      throw new NotFoundException('Atividade não encontrada.');
    }

    const completing =
      input.status === OpportunityActivityStatus.COMPLETED &&
      existing.status !== OpportunityActivityStatus.COMPLETED;

    const updated = await this.prisma.opportunityActivity.update({
      where: { id },
      data: {
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        ...(input.assignedToUserId !== undefined
          ? { assignedToUserId: input.assignedToUserId }
          : {}),
        ...(completing ? { completedAt: new Date() } : {}),
      },
    });
    const { opportunity: _opportunity, ...beforeSnap } = existing;
    void _opportunity;
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'OpportunityActivity',
      entityId: id,
      action: AuditAction.UPDATE,
      before: beforeSnap,
      after: updated,
    });
    return toActivityEntity(updated);
  }

  async removeActivity(actor: AuditActor, id: string): Promise<boolean> {
    const existing = await this.prisma.opportunityActivity.findUnique({
      where: { id },
      include: { opportunity: true },
    });
    if (!existing || existing.opportunity.companyId !== actor.companyId) {
      throw new NotFoundException('Atividade não encontrada.');
    }
    await this.prisma.opportunityActivity.delete({ where: { id } });
    const { opportunity: _opportunity, ...beforeSnap } = existing;
    void _opportunity;
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'OpportunityActivity',
      entityId: id,
      action: AuditAction.DELETE,
      before: beforeSnap,
    });
    return true;
  }
}
