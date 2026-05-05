import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  ContractEventType,
  ContractStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import {
  ContractFilterInput,
  CreateContractInput,
  CreateServiceLevelEventInput,
  CreateServiceLevelInput,
  UpdateContractInput,
  UpdateServiceLevelInput,
} from '../dto/contract.input';
import {
  ContractEntity,
  ContractEventEntity,
  ServiceLevelEntity,
  ServiceLevelEventEntity,
} from '../entities/contract.entity';

type RawContract = Prisma.ContractGetPayload<{}>;
type RawContractWithRelations = Prisma.ContractGetPayload<{
  include: { serviceLevels: true; events: true };
}>;
type RawServiceLevel = Prisma.ServiceLevelGetPayload<{}>;
type RawServiceLevelEvent = Prisma.ServiceLevelEventGetPayload<{}>;
type RawContractEvent = Prisma.ContractEventGetPayload<{}>;

function toEntity(raw: RawContract): ContractEntity {
  return {
    id: raw.id,
    companyId: raw.companyId,
    customerId: raw.customerId,
    number: raw.number,
    title: raw.title,
    status: raw.status,
    startDate: raw.startDate,
    endDate: raw.endDate,
    value: Number(raw.value),
    billingCycle: raw.billingCycle,
    autoRenew: raw.autoRenew,
    sellerId: raw.sellerId,
    description: raw.description,
    terms: raw.terms,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function toServiceLevelEntity(raw: RawServiceLevel): ServiceLevelEntity {
  return {
    id: raw.id,
    contractId: raw.contractId,
    kind: raw.kind,
    name: raw.name,
    description: raw.description,
    targetValue: Number(raw.targetValue),
    unit: raw.unit,
    penaltyPercent: Number(raw.penaltyPercent),
    active: raw.active,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function toServiceLevelEventEntity(
  raw: RawServiceLevelEvent,
): ServiceLevelEventEntity {
  return {
    id: raw.id,
    serviceLevelId: raw.serviceLevelId,
    occurredAt: raw.occurredAt,
    measuredValue: Number(raw.measuredValue),
    met: raw.met,
    notes: raw.notes,
    createdById: raw.createdById,
    createdAt: raw.createdAt,
  };
}

function toContractEventEntity(raw: RawContractEvent): ContractEventEntity {
  return {
    id: raw.id,
    contractId: raw.contractId,
    type: raw.type,
    occurredAt: raw.occurredAt,
    notes: raw.notes,
    createdById: raw.createdById,
    createdAt: raw.createdAt,
  };
}

function contractSnapshot(raw: RawContract): Record<string, unknown> {
  return { ...raw, value: Number(raw.value) };
}

function serviceLevelSnapshot(
  raw: RawServiceLevel,
): Record<string, unknown> {
  return {
    ...raw,
    targetValue: Number(raw.targetValue),
    penaltyPercent: Number(raw.penaltyPercent),
  };
}

function serviceLevelEventSnapshot(
  raw: RawServiceLevelEvent,
): Record<string, unknown> {
  return { ...raw, measuredValue: Number(raw.measuredValue) };
}

@Injectable()
export class ContractUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  private async requireContract(
    companyId: string,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<RawContract> {
    const client = tx ?? this.prisma;
    const contract = await client.contract.findUnique({ where: { id } });
    if (!contract || contract.companyId !== companyId) {
      throw new NotFoundException('Contrato não encontrado.');
    }
    return contract;
  }

  private async requireServiceLevel(
    companyId: string,
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ serviceLevel: RawServiceLevel; contract: RawContract }> {
    const client = tx ?? this.prisma;
    const serviceLevel = await client.serviceLevel.findUnique({
      where: { id },
      include: { contract: true },
    });
    if (!serviceLevel || serviceLevel.contract.companyId !== companyId) {
      throw new NotFoundException('Nível de serviço não encontrado.');
    }
    const { contract, ...rest } = serviceLevel;
    return { serviceLevel: rest as RawServiceLevel, contract };
  }

  private buildWhere(
    companyId: string,
    filter: ContractFilterInput = {},
  ): Prisma.ContractWhereInput {
    const activeStatuses: ContractStatus[] = [
      ContractStatus.ACTIVE,
      ContractStatus.DRAFT,
      ContractStatus.SUSPENDED,
    ];
    return {
      companyId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.customerId ? { customerId: filter.customerId } : {}),
      ...(filter.activeOnly ? { status: { in: activeStatuses } } : {}),
      ...(filter.search
        ? {
            OR: [
              { number: { contains: filter.search, mode: 'insensitive' } },
              { title: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  async list(
    companyId: string,
    filter: ContractFilterInput = {},
  ): Promise<ContractEntity[]> {
    const rows = await this.prisma.contract.findMany({
      where: this.buildWhere(companyId, filter),
      orderBy: [{ status: 'asc' }, { endDate: 'asc' }],
      take: 500,
    });
    return rows.map(toEntity);
  }

  async findById(companyId: string, id: string): Promise<ContractEntity> {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        serviceLevels: { orderBy: { createdAt: 'asc' } },
        events: { orderBy: { occurredAt: 'desc' }, take: 20 },
      },
    });
    if (!contract || contract.companyId !== companyId) {
      throw new NotFoundException('Contrato não encontrado.');
    }
    const full = contract as RawContractWithRelations;
    const entity = toEntity(full);
    entity.serviceLevels = full.serviceLevels.map(toServiceLevelEntity);
    return entity;
  }

  async create(
    actor: AuditActor,
    input: CreateContractInput,
  ): Promise<ContractEntity> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: input.customerId },
    });
    if (!customer) {
      throw new BadRequestException('Cliente inválido.');
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const contract = await tx.contract.create({
          data: {
            companyId: actor.companyId,
            customerId: input.customerId,
            number: input.number.trim(),
            title: input.title.trim(),
            status: input.status,
            startDate: input.startDate ?? null,
            endDate: input.endDate ?? null,
            value: input.value,
            billingCycle: input.billingCycle,
            autoRenew: input.autoRenew,
            sellerId: input.sellerId ?? null,
            description: input.description ?? null,
            terms: input.terms ?? null,
          },
        });

        await tx.contractEvent.create({
          data: {
            contractId: contract.id,
            type: ContractEventType.CREATED,
            createdById: actor.userId,
          },
        });

        await this.audit.log(
          {
            companyId: actor.companyId,
            userId: actor.userId,
            entity: 'Contract',
            entityId: contract.id,
            action: AuditAction.CREATE,
            after: contractSnapshot(contract),
          },
          tx,
        );

        return contract;
      });

      return toEntity(created);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe um contrato com esse número nesta empresa.',
        );
      }
      throw err;
    }
  }

  async update(
    actor: AuditActor,
    id: string,
    input: UpdateContractInput,
  ): Promise<ContractEntity> {
    const existing = await this.requireContract(actor.companyId, id);

    try {
      const updated = await this.prisma.contract.update({
        where: { id },
        data: {
          ...(input.number !== undefined ? { number: input.number.trim() } : {}),
          ...(input.title !== undefined ? { title: input.title.trim() } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.startDate !== undefined
            ? { startDate: input.startDate }
            : {}),
          ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
          ...(input.value !== undefined ? { value: input.value } : {}),
          ...(input.billingCycle !== undefined
            ? { billingCycle: input.billingCycle }
            : {}),
          ...(input.autoRenew !== undefined
            ? { autoRenew: input.autoRenew }
            : {}),
          ...(input.sellerId !== undefined
            ? { sellerId: input.sellerId }
            : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.terms !== undefined ? { terms: input.terms } : {}),
        },
      });

      await this.audit.log({
        companyId: actor.companyId,
        userId: actor.userId,
        entity: 'Contract',
        entityId: id,
        action: AuditAction.UPDATE,
        before: contractSnapshot(existing),
        after: contractSnapshot(updated),
      });

      return toEntity(updated);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe um contrato com esse número nesta empresa.',
        );
      }
      throw err;
    }
  }

  private async transitionStatus(
    actor: AuditActor,
    id: string,
    nextStatus: ContractStatus,
    eventType: ContractEventType,
    allowedFrom: ContractStatus[] | null,
    reason?: string | null,
  ): Promise<ContractEntity> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await this.requireContract(actor.companyId, id, tx);
      if (allowedFrom && !allowedFrom.includes(existing.status)) {
        throw new BadRequestException(
          `Transição de status inválida a partir de ${existing.status}.`,
        );
      }

      const next = await tx.contract.update({
        where: { id },
        data: { status: nextStatus },
      });

      await tx.contractEvent.create({
        data: {
          contractId: id,
          type: eventType,
          notes: reason ?? null,
          createdById: actor.userId,
        },
      });

      await this.audit.log(
        {
          companyId: actor.companyId,
          userId: actor.userId,
          entity: 'Contract',
          entityId: id,
          action: AuditAction.UPDATE,
          before: contractSnapshot(existing),
          after: contractSnapshot(next),
          reason: reason ?? null,
        },
        tx,
      );

      return next;
    });

    return toEntity(updated);
  }

  async activate(actor: AuditActor, id: string): Promise<ContractEntity> {
    return this.transitionStatus(
      actor,
      id,
      ContractStatus.ACTIVE,
      ContractEventType.ACTIVATED,
      [ContractStatus.DRAFT, ContractStatus.SUSPENDED],
    );
  }

  async suspend(
    actor: AuditActor,
    id: string,
    reason?: string | null,
  ): Promise<ContractEntity> {
    return this.transitionStatus(
      actor,
      id,
      ContractStatus.SUSPENDED,
      ContractEventType.SUSPENDED,
      [ContractStatus.ACTIVE],
      reason ?? null,
    );
  }

  async resume(actor: AuditActor, id: string): Promise<ContractEntity> {
    return this.transitionStatus(
      actor,
      id,
      ContractStatus.ACTIVE,
      ContractEventType.RESUMED,
      [ContractStatus.SUSPENDED],
    );
  }

  async terminate(
    actor: AuditActor,
    id: string,
    reason?: string | null,
  ): Promise<ContractEntity> {
    return this.transitionStatus(
      actor,
      id,
      ContractStatus.TERMINATED,
      ContractEventType.TERMINATED,
      null,
      reason ?? null,
    );
  }

  async renew(
    actor: AuditActor,
    id: string,
    newEndDate: Date,
  ): Promise<ContractEntity> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await this.requireContract(actor.companyId, id, tx);

      const nextStatus =
        existing.status === ContractStatus.EXPIRED ||
        existing.status === ContractStatus.TERMINATED
          ? ContractStatus.ACTIVE
          : existing.status;

      const next = await tx.contract.update({
        where: { id },
        data: {
          endDate: newEndDate,
          status: nextStatus,
        },
      });

      await tx.contractEvent.create({
        data: {
          contractId: id,
          type: ContractEventType.RENEWED,
          createdById: actor.userId,
          notes: `Nova validade: ${newEndDate.toISOString()}`,
        },
      });

      await this.audit.log(
        {
          companyId: actor.companyId,
          userId: actor.userId,
          entity: 'Contract',
          entityId: id,
          action: AuditAction.UPDATE,
          before: contractSnapshot(existing),
          after: contractSnapshot(next),
        },
        tx,
      );

      return next;
    });

    return toEntity(updated);
  }

  async remove(actor: AuditActor, id: string): Promise<boolean> {
    const existing = await this.requireContract(actor.companyId, id);
    if (existing.status !== ContractStatus.DRAFT) {
      throw new BadRequestException(
        'Apenas contratos em rascunho podem ser excluídos.',
      );
    }
    await this.prisma.contract.delete({ where: { id } });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Contract',
      entityId: id,
      action: AuditAction.DELETE,
      before: contractSnapshot(existing),
    });
    return true;
  }

  // Service Levels
  async addServiceLevel(
    actor: AuditActor,
    contractId: string,
    input: CreateServiceLevelInput,
  ): Promise<ServiceLevelEntity> {
    await this.requireContract(actor.companyId, contractId);
    const created = await this.prisma.serviceLevel.create({
      data: {
        contractId,
        kind: input.kind,
        name: input.name.trim(),
        description: input.description ?? null,
        targetValue: input.targetValue,
        unit: input.unit.trim(),
        penaltyPercent: input.penaltyPercent,
        active: input.active,
      },
    });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'ServiceLevel',
      entityId: created.id,
      action: AuditAction.CREATE,
      after: serviceLevelSnapshot(created),
    });
    return toServiceLevelEntity(created);
  }

  async updateServiceLevel(
    actor: AuditActor,
    id: string,
    input: UpdateServiceLevelInput,
  ): Promise<ServiceLevelEntity> {
    const { serviceLevel: existing } = await this.requireServiceLevel(
      actor.companyId,
      id,
    );
    const updated = await this.prisma.serviceLevel.update({
      where: { id },
      data: {
        ...(input.kind !== undefined ? { kind: input.kind } : {}),
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.targetValue !== undefined
          ? { targetValue: input.targetValue }
          : {}),
        ...(input.unit !== undefined ? { unit: input.unit.trim() } : {}),
        ...(input.penaltyPercent !== undefined
          ? { penaltyPercent: input.penaltyPercent }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'ServiceLevel',
      entityId: id,
      action: AuditAction.UPDATE,
      before: serviceLevelSnapshot(existing),
      after: serviceLevelSnapshot(updated),
    });
    return toServiceLevelEntity(updated);
  }

  async removeServiceLevel(
    actor: AuditActor,
    id: string,
  ): Promise<boolean> {
    const { serviceLevel: existing } = await this.requireServiceLevel(
      actor.companyId,
      id,
    );
    await this.prisma.serviceLevel.delete({ where: { id } });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'ServiceLevel',
      entityId: id,
      action: AuditAction.DELETE,
      before: serviceLevelSnapshot(existing),
    });
    return true;
  }

  // Service Level Events
  async recordServiceLevelEvent(
    actor: AuditActor,
    serviceLevelId: string,
    input: CreateServiceLevelEventInput,
  ): Promise<ServiceLevelEventEntity> {
    const created = await this.prisma.$transaction(async (tx) => {
      const { serviceLevel, contract } = await this.requireServiceLevel(
        actor.companyId,
        serviceLevelId,
        tx,
      );

      const event = await tx.serviceLevelEvent.create({
        data: {
          serviceLevelId: serviceLevel.id,
          measuredValue: input.measuredValue,
          met: input.met,
          notes: input.notes ?? null,
          createdById: actor.userId,
        },
      });

      await this.audit.log(
        {
          companyId: actor.companyId,
          userId: actor.userId,
          entity: 'ServiceLevelEvent',
          entityId: event.id,
          action: AuditAction.CREATE,
          after: serviceLevelEventSnapshot(event),
        },
        tx,
      );

      if (!input.met) {
        const breach = await tx.contractEvent.create({
          data: {
            contractId: contract.id,
            type: ContractEventType.BREACH_REGISTERED,
            createdById: actor.userId,
            notes: `Quebra de SLA "${serviceLevel.name}". Valor medido: ${Number(
              input.measuredValue,
            )} ${serviceLevel.unit}.`,
          },
        });
        await this.audit.log(
          {
            companyId: actor.companyId,
            userId: actor.userId,
            entity: 'Contract',
            entityId: contract.id,
            action: AuditAction.UPDATE,
            after: { contractEventId: breach.id, breach: true },
            reason: 'Quebra de SLA registrada.',
          },
          tx,
        );
      }

      return event;
    });

    return toServiceLevelEventEntity(created);
  }

  async listServiceLevelEvents(
    companyId: string,
    serviceLevelId: string,
    limit = 100,
  ): Promise<ServiceLevelEventEntity[]> {
    await this.requireServiceLevel(companyId, serviceLevelId);
    const rows = await this.prisma.serviceLevelEvent.findMany({
      where: { serviceLevelId },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
    return rows.map(toServiceLevelEventEntity);
  }

  async listContractEvents(
    companyId: string,
    contractId: string,
    limit = 100,
  ): Promise<ContractEventEntity[]> {
    await this.requireContract(companyId, contractId);
    const rows = await this.prisma.contractEvent.findMany({
      where: { contractId },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
    return rows.map(toContractEventEntity);
  }
}
