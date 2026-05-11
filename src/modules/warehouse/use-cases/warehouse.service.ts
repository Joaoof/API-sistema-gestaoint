import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

interface ActorContext {
  userId: string;
  companyId: string;
}

@Injectable()
export class WarehouseService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string, activeOnly = false) {
    return this.prisma.warehouse.findMany({
      where: { companyId, ...(activeOnly ? { active: true } : {}) },
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    });
  }

  async findMain(companyId: string) {
    const main = await this.prisma.warehouse.findFirst({
      where: { companyId, isMain: true, active: true },
    });
    if (!main) {
      // Fallback: pega o primeiro ativo da empresa
      const any = await this.prisma.warehouse.findFirst({
        where: { companyId, active: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!any) {
        throw new NotFoundException(
          'Empresa não tem depósito ativo. Crie um pelo menu Depósitos.',
        );
      }
      return any;
    }
    return main;
  }

  async create(
    actor: ActorContext,
    input: { name: string; code?: string | null; address?: string | null; isMain?: boolean },
  ) {
    if (!input.name?.trim()) {
      throw new BadRequestException('Nome do depósito é obrigatório.');
    }
    // Se está marcando como main, desmarca os outros
    return this.prisma.$transaction(async (tx) => {
      if (input.isMain) {
        await tx.warehouse.updateMany({
          where: { companyId: actor.companyId, isMain: true },
          data: { isMain: false },
        });
      }
      return tx.warehouse.create({
        data: {
          companyId: actor.companyId,
          name: input.name.trim(),
          code: input.code ?? null,
          address: input.address ?? null,
          isMain: input.isMain ?? false,
        },
      });
    });
  }

  async update(
    actor: ActorContext,
    id: string,
    input: { name?: string; code?: string | null; address?: string | null; isMain?: boolean; active?: boolean },
  ) {
    const existing = await this.prisma.warehouse.findFirst({
      where: { id, companyId: actor.companyId },
    });
    if (!existing) throw new NotFoundException('Depósito não encontrado.');

    return this.prisma.$transaction(async (tx) => {
      if (input.isMain === true && !existing.isMain) {
        await tx.warehouse.updateMany({
          where: { companyId: actor.companyId, isMain: true },
          data: { isMain: false },
        });
      }
      return tx.warehouse.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name.trim() }),
          ...(input.code !== undefined && { code: input.code }),
          ...(input.address !== undefined && { address: input.address }),
          ...(input.isMain !== undefined && { isMain: input.isMain }),
          ...(input.active !== undefined && { active: input.active }),
        },
      });
    });
  }

  async deactivate(actor: ActorContext, id: string) {
    const existing = await this.prisma.warehouse.findFirst({
      where: { id, companyId: actor.companyId },
    });
    if (!existing) throw new NotFoundException('Depósito não encontrado.');
    if (existing.isMain) {
      throw new BadRequestException(
        'Não dá pra desativar o depósito principal. Marque outro como principal antes.',
      );
    }
    return this.prisma.warehouse.update({
      where: { id },
      data: { active: false },
    });
  }
}
