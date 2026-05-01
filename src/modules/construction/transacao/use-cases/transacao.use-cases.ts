import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountStatus,
  AuditAction,
  Prisma,
  StatusTransacao,
  TipoTransacao,
} from '@prisma/client';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { AuditLogService } from '../../shared/audit-log.service';
import { TipoData } from '../../shared/enums.gql';
import {
  ConfirmarTransacaoInput,
  CreateTransacaoInput,
  EstornarTransacaoInput,
  ListTransacoesFilterInput,
} from '../dto/transacao.input';
import { TransacaoFinanceiraEntity } from '../entities/transacao.entity';

function toEntity(t: any): TransacaoFinanceiraEntity {
  return {
    id: t.id,
    companyId: t.companyId,
    obraId: t.obraId,
    etapaId: t.etapaId,
    subetapaId: t.subetapaId,
    itemWbsId: t.itemWbsId,
    centroCustoId: t.centroCustoId,
    categoriaId: t.categoriaId,
    supplierId: t.supplierId,
    accountPayableId: t.accountPayableId,
    accountReceivableId: t.accountReceivableId,
    estornoDeId: t.estornoDeId,
    tipo: t.tipo,
    status: t.status,
    valor: Number(t.valor),
    descricao: t.descricao,
    documento: t.documento,
    dataReal: t.dataReal,
    dataCompetencia: t.dataCompetencia,
    dataPrevistaPgto: t.dataPrevistaPgto,
    observacoes: t.observacoes,
    confirmadoEm: t.confirmadoEm,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

@Injectable()
export class TransacaoUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(
    companyId: string,
    filter: ListTransacoesFilterInput,
    take = 100,
  ): Promise<TransacaoFinanceiraEntity[]> {
    const dateField = filter.tipoData === TipoData.REAL ? 'dataReal' : 'dataCompetencia';
    const where: Prisma.TransacaoFinanceiraWhereInput = {
      companyId,
      deletedAt: null,
      ...(filter.obraId ? { obraId: filter.obraId } : {}),
      ...(filter.centroCustoId ? { centroCustoId: filter.centroCustoId } : {}),
      ...(filter.categoriaId ? { categoriaId: filter.categoriaId } : {}),
      ...(filter.tipo ? { tipo: filter.tipo } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.dataInicio || filter.dataFim
        ? {
            [dateField]: {
              ...(filter.dataInicio ? { gte: filter.dataInicio } : {}),
              ...(filter.dataFim ? { lte: filter.dataFim } : {}),
            },
          }
        : {}),
    };
    const rows = await this.prisma.transacaoFinanceira.findMany({
      where,
      orderBy: [{ [dateField]: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(take, 500),
    });
    return rows.map(toEntity);
  }

  async findById(companyId: string, id: string): Promise<TransacaoFinanceiraEntity> {
    const t = await this.prisma.transacaoFinanceira.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!t) throw new NotFoundException('Transação não encontrada.');
    return toEntity(t);
  }

  private async validateRefs(
    companyId: string,
    input: { obraId: string; etapaId?: string; subetapaId?: string; itemWbsId?: string; centroCustoId: string; categoriaId: string },
  ) {
    const [obra, cc, cat] = await Promise.all([
      this.prisma.obra.findFirst({ where: { id: input.obraId, companyId, deletedAt: null } }),
      this.prisma.centroCusto.findFirst({ where: { id: input.centroCustoId, companyId, deletedAt: null } }),
      this.prisma.categoriaConstrucao.findFirst({ where: { id: input.categoriaId, companyId, deletedAt: null } }),
    ]);
    if (!obra) throw new BadRequestException('Obra inválida.');
    if (!cc) throw new BadRequestException('Centro de custo inválido.');
    if (!cat) throw new BadRequestException('Categoria inválida.');
    if (input.etapaId) {
      const e = await this.prisma.obraEtapa.findFirst({
        where: { id: input.etapaId, obraId: input.obraId, deletedAt: null },
      });
      if (!e) throw new BadRequestException('Etapa não pertence à obra.');
    }
    if (input.subetapaId) {
      const s = await this.prisma.obraSubetapa.findFirst({
        where: { id: input.subetapaId, etapaId: input.etapaId ?? undefined, deletedAt: null },
      });
      if (!s) throw new BadRequestException('Subetapa inválida.');
    }
    if (input.itemWbsId) {
      const it = await this.prisma.obraItemWBS.findFirst({
        where: { id: input.itemWbsId, etapaId: input.etapaId ?? undefined, deletedAt: null },
      });
      if (!it) throw new BadRequestException('Item de WBS inválido.');
    }
  }

  async create(
    companyId: string,
    userId: string | undefined,
    input: CreateTransacaoInput,
  ): Promise<TransacaoFinanceiraEntity> {
    await this.validateRefs(companyId, input);

    if (input.status === StatusTransacao.CONFIRMADO && !input.dataReal) {
      throw new BadRequestException('dataReal é obrigatória para transação CONFIRMADA.');
    }

    return this.prisma.$transaction(async (tx) => {
      const t = await tx.transacaoFinanceira.create({
        data: {
          companyId,
          obraId: input.obraId,
          etapaId: input.etapaId ?? null,
          subetapaId: input.subetapaId ?? null,
          itemWbsId: input.itemWbsId ?? null,
          centroCustoId: input.centroCustoId,
          categoriaId: input.categoriaId,
          supplierId: input.supplierId ?? null,
          accountPayableId: input.accountPayableId ?? null,
          accountReceivableId: input.accountReceivableId ?? null,
          tipo: input.tipo,
          status: input.status,
          valor: input.valor,
          descricao: input.descricao,
          documento: input.documento ?? null,
          dataCompetencia: input.dataCompetencia,
          dataReal: input.dataReal ?? null,
          dataPrevistaPgto: input.dataPrevistaPgto ?? null,
          observacoes: input.observacoes ?? null,
          criadoPorId: userId ?? null,
          confirmadoPorId: input.status === StatusTransacao.CONFIRMADO ? userId ?? null : null,
          confirmadoEm: input.status === StatusTransacao.CONFIRMADO ? new Date() : null,
        },
      });

      if (
        input.status === StatusTransacao.CONFIRMADO &&
        input.accountPayableId
      ) {
        await tx.accountPayable.update({
          where: { id: input.accountPayableId },
          data: { paidAt: input.dataReal!, status: AccountStatus.PAID },
        });
      }
      if (
        input.status === StatusTransacao.CONFIRMADO &&
        input.accountReceivableId
      ) {
        await tx.accountReceivable.update({
          where: { id: input.accountReceivableId },
          data: { paidAt: input.dataReal!, status: AccountStatus.PAID },
        });
      }

      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'TransacaoFinanceira',
          entityId: t.id,
          action: AuditAction.CREATE,
          after: t,
        },
        tx,
      );
      return toEntity(t);
    });
  }

  async confirmar(
    companyId: string,
    userId: string | undefined,
    input: ConfirmarTransacaoInput,
  ): Promise<TransacaoFinanceiraEntity> {
    const t = await this.prisma.transacaoFinanceira.findFirst({
      where: { id: input.id, companyId, deletedAt: null },
    });
    if (!t) throw new NotFoundException('Transação não encontrada.');
    if (t.status !== StatusTransacao.PENDENTE) {
      throw new ForbiddenException(`Apenas transações PENDENTES podem ser confirmadas. Atual: ${t.status}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.transacaoFinanceira.update({
        where: { id: input.id },
        data: {
          status: StatusTransacao.CONFIRMADO,
          dataReal: input.dataReal,
          confirmadoPorId: userId ?? null,
          confirmadoEm: new Date(),
        },
      });
      if (t.accountPayableId) {
        await tx.accountPayable.update({
          where: { id: t.accountPayableId },
          data: { paidAt: input.dataReal, status: AccountStatus.PAID },
        });
      }
      if (t.accountReceivableId) {
        await tx.accountReceivable.update({
          where: { id: t.accountReceivableId },
          data: { paidAt: input.dataReal, status: AccountStatus.PAID },
        });
      }
      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'TransacaoFinanceira',
          entityId: t.id,
          action: AuditAction.CONFIRM,
          before: { status: t.status, dataReal: t.dataReal },
          after: { status: updated.status, dataReal: updated.dataReal },
        },
        tx,
      );
      return toEntity(updated);
    });
  }

  async estornar(
    companyId: string,
    userId: string | undefined,
    input: EstornarTransacaoInput,
  ): Promise<TransacaoFinanceiraEntity> {
    const original = await this.prisma.transacaoFinanceira.findFirst({
      where: { id: input.id, companyId, deletedAt: null },
    });
    if (!original) throw new NotFoundException('Transação não encontrada.');
    if (original.status !== StatusTransacao.CONFIRMADO) {
      throw new ForbiddenException('Apenas transações CONFIRMADAS podem ser estornadas.');
    }
    const jaEstornada = await this.prisma.transacaoFinanceira.findUnique({
      where: { estornoDeId: original.id },
    });
    if (jaEstornada) {
      throw new BadRequestException('Esta transação já foi estornada.');
    }

    return this.prisma.$transaction(async (tx) => {
      const reversa = await tx.transacaoFinanceira.create({
        data: {
          companyId: original.companyId,
          obraId: original.obraId,
          etapaId: original.etapaId,
          subetapaId: original.subetapaId,
          itemWbsId: original.itemWbsId,
          centroCustoId: original.centroCustoId,
          categoriaId: original.categoriaId,
          supplierId: original.supplierId,
          accountPayableId: original.accountPayableId,
          accountReceivableId: original.accountReceivableId,
          tipo: original.tipo === TipoTransacao.RECEITA ? TipoTransacao.DESPESA : TipoTransacao.RECEITA,
          status: StatusTransacao.CONFIRMADO,
          valor: original.valor,
          descricao: `ESTORNO: ${original.descricao}`,
          documento: original.documento,
          dataCompetencia: original.dataCompetencia,
          dataReal: new Date(),
          observacoes: input.motivo,
          estornoDeId: original.id,
          criadoPorId: userId ?? null,
          confirmadoPorId: userId ?? null,
          confirmadoEm: new Date(),
        },
      });
      await tx.transacaoFinanceira.update({
        where: { id: original.id },
        data: { status: StatusTransacao.ESTORNADO },
      });
      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'TransacaoFinanceira',
          entityId: original.id,
          action: AuditAction.REVERT,
          reason: input.motivo,
          after: { estornoDeId: reversa.id },
        },
        tx,
      );
      return toEntity(reversa);
    });
  }

  async cancelarPendente(
    companyId: string,
    userId: string | undefined,
    id: string,
    motivo?: string,
  ): Promise<boolean> {
    const t = await this.prisma.transacaoFinanceira.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!t) throw new NotFoundException('Transação não encontrada.');
    if (t.status !== StatusTransacao.PENDENTE) {
      throw new ForbiddenException('Apenas transações PENDENTES podem ser canceladas.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.transacaoFinanceira.update({
        where: { id },
        data: { status: StatusTransacao.CANCELADO, deletedAt: new Date() },
      });
      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'TransacaoFinanceira',
          entityId: id,
          action: AuditAction.SOFT_DELETE,
          before: { status: t.status },
          reason: motivo ?? null,
        },
        tx,
      );
    });
    return true;
  }
}
