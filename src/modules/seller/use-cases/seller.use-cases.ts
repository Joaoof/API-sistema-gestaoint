import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditLogService } from '../../audit/use-cases/audit-log.service';
import { AuditActor } from '../../audit/types/actor';
import { CreateSellerInput, UpdateSellerInput } from '../dto/create-seller.input';
import { SellerEntity } from '../entities/seller.entity';

type RawSeller = Prisma.SellerGetPayload<{}>;

function toEntity(raw: RawSeller): SellerEntity {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    document: raw.document,
    commissionPercent: Number(raw.commissionPercent),
    active: raw.active,
    totalCommission: Number(raw.totalCommission),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function snapshot(raw: RawSeller): Record<string, unknown> {
  return {
    ...raw,
    commissionPercent: Number(raw.commissionPercent),
    totalCommission: Number(raw.totalCommission),
  };
}

@Injectable()
export class SellerUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(args: { search?: string; activeOnly?: boolean } = {}): Promise<SellerEntity[]> {
    const sellers = await this.prisma.seller.findMany({
      where: {
        ...(args.activeOnly ? { active: true } : {}),
        ...(args.search
          ? {
              OR: [
                { name: { contains: args.search, mode: 'insensitive' } },
                { email: { contains: args.search, mode: 'insensitive' } },
                { document: { contains: args.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 200,
    });
    return sellers.map(toEntity);
  }

  async findById(id: string): Promise<SellerEntity> {
    const seller = await this.prisma.seller.findUnique({ where: { id } });
    if (!seller) throw new NotFoundException('Vendedor não encontrado.');
    return toEntity(seller);
  }

  async create(actor: AuditActor, input: CreateSellerInput): Promise<SellerEntity> {
    if (input.email) {
      const exists = await this.prisma.seller.findUnique({ where: { email: input.email } });
      if (exists) throw new BadRequestException('Já existe um vendedor com este e-mail.');
    }
    const seller = await this.prisma.seller.create({
      data: {
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        document: input.document ?? null,
        commissionPercent: input.commissionPercent,
        active: input.active,
      },
    });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Seller',
      entityId: seller.id,
      action: AuditAction.CREATE,
      after: snapshot(seller),
    });
    return toEntity(seller);
  }

  async update(actor: AuditActor, id: string, input: UpdateSellerInput): Promise<SellerEntity> {
    const existing = await this.prisma.seller.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vendedor não encontrado.');

    if (input.email && input.email !== existing.email) {
      const taken = await this.prisma.seller.findFirst({
        where: { email: input.email, NOT: { id } },
        select: { id: true },
      });
      if (taken) throw new BadRequestException('Já existe um vendedor com este e-mail.');
    }

    const updated = await this.prisma.seller.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.document !== undefined ? { document: input.document } : {}),
        ...(input.commissionPercent !== undefined
          ? { commissionPercent: input.commissionPercent }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Seller',
      entityId: id,
      action: AuditAction.UPDATE,
      before: snapshot(existing),
      after: snapshot(updated),
    });
    return toEntity(updated);
  }

  async remove(actor: AuditActor, id: string): Promise<boolean> {
    const existing = await this.prisma.seller.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vendedor não encontrado.');

    const inUse = await this.prisma.order.findFirst({
      where: { sellerId: id },
      select: { id: true },
    });
    if (inUse) {
      const updated = await this.prisma.seller.update({ where: { id }, data: { active: false } });
      await this.audit.log({
        companyId: actor.companyId,
        userId: actor.userId,
        entity: 'Seller',
        entityId: id,
        action: AuditAction.SOFT_DELETE,
        before: snapshot(existing),
        after: snapshot(updated),
        reason: 'Vendedor com pedidos vinculados; inativado em vez de excluído.',
      });
      return true;
    }
    await this.prisma.seller.delete({ where: { id } });
    await this.audit.log({
      companyId: actor.companyId,
      userId: actor.userId,
      entity: 'Seller',
      entityId: id,
      action: AuditAction.DELETE,
      before: snapshot(existing),
    });
    return true;
  }
}
