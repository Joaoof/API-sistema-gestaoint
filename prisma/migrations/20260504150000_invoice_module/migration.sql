-- =====================================================================
-- Módulo Fiscal: NFe / NFCe / NFSe
-- Idempotente — pode ser reaplicado sem efeitos colaterais.
-- =====================================================================

-- CreateEnum: InvoiceType
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceType') THEN
    CREATE TYPE "public"."InvoiceType" AS ENUM ('NFE', 'NFCE', 'NFSE');
  END IF;
END$$;

-- CreateEnum: InvoiceStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceStatus') THEN
    CREATE TYPE "public"."InvoiceStatus" AS ENUM (
      'PENDING',
      'PROCESSING',
      'AUTHORIZED',
      'REJECTED',
      'CANCELED',
      'ERROR'
    );
  END IF;
END$$;

-- CreateEnum: FiscalEnvironment
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FiscalEnvironment') THEN
    CREATE TYPE "public"."FiscalEnvironment" AS ENUM ('HOMOLOG', 'PRODUCTION');
  END IF;
END$$;

-- CreateEnum: TaxRegime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaxRegime') THEN
    CREATE TYPE "public"."TaxRegime" AS ENUM (
      'SIMPLES_NACIONAL',
      'SIMPLES_NACIONAL_EXCESSO',
      'REGIME_NORMAL',
      'MEI'
    );
  END IF;
END$$;

-- CreateTable: CompanyFiscalConfig
CREATE TABLE IF NOT EXISTS "public"."CompanyFiscalConfig" (
    "id"                       TEXT NOT NULL,
    "companyId"                TEXT NOT NULL,
    "ambiente"                 "public"."FiscalEnvironment" NOT NULL DEFAULT 'HOMOLOG',
    "regimeTributario"         "public"."TaxRegime" NOT NULL DEFAULT 'SIMPLES_NACIONAL',
    "cnpj"                     TEXT NOT NULL,
    "inscricaoEstadual"        TEXT,
    "inscricaoMunicipal"       TEXT,
    "razaoSocial"              TEXT,
    "nomeFantasia"             TEXT,
    "endereco"                 TEXT,
    "numero"                   TEXT,
    "complemento"              TEXT,
    "bairro"                   TEXT,
    "cidade"                   TEXT,
    "codigoMunicipioIbge"      TEXT,
    "uf"                       TEXT,
    "cep"                      TEXT,
    "serieNfe"                 INTEGER NOT NULL DEFAULT 1,
    "proximoNumeroNfe"         INTEGER NOT NULL DEFAULT 1,
    "serieNfce"                INTEGER NOT NULL DEFAULT 1,
    "proximoNumeroNfce"        INTEGER NOT NULL DEFAULT 1,
    "serieNfse"                INTEGER NOT NULL DEFAULT 1,
    "proximoNumeroNfse"        INTEGER NOT NULL DEFAULT 1,
    "cscNfce"                  TEXT,
    "cscIdNfce"                TEXT,
    "certificadoB64"           TEXT,
    "certificadoSenhaCifrada"  TEXT,
    "certificadoValidoAte"     TIMESTAMP(3),
    "providerName"             TEXT,
    "providerApiToken"         TEXT,
    "providerCnpjReference"    TEXT,
    "providerWebhookSecret"    TEXT,
    "ativo"                    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyFiscalConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompanyFiscalConfig_companyId_key"
  ON "public"."CompanyFiscalConfig" ("companyId");

CREATE INDEX IF NOT EXISTS "CompanyFiscalConfig_cnpj_idx"
  ON "public"."CompanyFiscalConfig" ("cnpj");

-- CreateTable: Invoice
CREATE TABLE IF NOT EXISTS "public"."Invoice" (
    "id"                     TEXT NOT NULL,
    "companyId"              TEXT NOT NULL,
    "userId"                 TEXT,
    "orderId"                TEXT,
    "type"                   "public"."InvoiceType" NOT NULL,
    "status"                 "public"."InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "ambiente"               "public"."FiscalEnvironment" NOT NULL DEFAULT 'HOMOLOG',
    "numero"                 INTEGER,
    "serie"                  INTEGER,
    "chaveAcesso"            TEXT,
    "protocoloAutorizacao"   TEXT,
    "protocoloCancelamento"  TEXT,
    "motivoCancelamento"     TEXT,
    "dataEmissao"            TIMESTAMP(3),
    "dataAutorizacao"        TIMESTAMP(3),
    "dataCancelamento"       TIMESTAMP(3),
    "recipientName"          TEXT NOT NULL,
    "recipientDocument"      TEXT,
    "recipientEmail"         TEXT,
    "recipientAddress"       TEXT,
    "recipientCity"          TEXT,
    "recipientUf"            TEXT,
    "recipientZip"           TEXT,
    "naturezaOperacao"       TEXT NOT NULL DEFAULT 'Venda',
    "paymentMethod"          TEXT,
    "valorProdutos"          DECIMAL(18,2) NOT NULL DEFAULT 0,
    "valorDesconto"          DECIMAL(18,2) NOT NULL DEFAULT 0,
    "valorFrete"             DECIMAL(18,2) NOT NULL DEFAULT 0,
    "valorTotal"             DECIMAL(18,2) NOT NULL DEFAULT 0,
    "observacoes"            TEXT,
    "providerName"           TEXT,
    "providerRef"            TEXT,
    "providerRawJson"        JSONB,
    "xmlUrl"                 TEXT,
    "danfeUrl"               TEXT,
    "errorMessage"           TEXT,
    "errorCode"              TEXT,
    "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_chaveAcesso_key"
  ON "public"."Invoice" ("chaveAcesso");

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_companyId_type_serie_numero_key"
  ON "public"."Invoice" ("companyId", "type", "serie", "numero");

CREATE INDEX IF NOT EXISTS "Invoice_companyId_idx"
  ON "public"."Invoice" ("companyId");
CREATE INDEX IF NOT EXISTS "Invoice_companyId_type_idx"
  ON "public"."Invoice" ("companyId", "type");
CREATE INDEX IF NOT EXISTS "Invoice_companyId_status_idx"
  ON "public"."Invoice" ("companyId", "status");
CREATE INDEX IF NOT EXISTS "Invoice_orderId_idx"
  ON "public"."Invoice" ("orderId");
CREATE INDEX IF NOT EXISTS "Invoice_userId_idx"
  ON "public"."Invoice" ("userId");
CREATE INDEX IF NOT EXISTS "Invoice_providerRef_idx"
  ON "public"."Invoice" ("providerRef");
CREATE INDEX IF NOT EXISTS "Invoice_createdAt_idx"
  ON "public"."Invoice" ("createdAt" DESC);

-- CreateTable: InvoiceItem
CREATE TABLE IF NOT EXISTS "public"."InvoiceItem" (
    "id"               TEXT NOT NULL,
    "invoiceId"        TEXT NOT NULL,
    "productId"        TEXT,
    "ordem"            INTEGER NOT NULL DEFAULT 0,
    "codigo"           TEXT NOT NULL,
    "descricao"        TEXT NOT NULL,
    "ncm"              TEXT,
    "cfop"             TEXT,
    "cest"             TEXT,
    "unidade"          TEXT NOT NULL DEFAULT 'UN',
    "quantidade"       DECIMAL(18,4) NOT NULL,
    "valorUnitario"    DECIMAL(18,4) NOT NULL,
    "valorDesconto"    DECIMAL(18,2) NOT NULL DEFAULT 0,
    "valorTotal"       DECIMAL(18,2) NOT NULL,
    "origemMercadoria" TEXT,
    "csosn"            TEXT,
    "cstIcms"          TEXT,
    "aliquotaIcms"     DECIMAL(5,2),

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx"
  ON "public"."InvoiceItem" ("invoiceId");
CREATE INDEX IF NOT EXISTS "InvoiceItem_productId_idx"
  ON "public"."InvoiceItem" ("productId");
