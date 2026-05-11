-- =====================================================================
--  INTEGRAÇÕES BANCÁRIAS — webhooks + Open Finance
-- =====================================================================

CREATE TABLE "BankConnection" (
  "id"              TEXT NOT NULL,
  "companyId"       TEXT NOT NULL,
  "bankId"          TEXT,
  "provider"        TEXT NOT NULL,
  "externalItemId"  TEXT NOT NULL,
  "externalAccount" TEXT,
  "institutionName" TEXT,
  "status"          TEXT NOT NULL DEFAULT 'PENDING',
  "lastSyncAt"      TIMESTAMP(3),
  "lastErrorAt"     TIMESTAMP(3),
  "lastErrorMsg"    TEXT,
  "metadata"        JSONB,
  "createdByUserId" TEXT NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BankConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BankConnection_provider_externalItemId_key"
  ON "BankConnection"("provider", "externalItemId");
CREATE INDEX "BankConnection_companyId_idx" ON "BankConnection"("companyId");
CREATE INDEX "BankConnection_companyId_status_idx" ON "BankConnection"("companyId", "status");

CREATE TABLE "WebhookLog" (
  "id"          TEXT NOT NULL,
  "provider"    TEXT NOT NULL,
  "event"       TEXT NOT NULL,
  "signature"   TEXT,
  "payload"     JSONB NOT NULL,
  "processed"   BOOLEAN NOT NULL DEFAULT false,
  "errorMsg"    TEXT,
  "refType"     TEXT,
  "refId"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WebhookLog_provider_createdAt_idx" ON "WebhookLog"("provider", "createdAt" DESC);
CREATE INDEX "WebhookLog_processed_createdAt_idx" ON "WebhookLog"("processed", "createdAt");
