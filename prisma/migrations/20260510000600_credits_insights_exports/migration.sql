-- AiCreditAccount
CREATE TABLE "AiCreditAccount" (
  "id"             TEXT NOT NULL,
  "companyId"      TEXT NOT NULL,
  "balance"        INTEGER NOT NULL DEFAULT 0,
  "lowThreshold"   INTEGER NOT NULL DEFAULT 50,
  "totalPurchased" INTEGER NOT NULL DEFAULT 0,
  "totalConsumed"  INTEGER NOT NULL DEFAULT 0,
  "lowNotifiedAt"  TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiCreditAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AiCreditAccount_companyId_key" ON "AiCreditAccount"("companyId");

-- AiCreditTransaction
CREATE TABLE "AiCreditTransaction" (
  "id"           TEXT NOT NULL,
  "accountId"    TEXT NOT NULL,
  "companyId"    TEXT NOT NULL,
  "kind"         TEXT NOT NULL,
  "amount"       INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "refType"      TEXT,
  "refId"        TEXT,
  "description"  TEXT NOT NULL,
  "userId"       TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiCreditTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiCreditTransaction_companyId_createdAt_idx" ON "AiCreditTransaction"("companyId", "createdAt" DESC);
CREATE INDEX "AiCreditTransaction_accountId_createdAt_idx" ON "AiCreditTransaction"("accountId", "createdAt" DESC);

-- AiCreditPurchase
CREATE TABLE "AiCreditPurchase" (
  "id"              TEXT NOT NULL,
  "accountId"       TEXT NOT NULL,
  "companyId"       TEXT NOT NULL,
  "packageBrl"      INTEGER NOT NULL,
  "creditsBase"     INTEGER NOT NULL,
  "creditsBonus"    INTEGER NOT NULL DEFAULT 0,
  "creditsTotal"    INTEGER NOT NULL,
  "pixKey"          TEXT NOT NULL,
  "pixCopyPaste"    TEXT NOT NULL,
  "pixTxid"         TEXT NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'PENDING',
  "paidAt"          TIMESTAMP(3),
  "paidByUserId"    TEXT,
  "createdByUserId" TEXT NOT NULL,
  "notes"           TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiCreditPurchase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AiCreditPurchase_pixTxid_key" ON "AiCreditPurchase"("pixTxid");
CREATE INDEX "AiCreditPurchase_companyId_status_createdAt_idx" ON "AiCreditPurchase"("companyId", "status", "createdAt" DESC);
CREATE INDEX "AiCreditPurchase_status_createdAt_idx" ON "AiCreditPurchase"("status", "createdAt" DESC);

-- ExportTemplate
CREATE TABLE "ExportTemplate" (
  "id"        TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "module"    TEXT NOT NULL,
  "format"    TEXT NOT NULL,
  "filters"   JSONB NOT NULL,
  "columns"   JSONB NOT NULL,
  "schedule"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExportTemplate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ExportTemplate_companyId_idx" ON "ExportTemplate"("companyId");
CREATE INDEX "ExportTemplate_userId_idx" ON "ExportTemplate"("userId");

-- Insight
CREATE TABLE "Insight" (
  "id"                TEXT NOT NULL,
  "companyId"         TEXT NOT NULL,
  "kind"              TEXT NOT NULL,
  "title"             TEXT NOT NULL,
  "body"              TEXT NOT NULL,
  "metricsJson"       JSONB,
  "generatedByModel"  TEXT NOT NULL,
  "creditsCost"       INTEGER NOT NULL DEFAULT 0,
  "deliveredChannels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Insight_companyId_kind_createdAt_idx" ON "Insight"("companyId", "kind", "createdAt" DESC);
