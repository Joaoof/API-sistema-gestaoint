CREATE TABLE "CompanyReminder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "link" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "doneAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyReminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompanyReminder_companyId_dueAt_idx" ON "CompanyReminder"("companyId", "dueAt");
CREATE INDEX "CompanyReminder_companyId_doneAt_idx" ON "CompanyReminder"("companyId", "doneAt");
