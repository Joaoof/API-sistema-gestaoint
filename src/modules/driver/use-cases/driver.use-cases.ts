import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  async list(args: { search?: string; activeOnly?: boolean } = {}): Promise<DriverEntity[]> {
    const drivers = await this.prisma.driver.findMany({
      where: {
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

  async findById(id: string): Promise<DriverEntity> {
    const driver = await this.prisma.driver.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException('Motorista não encontrado.');
    return toEntity(driver);
  }

  async create(input: CreateDriverInput): Promise<DriverEntity> {
    const driver = await this.prisma.driver.create({
      data: {
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
    return toEntity(driver);
  }

  async update(id: string, input: UpdateDriverInput): Promise<DriverEntity> {
    const existing = await this.prisma.driver.findUnique({ where: { id } });
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
    return toEntity(driver);
  }

  async remove(id: string): Promise<boolean> {
    const inUse = await this.prisma.delivery.findFirst({
      where: { driverId: id },
      select: { id: true },
    });
    if (inUse) {
      // Soft-delete (inativa) se houver entregas vinculadas
      await this.prisma.driver.update({ where: { id }, data: { active: false } });
      return true;
    }
    await this.prisma.driver.delete({ where: { id } });
    return true;
  }
}
