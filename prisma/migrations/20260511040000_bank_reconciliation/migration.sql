CREATE TABLE "BankStatementImport" (
  "id"           TEXT NOT NULL,
  "companyId"    TEXT NOT NULL,
  "bankId"       TEXT NOT NULL,
  "fileName"     TEXT NOT NULL,
  "format"       TEXT NOT NULL DEFAULT 'OFX',
  "rangeStart"   TIMESTAMP(3) NOT NULL,
  "rangeEnd"     TIMESTAMP(3) NOT NULL,
  "totalItems"   INTEGER NOT NULL DEFAULT 0,
  "matchedItems" INTEGER NOT NULL DEFAULT 0,
  "importedBy"   TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankStatementImport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BankStatementImport_companyId_idx" ON "BankStatementImport"("companyId");
CREATE INDEX "BankStatementImport_bankId_createdAt_idx" ON "BankStatementImport"("bankId", "createdAt" DESC);

CREATE TABLE "BankStatementItem" (
  "id"             TEXT NOT NULL,
  "importId"       TEXT NOT NULL,
  "companyId"      TEXT NOT NULL,
  "bankId"         TEXT NOT NULL,
  "fitId"          TEXT,
  "trnType"        TEXT NOT NULL,
  "postedAt"       TIMESTAMP(3) NOT NULL,
  "amount"         DECIMAL(65,30) NOT NULL,
  "memo"           TEXT,
  "checkNum"       TEXT,
  "matchedStatus"  TEXT NOT NULL DEFAULT 'UNMATCHED',
  "cashMovementId" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankStatementItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BankStatementItem_companyId_idx" ON "BankStatementItem"("companyId");
CREATE INDEX "BankStatementItem_importId_idx" ON "BankStatementItem"("importId");
CREATE INDEX "BankStatementItem_bankId_fitId_idx" ON "BankStatementItem"("bankId", "fitId");
CREATE INDEX "BankStatementItem_matchedStatus_idx" ON "BankStatementItem"("matchedStatus");
