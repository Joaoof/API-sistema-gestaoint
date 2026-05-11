import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import { CreateDriverInput, UpdateDriverInput } from '../dto/driver.input';
import { DriverEntity } from '../entities/driver.entity';

type RawDriver = Prisma.DriverGetPayload<{}>;

function toEntity(raw: RawDriver): DriverEntity {
  return {
    id: raw.id,
    name: raw.name,
    photoUrl: raw.photoUrl,
    cnh: raw.cnh,
    cnhCategory: raw.cnhCategory,
    phone: raw.phone,
    document: raw.document,
    vehicle: raw.vehicle,
    vehiclePlate: raw.vehiclePlate,
    active: raw.active,
    totalDeliveries: raw.totalDeliveries,
    notes: raw.notes,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

@Injectable()
export class DriverUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(
    companyId: string,
    args: { search?: string; activeOnly?: boolean } = {},
  ): Promise<DriverEntity[]> {
    const drivers = await this.prisma.driver.findMany({
      where: {
        companyId,
        ...(args.activeOnly ? { active: true } : {}),
        ...(args.search
          ? {
              OR: [
                { name: { contains: args.search, mode: 'insensitive' } },
                { cnh: { contains: args.search, mode: 'insensitive' } },
                { phone: { contains: args.search, mode: 'insensitive' } },
                { vehiclePlate: { contains: args.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 200,
    });
    return drivers.map(toEntity);
  }

  async findById(companyId: string, id: string): Promise<DriverEntity> {
    const driver = await this.prisma.driver.findFirst({ where: { id, companyId } });
    if (!driver) throw new NotFoundException('Motorista não encontrado.');
    return toEntity(driver);
  }

  async create(actor: AuditActor, input: CreateDriverInput): Promise<DriverEntity> {
    const driver = await this.prisma.driver.create({
      data: {
        companyId: actor.companyId,
        name: input.name,
        photoUrl: input.photoUrl ?? null,
        cnh: input.cnh ?? null,
        cnhCategory: input.cnhCategory ?? null,
        phone: input.phone ?? null,
        document: input.document ?? null,
        vehicle: input.vehicle ?? null,
        vehiclePlate: input.vehiclePlate ?? null,
        active: input.active,
        notes: input.notes ?? null,
      },
    });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Driver',
      entityId: driver.id,
      action: AuditAction.CREATE,
      after: driver,
    });
    return toEntity(driver);
  }

  async update(actor: AuditActor, id: string, input: UpdateDriverInput): Promise<DriverEntity> {
    const existing = await this.prisma.driver.findFirst({
      where: { id, companyId: actor.companyId },
    });
    if (!existing) throw new NotFoundException('Motorista não encontrado.');
    const driver = await this.prisma.driver.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl } : {}),
        ...(input.cnh !== undefined ? { cnh: input.cnh } : {}),
        ...(input.cnhCategory !== undefined ? { cnhCategory: input.cnhCategory } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.document !== undefined ? { document: input.document } : {}),
        ...(input.vehicle !== undefined ? { vehicle: input.vehicle } : {}),
        ...(input.vehiclePlate !== undefined ? { vehiclePlate: input.vehiclePlate } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Driver',
      entityId: id,
      action: AuditAction.UPDATE,
      before: existing,
      after: driver,
    });
    return toEntity(driver);
  }

  async remove(actor: AuditActor, id: string): Promise<boolean> {
    const existing = await this.prisma.driver.findFirst({
      where: { id, companyId: actor.companyId },
    });
    if (!existing) throw new NotFoundException('Motorista não encontrado.');

    const inUse = await this.prisma.delivery.findFirst({
      where: { driverId: id },
      select: { id: true },
    });
    if (inUse) {
      const updated = await this.prisma.driver.update({ where: { id }, data: { active: false } });
      await this.audit.log({
        companyId: actor.companyId,
        userId: actor.userId,
        entity: 'Driver',
        entityId: id,
        action: AuditAction.SOFT_DELETE,
        before: existing,
        after: updated,
        reason: 'Motorista com entregas vinculadas; inativado em vez de excluído.',
      });
      return true;
    }
    await this.prisma.driver.delete({ where: { id } });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Driver',
      entityId: id,
      action: AuditAction.DELETE,
      before: existing,
    });
    return true;
  }
}
