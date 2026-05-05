CREATE TABLE "WhatsappReminder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "peerNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "tag" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "doneAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappReminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WhatsappReminder_companyId_dueAt_idx" ON "WhatsappReminder"("companyId", "dueAt");
CREATE INDEX "WhatsappReminder_companyId_peerNumber_idx" ON "WhatsappReminder"("companyId", "peerNumber");
CREATE INDEX "WhatsappReminder_companyId_doneAt_idx" ON "WhatsappReminder"("companyId", "doneAt");
