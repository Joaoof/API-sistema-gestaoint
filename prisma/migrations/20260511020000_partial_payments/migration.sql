-- =====================================================================
--  PAGAMENTO PARCIAL — Sessão 2
--  Adiciona paidAmount em AR/AP + nova tabela PaymentReceipt para histórico.
-- =====================================================================

-- AR / AP: campo de saldo pago (derivado mas mantido para performance)
ALTER TABLE "AccountReceivable" ADD COLUMN "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "AccountPayable"    ADD COLUMN "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Backfill: AR/AP já PAID herdam paidAmount = amount
UPDATE "AccountReceivable" SET "paidAmount" = "amount" WHERE "status" = 'PAID';
UPDATE "AccountPayable"    SET "paidAmount" = "amount" WHERE "status" = 'PAID';

-- PaymentReceipt: histórico de recibos (1 AR/AP pode ter N parcelas)
CREATE TABLE "PaymentReceipt" (
  "id"                  TEXT NOT NULL,
  "companyId"           TEXT NOT NULL,
  "accountReceivableId" TEXT,
  "accountPayableId"    TEXT,
  "amount"              DECIMAL(65,30) NOT NULL,
  "paymentMethod"       "MovementTypePayment" NOT NULL,
  "bankId"              TEXT,
  "paidAt"              TIMESTAMP(3) NOT NULL,
  "notes"               TEXT,
  "cashMovementId"      TEXT,
  "createdByUserId"     TEXT NOT NULL,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentReceipt_companyId_idx" ON "PaymentReceipt"("companyId");
CREATE INDEX "PaymentReceipt_accountReceivableId_idx" ON "PaymentReceipt"("accountReceivableId");
CREATE INDEX "PaymentReceipt_accountPayableId_idx" ON "PaymentReceipt"("accountPayableId");
CREATE INDEX "PaymentReceipt_cashMovementId_idx" ON "PaymentReceipt"("cashMovementId");

-- Constraint: cada receipt tem que estar vinculado a AR ou AP (não ambos, não nenhum)
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_account_xor"
  CHECK (
    ("accountReceivableId" IS NOT NULL AND "accountPayableId" IS NULL)
    OR ("accountReceivableId" IS NULL AND "accountPayableId" IS NOT NULL)
  );
