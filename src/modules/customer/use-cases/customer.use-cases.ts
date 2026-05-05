import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import { CreateCustomerInput } from '../dto/create-customer.input';
import { CustomerEntity } from '../entities/customer.entity';

@Injectable()
export class CustomerUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async create(actor: AuditActor, input: CreateCustomerInput): Promise<CustomerEntity> {
    const customer = await this.prisma.customer.create({
      data: {
        name: input.name,
        nomeFantasia: input.nomeFantasia ?? null,
        razaoSocial: input.razaoSocial ?? null,
        document: input.document ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        bairro: input.bairro ?? null,
        cidade: input.cidade ?? null,
        estado: input.estado ?? null,
        cep: input.cep ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      },
    });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Customer',
      entityId: customer.id,
      action: AuditAction.CREATE,
      after: customer,
    });
    return customer as unknown as CustomerEntity;
  }

  async update(actor: AuditActor, id: string, input: Partial<CreateCustomerInput>): Promise<CustomerEntity> {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Cliente não encontrado.');

    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.nomeFantasia !== undefined ? { nomeFantasia: input.nomeFantasia } : {}),
        ...(input.razaoSocial !== undefined ? { razaoSocial: input.razaoSocial } : {}),
        ...(input.document !== undefined ? { document: input.document } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.bairro !== undefined ? { bairro: input.bairro } : {}),
        ...(input.cidade !== undefined ? { cidade: input.cidade } : {}),
        ...(input.estado !== undefined ? { estado: input.estado } : {}),
        ...(input.cep !== undefined ? { cep: input.cep } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      },
    });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Customer',
      entityId: id,
      action: AuditAction.UPDATE,
      before: existing,
      after: customer,
    });
    return customer as unknown as CustomerEntity;
  }

  async list(search?: string): Promise<CustomerEntity[]> {
    const customers = await this.prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { document: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
      take: 200,
    });
    return customers as unknown as CustomerEntity[];
  }

  async findById(id: string): Promise<CustomerEntity> {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Cliente não encontrado.');
    return customer as unknown as CustomerEntity;
  }
}
