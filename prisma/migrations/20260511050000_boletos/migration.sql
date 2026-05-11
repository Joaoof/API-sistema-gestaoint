CREATE TABLE "Boleto" (
  "id"                  TEXT NOT NULL,
  "companyId"           TEXT NOT NULL,
  "accountReceivableId" TEXT,
  "customerId"          TEXT,
  "bankId"              TEXT NOT NULL,
  "provider"            TEXT NOT NULL,
  "providerBoletoId"    TEXT,
  "nossoNumero"         TEXT,
  "barcode"             TEXT,
  "digitableLine"       TEXT,
  "pdfUrl"              TEXT,
  "amount"              DECIMAL(65,30) NOT NULL,
  "dueDate"             TIMESTAMP(3) NOT NULL,
  "status"              TEXT NOT NULL DEFAULT 'DRAFT',
  "errorMessage"        TEXT,
  "payerName"           TEXT NOT NULL,
  "payerDocument"       TEXT NOT NULL,
  "instructions"        TEXT,
  "registeredAt"        TIMESTAMP(3),
  "paidAt"              TIMESTAMP(3),
  "canceledAt"          TIMESTAMP(3),
  "createdByUserId"     TEXT NOT NULL,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Boleto_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Boleto_companyId_idx" ON "Boleto"("companyId");
CREATE INDEX "Boleto_companyId_status_idx" ON "Boleto"("companyId", "status");
CREATE INDEX "Boleto_accountReceivableId_idx" ON "Boleto"("accountReceivableId");
CREATE INDEX "Boleto_providerBoletoId_idx" ON "Boleto"("providerBoletoId");

CREATE TABLE "BoletoEvent" (
  "id"        TEXT NOT NULL,
  "boletoId"  TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "kind"      TEXT NOT NULL,
  "payload"   JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BoletoEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BoletoEvent_boletoId_createdAt_idx" ON "BoletoEvent"("boletoId", "createdAt" DESC);
