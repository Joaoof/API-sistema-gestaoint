-- CreateEnum
CREATE TYPE "ObraStatus" AS ENUM ('PLANEJAMENTO', 'EM_EXECUCAO', 'PAUSADA', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CategoriaConstrucaoTipo" AS ENUM ('MATERIAL', 'MAO_DE_OBRA', 'EQUIPAMENTO', 'SERVICO_TERCEIRO', 'ADMINISTRATIVO', 'IMPOSTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "VersaoOrcamentoStatus" AS ENUM ('RASCUNHO', 'ATIVO', 'SUBSTITUIDO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "TipoTransacao" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "StatusTransacao" AS ENUM ('PENDENTE', 'CONFIRMADO', 'ESTORNADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'SOFT_DELETE', 'CONFIRM', 'REVERT', 'ACTIVATE', 'FREEZE');

-- AlterTable
ALTER TABLE "AccountPayable" ADD COLUMN     "centroCustoId" TEXT,
ADD COLUMN     "obraId" TEXT;

-- AlterTable
ALTER TABLE "AccountReceivable" ADD COLUMN     "centroCustoId" TEXT,
ADD COLUMN     "obraId" TEXT;

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Seller" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Obra" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "ObraStatus" NOT NULL DEFAULT 'PLANEJAMENTO',
    "dataInicio" TIMESTAMP(3),
    "dataFimPrev" TIMESTAMP(3),
    "dataFimReal" TIMESTAMP(3),
    "valorContrato" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObraEtapa" (
    "id" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ObraEtapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObraSubetapa" (
    "id" TEXT NOT NULL,
    "etapaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ObraSubetapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObraItemWBS" (
    "id" TEXT NOT NULL,
    "etapaId" TEXT NOT NULL,
    "subetapaId" TEXT,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'UN',
    "quantidadeRef" DECIMAL(18,4),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ObraItemWBS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentroCusto" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CentroCusto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaConstrucao" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "parentId" TEXT,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "CategoriaConstrucaoTipo" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CategoriaConstrucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VersaoOrcamento" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "VersaoOrcamentoStatus" NOT NULL DEFAULT 'RASCUNHO',
    "baseVersaoId" TEXT,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "ativadoEm" TIMESTAMP(3),
    "congeladoEm" TIMESTAMP(3),
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VersaoOrcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemOrcamento" (
    "id" TEXT NOT NULL,
    "versaoId" TEXT NOT NULL,
    "etapaId" TEXT,
    "subetapaId" TEXT,
    "itemWbsId" TEXT,
    "centroCustoId" TEXT,
    "categoriaId" TEXT,
    "descricao" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'UN',
    "quantidade" DECIMAL(18,4) NOT NULL,
    "valorUnitario" DECIMAL(18,4) NOT NULL,
    "valorTotal" DECIMAL(18,2) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemOrcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransacaoFinanceira" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "etapaId" TEXT,
    "subetapaId" TEXT,
    "itemWbsId" TEXT,
    "centroCustoId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "supplierId" TEXT,
    "customerId" TEXT,
    "accountPayableId" TEXT,
    "accountReceivableId" TEXT,
    "estornoDeId" TEXT,
    "tipo" "TipoTransacao" NOT NULL,
    "status" "StatusTransacao" NOT NULL DEFAULT 'PENDENTE',
    "valor" DECIMAL(18,2) NOT NULL,
    "descricao" TEXT NOT NULL,
    "documento" TEXT,
    "dataReal" TIMESTAMP(3),
    "dataCompetencia" TIMESTAMP(3) NOT NULL,
    "dataPrevistaPgto" TIMESTAMP(3),
    "observacoes" TEXT,
    "criadoPorId" TEXT,
    "confirmadoPorId" TEXT,
    "confirmadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TransacaoFinanceira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Obra_companyId_idx" ON "Obra"("companyId");

-- CreateIndex
CREATE INDEX "Obra_customerId_idx" ON "Obra"("customerId");

-- CreateIndex
CREATE INDEX "Obra_status_idx" ON "Obra"("status");

-- CreateIndex
CREATE INDEX "Obra_companyId_status_idx" ON "Obra"("companyId", "status");

-- CreateIndex
CREATE INDEX "Obra_deletedAt_idx" ON "Obra"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Obra_companyId_codigo_key" ON "Obra"("companyId", "codigo");

-- CreateIndex
CREATE INDEX "ObraEtapa_obraId_idx" ON "ObraEtapa"("obraId");

-- CreateIndex
CREATE INDEX "ObraEtapa_obraId_ordem_idx" ON "ObraEtapa"("obraId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "ObraEtapa_obraId_codigo_key" ON "ObraEtapa"("obraId", "codigo");

-- CreateIndex
CREATE INDEX "ObraSubetapa_etapaId_idx" ON "ObraSubetapa"("etapaId");

-- CreateIndex
CREATE INDEX "ObraSubetapa_etapaId_ordem_idx" ON "ObraSubetapa"("etapaId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "ObraSubetapa_etapaId_codigo_key" ON "ObraSubetapa"("etapaId", "codigo");

-- CreateIndex
CREATE INDEX "ObraItemWBS_etapaId_idx" ON "ObraItemWBS"("etapaId");

-- CreateIndex
CREATE INDEX "ObraItemWBS_subetapaId_idx" ON "ObraItemWBS"("subetapaId");

-- CreateIndex
CREATE UNIQUE INDEX "ObraItemWBS_etapaId_codigo_key" ON "ObraItemWBS"("etapaId", "codigo");

-- CreateIndex
CREATE INDEX "CentroCusto_companyId_idx" ON "CentroCusto"("companyId");

-- CreateIndex
CREATE INDEX "CentroCusto_ativo_idx" ON "CentroCusto"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "CentroCusto_companyId_codigo_key" ON "CentroCusto"("companyId", "codigo");

-- CreateIndex
CREATE INDEX "CategoriaConstrucao_companyId_idx" ON "CategoriaConstrucao"("companyId");

-- CreateIndex
CREATE INDEX "CategoriaConstrucao_tipo_idx" ON "CategoriaConstrucao"("tipo");

-- CreateIndex
CREATE INDEX "CategoriaConstrucao_parentId_idx" ON "CategoriaConstrucao"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaConstrucao_companyId_codigo_key" ON "CategoriaConstrucao"("companyId", "codigo");

-- CreateIndex
CREATE INDEX "VersaoOrcamento_companyId_idx" ON "VersaoOrcamento"("companyId");

-- CreateIndex
CREATE INDEX "VersaoOrcamento_obraId_idx" ON "VersaoOrcamento"("obraId");

-- CreateIndex
CREATE INDEX "VersaoOrcamento_status_idx" ON "VersaoOrcamento"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VersaoOrcamento_obraId_numero_key" ON "VersaoOrcamento"("obraId", "numero");

-- CreateIndex
CREATE INDEX "ItemOrcamento_versaoId_idx" ON "ItemOrcamento"("versaoId");

-- CreateIndex
CREATE INDEX "ItemOrcamento_etapaId_idx" ON "ItemOrcamento"("etapaId");

-- CreateIndex
CREATE INDEX "ItemOrcamento_subetapaId_idx" ON "ItemOrcamento"("subetapaId");

-- CreateIndex
CREATE INDEX "ItemOrcamento_itemWbsId_idx" ON "ItemOrcamento"("itemWbsId");

-- CreateIndex
CREATE INDEX "ItemOrcamento_centroCustoId_idx" ON "ItemOrcamento"("centroCustoId");

-- CreateIndex
CREATE INDEX "ItemOrcamento_categoriaId_idx" ON "ItemOrcamento"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "TransacaoFinanceira_estornoDeId_key" ON "TransacaoFinanceira"("estornoDeId");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_companyId_idx" ON "TransacaoFinanceira"("companyId");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_obraId_idx" ON "TransacaoFinanceira"("obraId");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_obraId_status_idx" ON "TransacaoFinanceira"("obraId", "status");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_obraId_dataCompetencia_idx" ON "TransacaoFinanceira"("obraId", "dataCompetencia");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_obraId_dataReal_idx" ON "TransacaoFinanceira"("obraId", "dataReal");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_centroCustoId_idx" ON "TransacaoFinanceira"("centroCustoId");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_categoriaId_idx" ON "TransacaoFinanceira"("categoriaId");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_supplierId_idx" ON "TransacaoFinanceira"("supplierId");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_accountPayableId_idx" ON "TransacaoFinanceira"("accountPayableId");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_accountReceivableId_idx" ON "TransacaoFinanceira"("accountReceivableId");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_tipo_status_idx" ON "TransacaoFinanceira"("tipo", "status");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_dataCompetencia_idx" ON "TransacaoFinanceira"("dataCompetencia");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_dataReal_idx" ON "TransacaoFinanceira"("dataReal");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_deletedAt_idx" ON "TransacaoFinanceira"("deletedAt");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog"("companyId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AccountPayable_obraId_idx" ON "AccountPayable"("obraId");

-- CreateIndex
CREATE INDEX "AccountPayable_centroCustoId_idx" ON "AccountPayable"("centroCustoId");

-- CreateIndex
CREATE INDEX "AccountReceivable_obraId_idx" ON "AccountReceivable"("obraId");

-- CreateIndex
CREATE INDEX "AccountReceivable_centroCustoId_idx" ON "AccountReceivable"("centroCustoId");
