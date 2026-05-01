import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, VersaoOrcamentoStatus } from '@prisma/client';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { AuditLogService } from '../../shared/audit-log.service';
import {
  AddItensOrcamentoInput,
  CompararVersoesInput,
  CreateVersaoOrcamentoInput,
  ItemOrcamentoInput,
} from '../dto/orcamento.input';
import {
  ComparacaoItemEntity,
  ComparacaoVersoesEntity,
  ItemOrcamentoEntity,
  VersaoOrcamentoEntity,
} from '../entities/orcamento.entity';

type VersaoWithItens = Prisma.VersaoOrcamentoGetPayload<{ include: { itens: true } }>;

function decimalsToTotal(quantidade: number, valorUnitario: number): number {
  return Number((quantidade * valorUnitario).toFixed(2));
}

function mapItem(i: any): ItemOrcamentoEntity {
  return {
    id: i.id,
    versaoId: i.versaoId,
    etapaId: i.etapaId,
    subetapaId: i.subetapaId,
    itemWbsId: i.itemWbsId,
    centroCustoId: i.centroCustoId,
    categoriaId: i.categoriaId,
    descricao: i.descricao,
    unidade: i.unidade,
    quantidade: Number(i.quantidade),
    valorUnitario: Number(i.valorUnitario),
    valorTotal: Number(i.valorTotal),
    ordem: i.ordem,
    notas: i.notas,
  };
}

function toEntity(v: VersaoWithItens): VersaoOrcamentoEntity {
  return {
    id: v.id,
    companyId: v.companyId,
    obraId: v.obraId,
    numero: v.numero,
    nome: v.nome,
    descricao: v.descricao,
    status: v.status,
    baseVersaoId: v.baseVersaoId,
    total: Number(v.total),
    ativadoEm: v.ativadoEm,
    congeladoEm: v.congeladoEm,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    itens: v.itens.map(mapItem),
  };
}

@Injectable()
export class OrcamentoUseCases {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async listVersoes(companyId: string, obraId: string): Promise<VersaoOrcamentoEntity[]> {
    const versoes = await this.prisma.versaoOrcamento.findMany({
      where: { companyId, obraId, deletedAt: null },
      include: { itens: { orderBy: { ordem: 'asc' } } },
      orderBy: { numero: 'desc' },
    });
    return versoes.map(toEntity);
  }

  async findVersao(companyId: string, id: string): Promise<VersaoOrcamentoEntity> {
    const v = await this.prisma.versaoOrcamento.findFirst({
      where: { id, companyId, deletedAt: null },
      include: { itens: { orderBy: { ordem: 'asc' } } },
    });
    if (!v) throw new NotFoundException('Versão de orçamento não encontrada.');
    return toEntity(v);
  }

  private validateItem(i: ItemOrcamentoInput) {
    if (!i.etapaId && !i.subetapaId && !i.itemWbsId) {
      throw new BadRequestException(
        `Item "${i.descricao}" precisa estar vinculado a uma etapa, subetapa ou item da WBS.`,
      );
    }
  }

  async createVersao(
    companyId: string,
    userId: string | undefined,
    input: CreateVersaoOrcamentoInput,
  ): Promise<VersaoOrcamentoEntity> {
    const obra = await this.prisma.obra.findFirst({
      where: { id: input.obraId, companyId, deletedAt: null },
    });
    if (!obra) throw new NotFoundException('Obra não encontrada.');

    if (input.baseVersaoId) {
      const base = await this.prisma.versaoOrcamento.findFirst({
        where: { id: input.baseVersaoId, companyId, obraId: input.obraId, deletedAt: null },
      });
      if (!base) throw new BadRequestException('Versão base não encontrada.');
    }

    input.itens.forEach((i) => this.validateItem(i));

    const last = await this.prisma.versaoOrcamento.findFirst({
      where: { obraId: input.obraId },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const numero = (last?.numero ?? 0) + 1;

    const itensData = input.itens.map((i) => ({
      etapaId: i.etapaId ?? null,
      subetapaId: i.subetapaId ?? null,
      itemWbsId: i.itemWbsId ?? null,
      centroCustoId: i.centroCustoId ?? null,
      categoriaId: i.categoriaId ?? null,
      descricao: i.descricao,
      unidade: i.unidade,
      quantidade: i.quantidade,
      valorUnitario: i.valorUnitario,
      valorTotal: decimalsToTotal(i.quantidade, i.valorUnitario),
      ordem: i.ordem,
      notas: i.notas ?? null,
    }));
    const total = Number(itensData.reduce((s, it) => s + it.valorTotal, 0).toFixed(2));

    return this.prisma.$transaction(async (tx) => {
      const versao = await tx.versaoOrcamento.create({
        data: {
          companyId,
          obraId: input.obraId,
          numero,
          nome: input.nome,
          descricao: input.descricao ?? null,
          baseVersaoId: input.baseVersaoId ?? null,
          status: VersaoOrcamentoStatus.RASCUNHO,
          total,
          criadoPorId: userId ?? null,
          itens: { create: itensData },
        },
        include: { itens: { orderBy: { ordem: 'asc' } } },
      });
      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'VersaoOrcamento',
          entityId: versao.id,
          action: AuditAction.CREATE,
          after: { ...versao, itens: undefined, totalItens: versao.itens.length },
        },
        tx,
      );
      return toEntity(versao);
    });
  }

  async addItens(
    companyId: string,
    userId: string | undefined,
    input: AddItensOrcamentoInput,
  ): Promise<VersaoOrcamentoEntity> {
    const versao = await this.prisma.versaoOrcamento.findFirst({
      where: { id: input.versaoId, companyId, deletedAt: null },
    });
    if (!versao) throw new NotFoundException('Versão de orçamento não encontrada.');
    if (versao.status !== VersaoOrcamentoStatus.RASCUNHO) {
      throw new ForbiddenException(
        'Apenas versões em RASCUNHO podem ser editadas. Crie uma nova versão a partir desta.',
      );
    }
    input.itens.forEach((i) => this.validateItem(i));

    const novosItens = input.itens.map((i) => ({
      versaoId: input.versaoId,
      etapaId: i.etapaId ?? null,
      subetapaId: i.subetapaId ?? null,
      itemWbsId: i.itemWbsId ?? null,
      centroCustoId: i.centroCustoId ?? null,
      categoriaId: i.categoriaId ?? null,
      descricao: i.descricao,
      unidade: i.unidade,
      quantidade: i.quantidade,
      valorUnitario: i.valorUnitario,
      valorTotal: decimalsToTotal(i.quantidade, i.valorUnitario),
      ordem: i.ordem,
      notas: i.notas ?? null,
    }));

    const incremento = Number(novosItens.reduce((s, i) => s + i.valorTotal, 0).toFixed(2));

    await this.prisma.$transaction(async (tx) => {
      await tx.itemOrcamento.createMany({ data: novosItens });
      await tx.versaoOrcamento.update({
        where: { id: input.versaoId },
        data: { total: { increment: incremento } },
      });
      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'VersaoOrcamento',
          entityId: input.versaoId,
          action: AuditAction.UPDATE,
          after: { adicionados: novosItens.length, incrementoTotal: incremento },
          reason: 'addItens',
        },
        tx,
      );
    });

    return this.findVersao(companyId, input.versaoId);
  }

  async ativarVersao(
    companyId: string,
    userId: string | undefined,
    id: string,
  ): Promise<VersaoOrcamentoEntity> {
    const versao = await this.prisma.versaoOrcamento.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!versao) throw new NotFoundException('Versão não encontrada.');
    if (versao.status !== VersaoOrcamentoStatus.RASCUNHO) {
      throw new ForbiddenException('Apenas versões em RASCUNHO podem ser ativadas.');
    }

    await this.prisma.$transaction(async (tx) => {
      const ativaAtual = await tx.versaoOrcamento.findFirst({
        where: {
          companyId,
          obraId: versao.obraId,
          status: VersaoOrcamentoStatus.ATIVO,
          deletedAt: null,
        },
      });
      if (ativaAtual) {
        await tx.versaoOrcamento.update({
          where: { id: ativaAtual.id },
          data: { status: VersaoOrcamentoStatus.SUBSTITUIDO },
        });
        await this.audit.log(
          {
            companyId,
            userId,
            entity: 'VersaoOrcamento',
            entityId: ativaAtual.id,
            action: AuditAction.UPDATE,
            before: { status: ativaAtual.status },
            after: { status: VersaoOrcamentoStatus.SUBSTITUIDO },
            reason: 'substituida pela versão ' + versao.numero,
          },
          tx,
        );
      }
      const now = new Date();
      await tx.versaoOrcamento.update({
        where: { id },
        data: {
          status: VersaoOrcamentoStatus.ATIVO,
          ativadoEm: now,
          congeladoEm: now,
        },
      });
      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'VersaoOrcamento',
          entityId: id,
          action: AuditAction.ACTIVATE,
          before: { status: versao.status },
          after: { status: VersaoOrcamentoStatus.ATIVO },
        },
        tx,
      );
      await this.audit.log(
        {
          companyId,
          userId,
          entity: 'VersaoOrcamento',
          entityId: id,
          action: AuditAction.FREEZE,
          reason: 'imutável após ativação',
        },
        tx,
      );
    });

    return this.findVersao(companyId, id);
  }

  async compararVersoes(
    companyId: string,
    input: CompararVersoesInput,
  ): Promise<ComparacaoVersoesEntity> {
    const [base, alvo] = await Promise.all([
      this.prisma.versaoOrcamento.findFirst({
        where: { id: input.versaoBaseId, companyId, deletedAt: null },
        include: { itens: true },
      }),
      this.prisma.versaoOrcamento.findFirst({
        where: { id: input.versaoAlvoId, companyId, deletedAt: null },
        include: { itens: true },
      }),
    ]);
    if (!base || !alvo) throw new NotFoundException('Versão não encontrada.');
    if (base.obraId !== alvo.obraId) {
      throw new BadRequestException('Versões pertencem a obras diferentes.');
    }

    const aggregate = (
      items: typeof base.itens,
      key: 'etapaId' | 'categoriaId',
    ): Map<string, number> => {
      const m = new Map<string, number>();
      for (const it of items) {
        const k = (it[key] as string | null) ?? '__sem__';
        m.set(k, (m.get(k) ?? 0) + Number(it.valorTotal));
      }
      return m;
    };

    const buildDiff = (
      keyName: 'etapaId' | 'categoriaId',
    ): ComparacaoItemEntity[] => {
      const baseMap = aggregate(base.itens, keyName);
      const alvoMap = aggregate(alvo.itens, keyName);
      const keys = new Set([...baseMap.keys(), ...alvoMap.keys()]);
      const out: ComparacaoItemEntity[] = [];
      for (const k of keys) {
        const valorBase = Number((baseMap.get(k) ?? 0).toFixed(2));
        const valorAlvo = Number((alvoMap.get(k) ?? 0).toFixed(2));
        const diff = Number((valorAlvo - valorBase).toFixed(2));
        const pct = valorBase > 0 ? Number(((diff / valorBase) * 100).toFixed(2)) : null;
        out.push({
          descricao: k === '__sem__' ? '(sem ' + keyName + ')' : k,
          etapaId: keyName === 'etapaId' ? (k === '__sem__' ? null : k) : null,
          categoriaId: keyName === 'categoriaId' ? (k === '__sem__' ? null : k) : null,
          valorBase,
          valorAlvo,
          diferencaAbs: diff,
          diferencaPct: pct,
        });
      }
      return out.sort((a, b) => Math.abs(b.diferencaAbs) - Math.abs(a.diferencaAbs));
    };

    const totalBase = Number(base.total);
    const totalAlvo = Number(alvo.total);
    const diff = Number((totalAlvo - totalBase).toFixed(2));
    const pct = totalBase > 0 ? Number(((diff / totalBase) * 100).toFixed(2)) : null;

    return {
      versaoBaseId: base.id,
      versaoAlvoId: alvo.id,
      totalBase,
      totalAlvo,
      diferencaAbs: diff,
      diferencaPct: pct,
      porEtapa: buildDiff('etapaId'),
      porCategoria: buildDiff('categoriaId'),
    };
  }
}
