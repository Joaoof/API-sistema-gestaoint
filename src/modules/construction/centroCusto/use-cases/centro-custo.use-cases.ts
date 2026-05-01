import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { AuditLogService } from '../../shared/audit-log.service';
import {
  CreateCategoriaConstrucaoInput,
  CreateCentroCustoInput,
  UpdateCategoriaConstrucaoInput,
  UpdateCentroCustoInput,
} from '../dto/centro-custo.input';
import {
  CategoriaConstrucaoEntity,
  CentroCustoEntity,
} from '../entities/centro-custo.entity';

@Injectable()
export class CentroCustoUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(companyId: string): Promise<CentroCustoEntity[]> {
    const rows = await this.prisma.centroCusto.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { codigo: 'asc' },
    });
    return rows;
  }

  async findById(companyId: string, id: string): Promise<CentroCustoEntity> {
    const cc = await this.prisma.centroCusto.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!cc) throw new NotFoundException('Centro de custo não encontrado.');
    return cc;
  }

  async create(
    companyId: string,
    userId: string | undefined,
    input: CreateCentroCustoInput,
  ): Promise<CentroCustoEntity> {
    return this.prisma.$transaction(async (tx) => {
      const cc = await tx.centroCusto.create({
        data: { companyId, codigo: input.codigo, nome: input.nome, descricao: input.descricao ?? null },
      });
      await this.audit.log(
        { companyId, userId, entity: 'CentroCusto', entityId: cc.id, action: AuditAction.CREATE, after: cc },
        tx,
      );
      return cc;
    });
  }

  async update(
    companyId: string,
    userId: string | undefined,
    id: string,
    input: UpdateCentroCustoInput,
  ): Promise<CentroCustoEntity> {
    const before = await this.findById(companyId, id);
    return this.prisma.$transaction(async (tx) => {
      const cc = await tx.centroCusto.update({ where: { id }, data: { ...input } });
      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'CentroCusto',
          entityId: id,
          action: AuditAction.UPDATE,
          before,
          after: cc,
        },
        tx,
      );
      return cc;
    });
  }

  async softDelete(companyId: string, userId: string | undefined, id: string): Promise<boolean> {
    const before = await this.findById(companyId, id);
    const refs = await this.prisma.transacaoFinanceira.count({
      where: { centroCustoId: id, deletedAt: null },
    });
    if (refs > 0) {
      throw new BadRequestException(
        `Centro de custo possui ${refs} transação(ões). Inative em vez de excluir.`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.centroCusto.update({ where: { id }, data: { deletedAt: new Date(), ativo: false } });
      await this.audit.log(
        { companyId, userId, entity: 'CentroCusto', entityId: id, action: AuditAction.SOFT_DELETE, before },
        tx,
      );
    });
    return true;
  }

  async listCategorias(companyId: string): Promise<CategoriaConstrucaoEntity[]> {
    return this.prisma.categoriaConstrucao.findMany({
      where: { companyId, deletedAt: null },
      orderBy: [{ tipo: 'asc' }, { codigo: 'asc' }],
    });
  }

  async createCategoria(
    companyId: string,
    userId: string | undefined,
    input: CreateCategoriaConstrucaoInput,
  ): Promise<CategoriaConstrucaoEntity> {
    if (input.parentId) {
      const parent = await this.prisma.categoriaConstrucao.findFirst({
        where: { id: input.parentId, companyId, deletedAt: null },
      });
      if (!parent) throw new BadRequestException('Categoria pai não encontrada.');
    }
    return this.prisma.$transaction(async (tx) => {
      const cat = await tx.categoriaConstrucao.create({
        data: {
          companyId,
          parentId: input.parentId ?? null,
          codigo: input.codigo,
          nome: input.nome,
          tipo: input.tipo,
        },
      });
      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'CategoriaConstrucao',
          entityId: cat.id,
          action: AuditAction.CREATE,
          after: cat,
        },
        tx,
      );
      return cat;
    });
  }

  async updateCategoria(
    companyId: string,
    userId: string | undefined,
    id: string,
    input: UpdateCategoriaConstrucaoInput,
  ): Promise<CategoriaConstrucaoEntity> {
    const before = await this.prisma.categoriaConstrucao.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!before) throw new NotFoundException('Categoria não encontrada.');
    return this.prisma.$transaction(async (tx) => {
      const cat = await tx.categoriaConstrucao.update({ where: { id }, data: { ...input } });
      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'CategoriaConstrucao',
          entityId: id,
          action: AuditAction.UPDATE,
          before,
          after: cat,
        },
        tx,
      );
      return cat;
    });
  }
}
