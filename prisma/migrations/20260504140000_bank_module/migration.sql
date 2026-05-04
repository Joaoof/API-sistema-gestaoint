-- CreateEnum: BankAccountType (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BankAccountType') THEN
    CREATE TYPE "public"."BankAccountType" AS ENUM (
      'CHECKING',
      'SAVINGS',
      'WALLET',
      'INVESTMENT',
      'OTHER'
    );
  END IF;
END$$;

-- CreateTable: Bank
CREATE TABLE IF NOT EXISTS "public"."Bank" (
    "id"            TEXT NOT NULL,
    "user_id"       TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "tipo"          "public"."BankAccountType" NOT NULL DEFAULT 'CHECKING',
    "agencia"       TEXT,
    "conta"         TEXT,
    "digito"        TEXT,
    "titular"       TEXT,
    "documento"     TEXT,
    "pixKey"        TEXT,
    "saldoInicial"  DECIMAL(65,30) NOT NULL DEFAULT 0,
    "corHex"        TEXT NOT NULL DEFAULT '#3B82F6',
    "ativo"         BOOLEAN NOT NULL DEFAULT true,
    "observacoes"   TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Bank
CREATE INDEX IF NOT EXISTS "Bank_user_id_idx"        ON "public"."Bank" ("user_id");
CREATE INDEX IF NOT EXISTS "Bank_user_id_ativo_idx"  ON "public"."Bank" ("user_id", "ativo");
CREATE INDEX IF NOT EXISTS "Bank_name_idx"           ON "public"."Bank" ("name");

-- AlterTable: CashMovement (adicionar bankId opcional)
ALTER TABLE "public"."CashMovement"
  ADD COLUMN IF NOT EXISTS "bankId" TEXT;

-- CreateIndex: CashMovement.bankId
CREATE INDEX IF NOT EXISTS "CashMovement_bankId_idx" ON "public"."CashMovement" ("bankId");
