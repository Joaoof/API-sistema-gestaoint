-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM (
  'INCOME',
  'EXPENSE',
  'ASSET',
  'LIABILITY',
  'EQUITY'
);

-- CreateTable: CompanySettings
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "locale" TEXT NOT NULL DEFAULT 'pt-BR',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "dateFormat" TEXT NOT NULL DEFAULT 'dd/MM/yyyy',
    "timeFormat" TEXT NOT NULL DEFAULT 'HH:mm',
    "numberDecimals" INTEGER NOT NULL DEFAULT 2,
    "numberDecimalSep" TEXT NOT NULL DEFAULT ',',
    "numberThousandSep" TEXT NOT NULL DEFAULT '.',
    "weekStartsOn" INTEGER NOT NULL DEFAULT 0,
    "fiscalYearStartMonth" INTEGER NOT NULL DEFAULT 1,
    "defaultPageSize" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_companyId_key" ON "CompanySettings"("companyId");

-- CreateTable: FinancialAccount
CREATE TABLE "FinancialAccount" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialAccountType" NOT NULL,
    "parentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_companyId_code_key" ON "FinancialAccount"("companyId", "code");
CREATE INDEX "FinancialAccount_companyId_type_idx" ON "FinancialAccount"("companyId", "type");
CREATE INDEX "FinancialAccount_companyId_parentId_idx" ON "FinancialAccount"("companyId", "parentId");
