-- Enums CRM
CREATE TYPE "OpportunityStage" AS ENUM ('NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');
CREATE TYPE "OpportunityActivityType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK');
CREATE TYPE "OpportunityActivityStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED');

-- Enums Contratos
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED');
CREATE TYPE "BillingCycle" AS ENUM ('ONCE', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'WEEKLY');
CREATE TYPE "ServiceLevelKind" AS ENUM ('DELIVERY_TIME_HOURS', 'RESPONSE_TIME_HOURS', 'UPTIME_PERCENT', 'QUALITY_SCORE', 'CUSTOM');
CREATE TYPE "ContractEventType" AS ENUM ('CREATED', 'ACTIVATED', 'SUSPENDED', 'RESUMED', 'RENEWED', 'TERMINATED', 'EXPIRED', 'AMENDED', 'BREACH_REGISTERED', 'NOTE');

-- Opportunity
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "title" TEXT NOT NULL,
    "source" TEXT,
    "stage" "OpportunityStage" NOT NULL DEFAULT 'NEW',
    "value" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "probability" INTEGER NOT NULL DEFAULT 50,
    "expectedCloseDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "ownerUserId" TEXT,
    "sellerId" TEXT,
    "notes" TEXT,
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Opportunity_companyId_stage_idx" ON "Opportunity"("companyId", "stage");
CREATE INDEX "Opportunity_companyId_ownerUserId_idx" ON "Opportunity"("companyId", "ownerUserId");
CREATE INDEX "Opportunity_companyId_customerId_idx" ON "Opportunity"("companyId", "customerId");
CREATE INDEX "Opportunity_companyId_createdAt_idx" ON "Opportunity"("companyId", "createdAt" DESC);

-- OpportunityActivity
CREATE TABLE "OpportunityActivity" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "type" "OpportunityActivityType" NOT NULL,
    "status" "OpportunityActivityStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assignedToUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OpportunityActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OpportunityActivity_opportunityId_dueDate_idx" ON "OpportunityActivity"("opportunityId", "dueDate");
CREATE INDEX "OpportunityActivity_opportunityId_status_idx" ON "OpportunityActivity"("opportunityId", "status");

-- Contract
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "value" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'ONCE',
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "sellerId" TEXT,
    "description" TEXT,
    "terms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Contract_companyId_number_key" ON "Contract"("companyId", "number");
CREATE INDEX "Contract_companyId_status_idx" ON "Contract"("companyId", "status");
CREATE INDEX "Contract_companyId_customerId_idx" ON "Contract"("companyId", "customerId");
CREATE INDEX "Contract_companyId_endDate_idx" ON "Contract"("companyId", "endDate");

-- ServiceLevel
CREATE TABLE "ServiceLevel" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "kind" "ServiceLevelKind" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "penaltyPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceLevel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServiceLevel_contractId_idx" ON "ServiceLevel"("contractId");

-- ServiceLevelEvent
CREATE TABLE "ServiceLevelEvent" (
    "id" TEXT NOT NULL,
    "serviceLevelId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "measuredValue" DECIMAL(65,30) NOT NULL,
    "met" BOOLEAN NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceLevelEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServiceLevelEvent_serviceLevelId_occurredAt_idx" ON "ServiceLevelEvent"("serviceLevelId", "occurredAt" DESC);
CREATE INDEX "ServiceLevelEvent_serviceLevelId_met_idx" ON "ServiceLevelEvent"("serviceLevelId", "met");

-- ContractEvent
CREATE TABLE "ContractEvent" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "ContractEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContractEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContractEvent_contractId_occurredAt_idx" ON "ContractEvent"("contractId", "occurredAt" DESC);
