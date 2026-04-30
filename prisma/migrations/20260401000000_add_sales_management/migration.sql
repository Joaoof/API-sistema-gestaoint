-- Migration: add_sales_management
-- Tabelas Sale, Seller, SalesCatalogProduct, CommissionRuleConfig + enum CommissionRuleType
-- Esta migration foi originalmente aplicada em produção mas o arquivo local estava
-- vazio (placeholder). Aqui está o SQL real que reproduz o estado atual do banco.
-- Idempotente: usa IF NOT EXISTS / IF EXISTS para ser seguro de re-rodar.

-- ─── Drop das tabelas antigas que existiam na migration inicial ────────
-- Se ainda existirem como TABLE, dropam. Se viraram MATERIALIZED VIEW depois,
-- são gerenciadas pelo cron em main.ts (não pelo Prisma).
DROP TABLE IF EXISTS "auth_login_view" CASCADE;
DROP TABLE IF EXISTS "mv_cash_movements_per_user" CASCADE;

-- ─── Enum CommissionRuleType ────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "CommissionRuleType" AS ENUM ('PERCENTAGE', 'FIXED_PER_SALE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── CommissionRuleConfig ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CommissionRuleConfig" (
  "id"                    TEXT NOT NULL,
  "key"                   TEXT NOT NULL,
  "commissionType"        "CommissionRuleType" NOT NULL,
  "commissionValue"       DECIMAL(65,30) NOT NULL,
  "pointsPerCurrencyUnit" DECIMAL(65,30) NOT NULL DEFAULT 1,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommissionRuleConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommissionRuleConfig_key_key"
  ON "CommissionRuleConfig"("key");

-- ─── Seller ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Seller" (
  "id"              TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "email"           TEXT NOT NULL,
  "active"          BOOLEAN NOT NULL DEFAULT true,
  "totalCommission" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "totalPoints"     INTEGER NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Seller_email_key" ON "Seller"("email");

-- ─── SalesCatalogProduct ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SalesCatalogProduct" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "sku"       TEXT NOT NULL,
  "unitPrice" DECIMAL(65,30) NOT NULL,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesCatalogProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SalesCatalogProduct_sku_key"
  ON "SalesCatalogProduct"("sku");

-- ─── Sale ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Sale" (
  "id"               TEXT NOT NULL,
  "sellerId"         TEXT NOT NULL,
  "totalAmount"      DECIMAL(65,30) NOT NULL,
  "commissionAmount" DECIMAL(65,30) NOT NULL,
  "pointsEarned"     INTEGER NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Sale_sellerId_createdAt_idx"
  ON "Sale"("sellerId", "createdAt" DESC);

-- ─── SaleItem ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SaleItem" (
  "id"         TEXT NOT NULL,
  "saleId"     TEXT NOT NULL,
  "productId"  TEXT NOT NULL,
  "quantity"   INTEGER NOT NULL,
  "unitPrice"  DECIMAL(65,30) NOT NULL,
  "totalPrice" DECIMAL(65,30) NOT NULL,
  CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SaleItem_productId_idx" ON "SaleItem"("productId");
CREATE INDEX IF NOT EXISTS "SaleItem_saleId_idx"    ON "SaleItem"("saleId");

-- Nota: relationMode = "prisma" no schema, então NÃO criamos foreign keys
-- físicas. Prisma faz integridade referencial em nível de aplicação.
