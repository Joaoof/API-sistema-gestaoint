import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, ObraStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { AuditLogService } from '../../shared/audit-log.service';
import {
  CreateEtapaInput,
  CreateItemWbsInput,
  CreateObraInput,
  CreateSubetapaInput,
  UpdateObraInput,
} from '../dto/obra.input';
import {
  ObraEntity,
  ObraEtapaEntity,
  ObraItemWBSEntity,
  ObraSubetapaEntity,
} from '../entities/obra.entity';

type ObraWithTree = Prisma.ObraGetPayload<{
  include: {
    etapas: {
      include: { subetapas: { include: { itens: true } }; itens: true };
    };
  };
}>;

function mapItem(i: any): ObraItemWBSEntity {
  return {
    id: i.id,
    etapaId: i.etapaId,
    subetapaId: i.subetapaId,
    codigo: i.codigo,
    nome: i.nome,
    unidade: i.unidade,
    quantidadeRef: i.quantidadeRef !== null && i.quantidadeRef !== undefined ? Number(i.quantidadeRef) : null,
    ordem: i.ordem,
    descricao: i.descricao,
  };
}

function mapSubetapa(s: any): ObraSubetapaEntity {
  return {
    id: s.id,
    etapaId: s.etapaId,
    codigo: s.codigo,
    nome: s.nome,
    ordem: s.ordem,
    descricao: s.descricao,
    itens: (s.itens ?? []).map(mapItem),
  };
}

function mapEtapa(e: any): ObraEtapaEntity {
  return {
    id: e.id,
    obraId: e.obraId,
    codigo: e.codigo,
    nome: e.nome,
    ordem: e.ordem,
    descricao: e.descricao,
    subetapas: (e.subetapas ?? []).map(mapSubetapa),
    itens: (e.itens ?? []).filter((i: any) => !i.subetapaId).map(mapItem),
  };
}

function toEntity(o: ObraWithTree): ObraEntity {
  return {
    id: o.id,
    companyId: o.companyId,
    customerId: o.customerId,
    codigo: o.codigo,
    nome: o.nome,
    descricao: o.descricao,
    endereco: o.endereco,
    cidade: o.cidade,
    estado: o.estado,
    cep: o.cep,
    latitude: o.latitude,
    longitude: o.longitude,
    status: o.status,
    dataInicio: o.dataInicio,
    dataFimPrev: o.dataFimPrev,
    dataFimReal: o.dataFimReal,
    valorContrato: o.valorContrato !== null ? Number(o.valorContrato) : null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    etapas: (o.etapas ?? []).map(mapEtapa),
  };
}

@Injectable()
export class ObraUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(args: {
    companyId: string;
    search?: string;
    status?: ObraStatus;
    customerId?: string;
    take?: number;
  }): Promise<ObraEntity[]> {
    const obras = await this.prisma.obra.findMany({
      where: {
        companyId: args.companyId,
        deletedAt: null,
        ...(args.status ? { status: args.status } : {}),
        ...(args.customerId ? { customerId: args.customerId } : {}),
        ...(args.search
          ? {
              OR: [
                { nome: { contains: args.search, mode: 'insensitive' } },
                { codigo: { contains: args.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        etapas: {
          where: { deletedAt: null },
          orderBy: { ordem: 'asc' },
          include: {
            subetapas: {
              where: { deletedAt: null },
              orderBy: { ordem: 'asc' },
              include: { itens: { where: { deletedAt: null }, orderBy: { ordem: 'asc' } } },
            },
            itens: { where: { deletedAt: null }, orderBy: { ordem: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(args.take ?? 50, 200),
    });
    return obras.map(toEntity);
  }

  async findById(companyId: string, id: string): Promise<ObraEntity> {
    const obra = await this.prisma.obra.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        etapas: {
          where: { deletedAt: null },
          orderBy: { ordem: 'asc' },
          include: {
            subetapas: {
              where: { deletedAt: null },
              orderBy: { ordem: 'asc' },
              include: { itens: { where: { deletedAt: null }, orderBy: { ordem: 'asc' } } },
            },
            itens: { where: { deletedAt: null }, orderBy: { ordem: 'asc' } },
          },
        },
      },
    });
    if (!obra) throw new NotFoundException('Obra não encontrada.');
    return toEntity(obra);
  }

  async create(
    companyId: string,
    userId: string | undefined,
    input: CreateObraInput,
  ): Promise<ObraEntity> {
    if (input.customerId) {
      const c = await this.prisma.customer.findUnique({ where: { id: input.customerId } });
      if (!c) throw new BadRequestException('Cliente não encontrado.');
    }
    const obra = await this.prisma.$transaction(async (tx) => {
      const created = await tx.obra.create({
        data: {
          companyId,
          customerId: input.customerId ?? null,
          codigo: input.codigo,
          nome: input.nome,
          descricao: input.descricao ?? null,
          endereco: input.endereco ?? null,
          cidade: input.cidade ?? null,
          estado: input.estado ?? null,
          cep: input.cep ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          status: input.status,
          dataInicio: input.dataInicio ?? null,
          dataFimPrev: input.dataFimPrev ?? null,
          valorContrato: input.valorContrato ?? null,
        },
      });
      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'Obra',
          entityId: created.id,
          action: AuditAction.CREATE,
          after: created,
        },
        tx,
      );
      return created;
    });
    return this.findById(companyId, obra.id);
  }

  async update(
    companyId: string,
    userId: string | undefined,
    id: string,
    input: UpdateObraInput,
  ): Promise<ObraEntity> {
    const before = await this.prisma.obra.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!before) throw new NotFoundException('Obra não encontrada.');

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.obra.update({
        where: { id },
        data: { ...input },
      });
      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'Obra',
          entityId: id,
          action: AuditAction.UPDATE,
          before,
          after: updated,
        },
        tx,
      );
    });
    return this.findById(companyId, id);
  }

  async softDelete(
    companyId: string,
    userId: string | undefined,
    id: string,
    reason?: string,
  ): Promise<boolean> {
    const before = await this.prisma.obra.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!before) throw new NotFoundException('Obra não encontrada.');

    const transacoesAtivas = await this.prisma.transacaoFinanceira.count({
      where: { obraId: id, status: { in: ['CONFIRMADO', 'PENDENTE'] }, deletedAt: null },
    });
    if (transacoesAtivas > 0) {
      throw new BadRequestException(
        `Obra possui ${transacoesAtivas} transação(ões) ativa(s). Estorne/cancele antes de excluir.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.obra.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'Obra',
          entityId: id,
          action: AuditAction.SOFT_DELETE,
          before,
          reason: reason ?? null,
        },
        tx,
      );
    });
    return true;
  }

  async createEtapa(
    companyId: string,
    userId: string | undefined,
    input: CreateEtapaInput,
  ): Promise<ObraEtapaEntity> {
    const obra = await this.prisma.obra.findFirst({
      where: { id: input.obraId, companyId, deletedAt: null },
    });
    if (!obra) throw new NotFoundException('Obra não encontrada.');

    const etapa = await this.prisma.$transaction(async (tx) => {
      const e = await tx.obraEtapa.create({
        data: {
          obraId: input.obraId,
          codigo: input.codigo,
          nome: input.nome,
          ordem: input.ordem,
          descricao: input.descricao ?? null,
        },
      });
      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'ObraEtapa',
          entityId: e.id,
          action: AuditAction.CREATE,
          after: e,
        },
        tx,
      );
      return e;
    });
    return mapEtapa(etapa);
  }

  async createSubetapa(
    companyId: string,
    userId: string | undefined,
    input: CreateSubetapaInput,
  ): Promise<ObraSubetapaEntity> {
    const etapa = await this.prisma.obraEtapa.findFirst({
      where: { id: input.etapaId, deletedAt: null, obra: { companyId } },
    });
    if (!etapa) throw new NotFoundException('Etapa não encontrada.');

    const sub = await this.prisma.$transaction(async (tx) => {
      const s = await tx.obraSubetapa.create({
        data: {
          etapaId: input.etapaId,
          codigo: input.codigo,
          nome: input.nome,
          ordem: input.ordem,
          descricao: input.descricao ?? null,
        },
      });
      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'ObraSubetapa',
          entityId: s.id,
          action: AuditAction.CREATE,
          after: s,
        },
        tx,
      );
      return s;
    });
    return mapSubetapa(sub);
  }

  async createItemWbs(
    companyId: string,
    userId: string | undefined,
    input: CreateItemWbsInput,
  ): Promise<ObraItemWBSEntity> {
    const etapa = await this.prisma.obraEtapa.findFirst({
      where: { id: input.etapaId, deletedAt: null, obra: { companyId } },
    });
    if (!etapa) throw new NotFoundException('Etapa não encontrada.');

    if (input.subetapaId) {
      const sub = await this.prisma.obraSubetapa.findFirst({
        where: { id: input.subetapaId, etapaId: input.etapaId, deletedAt: null },
      });
      if (!sub) throw new BadRequestException('Subetapa não pertence à etapa.');
    }

    const item = await this.prisma.$transaction(async (tx) => {
      const it = await tx.obraItemWBS.create({
        data: {
          etapaId: input.etapaId,
          subetapaId: input.subetapaId ?? null,
          codigo: input.codigo,
          nome: input.nome,
          unidade: input.unidade,
          quantidadeRef: input.quantidadeRef ?? null,
          ordem: input.ordem,
          descricao: input.descricao ?? null,
        },
      });
      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'ObraItemWBS',
          entityId: it.id,
          action: AuditAction.CREATE,
          after: it,
        },
        tx,
      );
      return it;
    });
    return mapItem(item);
  }
}
