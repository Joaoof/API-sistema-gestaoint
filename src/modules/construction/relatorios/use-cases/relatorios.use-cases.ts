import { Injectable } from '@nestjs/common';
import { Prisma, StatusTransacao, TipoTransacao } from '@prisma/client';
import { PrismaService } from '../../../../../prisma/prisma.service';
import {
  GranularidadeFluxo,
  RelatorioFiltroInput,
  RelatorioFluxoCaixaInput,
} from '../dto/relatorios.input';
import {
  LinhaDesvio,
  LinhaPrevistoVsRealizado,
  LinhaQuebraCustos,
  PontoFluxoCaixa,
  RelatorioDesvio,
  RelatorioFluxoCaixa,
  RelatorioPrevistoVsRealizado,
  RelatorioQuebraCustos,
} from '../dto/relatorios.types';
import { TipoData } from '../../shared/enums.gql';

const num = (x: unknown): number => Number(x ?? 0);

function pct(parte: number, total: number): number | null {
  return total > 0 ? Number(((parte / total) * 100).toFixed(2)) : null;
}

@Injectable()
export class RelatoriosUseCases {
  constructor(private readonly prisma: PrismaService) {}

  // ===================================================================
  // 1) PREVISTO vs REALIZADO
  // Previsto vem da VERSÃO ATIVA de orçamento de cada obra (filtrável).
  // Realizado/Pendente vem de TransacaoFinanceira (DESPESA) por status.
  // ===================================================================
  async previstoVsRealizado(
    companyId: string,
    f: RelatorioFiltroInput,
  ): Promise<RelatorioPrevistoVsRealizado> {
    const dataField = f.tipoData === TipoData.REAL ? 'dataReal' : 'dataCompetencia';

    const baseObra: Prisma.ObraWhereInput = {
      companyId,
      deletedAt: null,
      ...(f.obraId ? { id: f.obraId } : {}),
    };

    // Previsto agregado por obra/etapa/categoria a partir da versão ATIVA.
    const versoesAtivas = await this.prisma.versaoOrcamento.findMany({
      where: {
        companyId,
        status: 'ATIVO',
        deletedAt: null,
        obra: baseObra,
      },
      include: { itens: true, obra: { select: { id: true, codigo: true, nome: true } } },
    });

    type Agg = { previsto: number; realizado: number; pendente: number; nome: string };
    const obraAgg = new Map<string, Agg>();
    const etapaAgg = new Map<string, Agg>();
    const categoriaAgg = new Map<string, Agg>();

    for (const v of versoesAtivas) {
      const obraKey = v.obraId;
      const obraNome = `${v.obra.codigo} - ${v.obra.nome}`;
      if (!obraAgg.has(obraKey)) {
        obraAgg.set(obraKey, { previsto: 0, realizado: 0, pendente: 0, nome: obraNome });
      }
      for (const it of v.itens) {
        if (f.etapaId && it.etapaId !== f.etapaId) continue;
        if (f.categoriaId && it.categoriaId !== f.categoriaId) continue;
        if (f.centroCustoId && it.centroCustoId !== f.centroCustoId) continue;

        const valor = num(it.valorTotal);
        obraAgg.get(obraKey)!.previsto += valor;
        if (it.etapaId) {
          const e = etapaAgg.get(it.etapaId) ?? { previsto: 0, realizado: 0, pendente: 0, nome: it.etapaId };
          e.previsto += valor;
          etapaAgg.set(it.etapaId, e);
        }
        if (it.categoriaId) {
          const c = categoriaAgg.get(it.categoriaId) ?? { previsto: 0, realizado: 0, pendente: 0, nome: it.categoriaId };
          c.previsto += valor;
          categoriaAgg.set(it.categoriaId, c);
        }
      }
    }

    // Realizado/Pendente: 1 query agrupada por (obraId, etapaId, categoriaId).
    const transWhere: Prisma.TransacaoFinanceiraWhereInput = {
      companyId,
      tipo: TipoTransacao.DESPESA,
      status: { in: [StatusTransacao.CONFIRMADO, StatusTransacao.PENDENTE] },
      deletedAt: null,
      ...(f.obraId ? { obraId: f.obraId } : {}),
      ...(f.etapaId ? { etapaId: f.etapaId } : {}),
      ...(f.centroCustoId ? { centroCustoId: f.centroCustoId } : {}),
      ...(f.categoriaId ? { categoriaId: f.categoriaId } : {}),
      ...(f.dataInicio || f.dataFim
        ? {
            [dataField]: {
              ...(f.dataInicio ? { gte: f.dataInicio } : {}),
              ...(f.dataFim ? { lte: f.dataFim } : {}),
            },
          }
        : {}),
    };

    const trans = await this.prisma.transacaoFinanceira.findMany({
      where: transWhere,
      select: {
        obraId: true,
        etapaId: true,
        categoriaId: true,
        status: true,
        valor: true,
      },
    });

    // Nomes de etapa/categoria (apenas das chaves que aparecem)
    const etapaIds = new Set<string>();
    const categoriaIds = new Set<string>();
    const obraIds = new Set<string>();

    for (const t of trans) {
      obraIds.add(t.obraId);
      if (t.etapaId) etapaIds.add(t.etapaId);
      if (t.categoriaId) categoriaIds.add(t.categoriaId);
    }
    for (const k of obraAgg.keys()) obraIds.add(k);
    for (const k of etapaAgg.keys()) etapaIds.add(k);
    for (const k of categoriaAgg.keys()) categoriaIds.add(k);

    const [obras, etapas, categorias] = await Promise.all([
      obraIds.size
        ? this.prisma.obra.findMany({
            where: { id: { in: [...obraIds] } },
            select: { id: true, codigo: true, nome: true },
          })
        : Promise.resolve([] as { id: string; codigo: string; nome: string }[]),
      etapaIds.size
        ? this.prisma.obraEtapa.findMany({
            where: { id: { in: [...etapaIds] } },
            select: { id: true, codigo: true, nome: true },
          })
        : Promise.resolve([] as { id: string; codigo: string; nome: string }[]),
      categoriaIds.size
        ? this.prisma.categoriaConstrucao.findMany({
            where: { id: { in: [...categoriaIds] } },
            select: { id: true, codigo: true, nome: true },
          })
        : Promise.resolve([] as { id: string; codigo: string; nome: string }[]),
    ]);

    const obraName = new Map(obras.map((o) => [o.id, `${o.codigo} - ${o.nome}`]));
    const etapaName = new Map(etapas.map((e) => [e.id, `${e.codigo} - ${e.nome}`]));
    const categoriaName = new Map(categorias.map((c) => [c.id, `${c.codigo} - ${c.nome}`]));

    for (const t of trans) {
      const valor = num(t.valor);
      const isConf = t.status === StatusTransacao.CONFIRMADO;

      if (!obraAgg.has(t.obraId)) {
        obraAgg.set(t.obraId, {
          previsto: 0,
          realizado: 0,
          pendente: 0,
          nome: obraName.get(t.obraId) ?? t.obraId,
        });
      }
      const oa = obraAgg.get(t.obraId)!;
      isConf ? (oa.realizado += valor) : (oa.pendente += valor);

      if (t.etapaId) {
        const e =
          etapaAgg.get(t.etapaId) ??
          { previsto: 0, realizado: 0, pendente: 0, nome: etapaName.get(t.etapaId) ?? t.etapaId };
        isConf ? (e.realizado += valor) : (e.pendente += valor);
        etapaAgg.set(t.etapaId, e);
      }
      if (t.categoriaId) {
        const c =
          categoriaAgg.get(t.categoriaId) ??
          {
            previsto: 0,
            realizado: 0,
            pendente: 0,
            nome: categoriaName.get(t.categoriaId) ?? t.categoriaId,
          };
        isConf ? (c.realizado += valor) : (c.pendente += valor);
        categoriaAgg.set(t.categoriaId, c);
      }
    }

    const buildLinha = (id: string, agg: Agg, fallbackNome?: string): LinhaPrevistoVsRealizado => {
      const previsto = Number(agg.previsto.toFixed(2));
      const realizado = Number(agg.realizado.toFixed(2));
      const pendente = Number(agg.pendente.toFixed(2));
      return {
        chaveId: id,
        chaveNome: fallbackNome ?? agg.nome,
        previsto,
        realizado,
        pendente,
        saldo: Number((previsto - realizado).toFixed(2)),
        percentExecutado: pct(realizado, previsto),
      };
    };

    const porObra: LinhaPrevistoVsRealizado[] = [...obraAgg.entries()].map(([id, a]) =>
      buildLinha(id, a, obraName.get(id) ?? a.nome),
    );
    const porEtapa: LinhaPrevistoVsRealizado[] = [...etapaAgg.entries()].map(([id, a]) =>
      buildLinha(id, a, etapaName.get(id) ?? id),
    );
    const porCategoria: LinhaPrevistoVsRealizado[] = [...categoriaAgg.entries()].map(([id, a]) =>
      buildLinha(id, a, categoriaName.get(id) ?? id),
    );

    const totalPrevisto = Number(porObra.reduce((s, l) => s + l.previsto, 0).toFixed(2));
    const totalRealizado = Number(porObra.reduce((s, l) => s + l.realizado, 0).toFixed(2));
    const totalPendente = Number(porObra.reduce((s, l) => s + l.pendente, 0).toFixed(2));

    return {
      totalPrevisto,
      totalRealizado,
      totalPendente,
      saldo: Number((totalPrevisto - totalRealizado).toFixed(2)),
      percentExecutado: pct(totalRealizado, totalPrevisto),
      porObra: porObra.sort((a, b) => b.realizado - a.realizado),
      porEtapa: porEtapa.sort((a, b) => b.realizado - a.realizado),
      porCategoria: porCategoria.sort((a, b) => b.realizado - a.realizado),
    };
  }

  // ===================================================================
  // 2) DESVIO — diferença absoluta e percentual
  // ===================================================================
  async desvio(companyId: string, f: RelatorioFiltroInput): Promise<RelatorioDesvio> {
    const pvr = await this.previstoVsRealizado(companyId, f);
    const toDesvio = (l: LinhaPrevistoVsRealizado): LinhaDesvio => {
      const previsto = l.previsto;
      const realizado = l.realizado;
      const desvioAbs = Number((realizado - previsto).toFixed(2));
      return {
        chaveId: l.chaveId,
        chaveNome: l.chaveNome,
        previsto,
        realizado,
        desvioAbs,
        desvioPct: previsto > 0 ? Number(((desvioAbs / previsto) * 100).toFixed(2)) : null,
      };
    };
    const porObra = pvr.porObra.map(toDesvio).sort(
      (a, b) => Math.abs(b.desvioAbs) - Math.abs(a.desvioAbs),
    );
    const porEtapa = pvr.porEtapa.map(toDesvio).sort(
      (a, b) => Math.abs(b.desvioAbs) - Math.abs(a.desvioAbs),
    );
    const porCategoria = pvr.porCategoria.map(toDesvio).sort(
      (a, b) => Math.abs(b.desvioAbs) - Math.abs(a.desvioAbs),
    );
    return {
      porObra,
      porEtapa,
      porCategoria,
      totalDesvios:
        porObra.filter((l) => l.desvioAbs !== 0).length +
        porEtapa.filter((l) => l.desvioAbs !== 0).length +
        porCategoria.filter((l) => l.desvioAbs !== 0).length,
    };
  }

  // ===================================================================
  // 3) FLUXO DE CAIXA — agregação temporal via SQL (Postgres date_trunc)
  // ===================================================================
  async fluxoCaixa(
    companyId: string,
    f: RelatorioFluxoCaixaInput,
  ): Promise<RelatorioFluxoCaixa> {
    const truncUnit =
      f.granularidade === GranularidadeFluxo.DIA
        ? 'day'
        : f.granularidade === GranularidadeFluxo.SEMANA
          ? 'week'
          : 'month';
    const dataField = f.tipoData === TipoData.REAL ? 'dataReal' : 'dataCompetencia';

    const rows = await this.prisma.$queryRaw<
      {
        periodo: Date;
        tipo: TipoTransacao;
        status: StatusTransacao;
        total: number | string;
      }[]
    >(Prisma.sql`
      SELECT
        date_trunc(${truncUnit}, "${Prisma.raw(dataField)}") AS periodo,
        "tipo",
        "status",
        SUM("valor")::float8 AS total
      FROM "TransacaoFinanceira"
      WHERE "companyId" = ${companyId}
        AND "deletedAt" IS NULL
        AND "${Prisma.raw(dataField)}" IS NOT NULL
        AND "${Prisma.raw(dataField)}" >= ${f.dataInicio}
        AND "${Prisma.raw(dataField)}" <= ${f.dataFim}
        AND "status" IN ('CONFIRMADO','PENDENTE')
        ${f.obraId ? Prisma.sql`AND "obraId" = ${f.obraId}` : Prisma.empty}
      GROUP BY 1, 2, 3
      ORDER BY 1 ASC
    `);

    const periodKey = (d: Date) => d.toISOString().slice(0, 10);
    const buckets = new Map<string, PontoFluxoCaixa>();

    for (const r of rows) {
      const key = periodKey(r.periodo);
      if (!buckets.has(key)) {
        buckets.set(key, {
          periodo: key,
          entradasConfirmadas: 0,
          saidasConfirmadas: 0,
          entradasPrevistas: 0,
          saidasPrevistas: 0,
          saldoConfirmado: 0,
          saldoProjetado: 0,
        });
      }
      const b = buckets.get(key)!;
      const v = num(r.total);
      if (r.tipo === TipoTransacao.RECEITA) {
        if (r.status === StatusTransacao.CONFIRMADO) b.entradasConfirmadas += v;
        else b.entradasPrevistas += v;
      } else {
        if (r.status === StatusTransacao.CONFIRMADO) b.saidasConfirmadas += v;
        else b.saidasPrevistas += v;
      }
    }

    let totalEntradasConfirmadas = 0;
    let totalSaidasConfirmadas = 0;
    let totalEntradasPrevistas = 0;
    let totalSaidasPrevistas = 0;
    let saldoCum = 0;
    let saldoProjCum = 0;

    const pontos: PontoFluxoCaixa[] = [...buckets.values()]
      .sort((a, b) => a.periodo.localeCompare(b.periodo))
      .map((p) => {
        p.entradasConfirmadas = Number(p.entradasConfirmadas.toFixed(2));
        p.saidasConfirmadas = Number(p.saidasConfirmadas.toFixed(2));
        p.entradasPrevistas = Number(p.entradasPrevistas.toFixed(2));
        p.saidasPrevistas = Number(p.saidasPrevistas.toFixed(2));
        const periodConf = p.entradasConfirmadas - p.saidasConfirmadas;
        const periodProj =
          p.entradasConfirmadas + p.entradasPrevistas - p.saidasConfirmadas - p.saidasPrevistas;
        saldoCum = Number((saldoCum + periodConf).toFixed(2));
        saldoProjCum = Number((saldoProjCum + periodProj).toFixed(2));
        p.saldoConfirmado = saldoCum;
        p.saldoProjetado = saldoProjCum;
        totalEntradasConfirmadas += p.entradasConfirmadas;
        totalSaidasConfirmadas += p.saidasConfirmadas;
        totalEntradasPrevistas += p.entradasPrevistas;
        totalSaidasPrevistas += p.saidasPrevistas;
        return p;
      });

    return {
      pontos,
      totalEntradasConfirmadas: Number(totalEntradasConfirmadas.toFixed(2)),
      totalSaidasConfirmadas: Number(totalSaidasConfirmadas.toFixed(2)),
      totalEntradasPrevistas: Number(totalEntradasPrevistas.toFixed(2)),
      totalSaidasPrevistas: Number(totalSaidasPrevistas.toFixed(2)),
      saldoFinalConfirmado: saldoCum,
      saldoFinalProjetado: saldoProjCum,
    };
  }

  // ===================================================================
  // 4) QUEBRA DE CUSTOS — apenas DESPESA confirmada
  // ===================================================================
  async quebraCustos(
    companyId: string,
    f: RelatorioFiltroInput,
  ): Promise<RelatorioQuebraCustos> {
    const dataField = f.tipoData === TipoData.REAL ? 'dataReal' : 'dataCompetencia';
    const where: Prisma.TransacaoFinanceiraWhereInput = {
      companyId,
      tipo: TipoTransacao.DESPESA,
      status: StatusTransacao.CONFIRMADO,
      deletedAt: null,
      ...(f.obraId ? { obraId: f.obraId } : {}),
      ...(f.etapaId ? { etapaId: f.etapaId } : {}),
      ...(f.centroCustoId ? { centroCustoId: f.centroCustoId } : {}),
      ...(f.categoriaId ? { categoriaId: f.categoriaId } : {}),
      ...(f.dataInicio || f.dataFim
        ? {
            [dataField]: {
              ...(f.dataInicio ? { gte: f.dataInicio } : {}),
              ...(f.dataFim ? { lte: f.dataFim } : {}),
            },
          }
        : {}),
    };

    const trans = await this.prisma.transacaoFinanceira.findMany({
      where,
      select: {
        valor: true,
        categoriaId: true,
        centroCustoId: true,
        supplierId: true,
      },
    });

    const total = Number(trans.reduce((s, t) => s + num(t.valor), 0).toFixed(2));

    const sumBy = (key: 'categoriaId' | 'centroCustoId' | 'supplierId') => {
      const m = new Map<string, number>();
      for (const t of trans) {
        const k = (t as any)[key];
        if (!k) continue;
        m.set(k, num(m.get(k)) + num(t.valor));
      }
      return m;
    };

    const catMap = sumBy('categoriaId');
    const ccMap = sumBy('centroCustoId');
    const supMap = sumBy('supplierId');

    const [cats, ccs, sups] = await Promise.all([
      catMap.size
        ? this.prisma.categoriaConstrucao.findMany({
            where: { id: { in: [...catMap.keys()] } },
            select: { id: true, codigo: true, nome: true, tipo: true },
          })
        : Promise.resolve([] as any[]),
      ccMap.size
        ? this.prisma.centroCusto.findMany({
            where: { id: { in: [...ccMap.keys()] } },
            select: { id: true, codigo: true, nome: true },
          })
        : Promise.resolve([] as any[]),
      supMap.size
        ? this.prisma.supplier.findMany({
            where: { id: { in: [...supMap.keys()] } },
            select: { id: true, name: true },
          })
        : Promise.resolve([] as any[]),
    ]);

    const buildLinha = (
      id: string,
      nome: string,
      valor: number,
    ): LinhaQuebraCustos => ({
      id,
      nome,
      valor: Number(valor.toFixed(2)),
      percentTotal: pct(valor, total) ?? 0,
    });

    const porCategoria: LinhaQuebraCustos[] = cats.map((c) =>
      buildLinha(c.id, `${c.codigo} - ${c.nome}`, catMap.get(c.id) ?? 0),
    );

    const porTipoMap = new Map<string, number>();
    for (const c of cats) {
      const v = catMap.get(c.id) ?? 0;
      porTipoMap.set(c.tipo, num(porTipoMap.get(c.tipo)) + v);
    }
    const porTipoCategoria: LinhaQuebraCustos[] = [...porTipoMap.entries()].map(
      ([tipo, v]) => buildLinha(tipo, tipo, v),
    );

    const porCentroCusto: LinhaQuebraCustos[] = ccs.map((c) =>
      buildLinha(c.id, `${c.codigo} - ${c.nome}`, ccMap.get(c.id) ?? 0),
    );
    const porFornecedor: LinhaQuebraCustos[] = sups.map((s) =>
      buildLinha(s.id, s.name, supMap.get(s.id) ?? 0),
    );

    const sortByValor = (a: LinhaQuebraCustos, b: LinhaQuebraCustos) => b.valor - a.valor;
    return {
      total,
      porCategoria: porCategoria.sort(sortByValor),
      porTipoCategoria: porTipoCategoria.sort(sortByValor),
      porCentroCusto: porCentroCusto.sort(sortByValor),
      porFornecedor: porFornecedor.sort(sortByValor),
    };
  }
}
