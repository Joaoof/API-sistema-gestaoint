-- Adiciona novos valores ao enum MovementTypePayment
ALTER TYPE "public"."MovementTypePayment" ADD VALUE IF NOT EXISTS 'BANK_TRANSFER';
ALTER TYPE "public"."MovementTypePayment" ADD VALUE IF NOT EXISTS 'BANK_SLIP';
ALTER TYPE "public"."MovementTypePayment" ADD VALUE IF NOT EXISTS 'CHECK';

-- Cria o enum MovementStatus (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MovementStatus') THEN
    CREATE TYPE "public"."MovementStatus" AS ENUM (
      'PENDING',
      'COMPLETED',
      'SCHEDULED',
      'CANCELED',
      'OVERDUE'
    );
  END IF;
END$$;

-- Adiciona novas colunas em CashMovement
ALTER TABLE "public"."CashMovement"
  ADD COLUMN IF NOT EXISTS "status"               "public"."MovementStatus" NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN IF NOT EXISTS "referenceCode"        TEXT,
  ADD COLUMN IF NOT EXISTS "counterpartyName"     TEXT,
  ADD COLUMN IF NOT EXISTS "counterpartyDocument" TEXT,
  ADD COLUMN IF NOT EXISTS "notes"                TEXT,
  ADD COLUMN IF NOT EXISTS "attachmentUrl"        TEXT,
  ADD COLUMN IF NOT EXISTS "dueDate"              TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paidAt"               TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Índices para suportar os filtros do histórico
CREATE INDEX IF NOT EXISTS "CashMovement_user_id_status_idx"   ON "public"."CashMovement" ("user_id", "status");
CREATE INDEX IF NOT EXISTS "CashMovement_user_id_category_idx" ON "public"."CashMovement" ("user_id", "category");
CREATE INDEX IF NOT EXISTS "CashMovement_user_id_type_idx"     ON "public"."CashMovement" ("user_id", "type");
CREATE INDEX IF NOT EXISTS "CashMovement_referenceCode_idx"    ON "public"."CashMovement" ("referenceCode");
