CREATE TABLE "WhatsappChatbotRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "pattern" TEXT,
    "responseBody" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "applyTags" TEXT[],
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT false,
    "businessHoursStart" TEXT,
    "businessHoursEnd" TEXT,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappChatbotRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WhatsappChatbotRule_companyId_enabled_priority_idx" ON "WhatsappChatbotRule"("companyId", "enabled", "priority");

CREATE TABLE "WhatsappChatbotLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "peerNumber" TEXT NOT NULL,
    "triggerText" TEXT,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappChatbotLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WhatsappChatbotLog_companyId_peerNumber_firedAt_idx" ON "WhatsappChatbotLog"("companyId", "peerNumber", "firedAt");
CREATE INDEX "WhatsappChatbotLog_ruleId_idx" ON "WhatsappChatbotLog"("ruleId");
