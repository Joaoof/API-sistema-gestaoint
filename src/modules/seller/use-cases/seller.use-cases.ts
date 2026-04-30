import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
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

@Injectable()
export class SellerUseCases {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(input: CreateSellerInput): Promise<SellerEntity> {
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
    return toEntity(seller);
  }

  async update(id: string, input: UpdateSellerInput): Promise<SellerEntity> {
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
    return toEntity(updated);
  }

  async remove(id: string): Promise<boolean> {
    const inUse = await this.prisma.order.findFirst({
      where: { sellerId: id },
      select: { id: true },
    });
    if (inUse) {
      // Não exclui fisicamente — apenas inativa para preservar histórico
      await this.prisma.seller.update({ where: { id }, data: { active: false } });
      return true;
    }
    await this.prisma.seller.delete({ where: { id } });
    return true;
  }
}
