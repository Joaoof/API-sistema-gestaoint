CREATE TABLE "WhatsappContact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "number" TEXT,
    "name" TEXT,
    "pushName" TEXT,
    "isMyContact" BOOLEAN NOT NULL DEFAULT false,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsappContact_companyId_jid_key" ON "WhatsappContact"("companyId", "jid");
CREATE INDEX "WhatsappContact_companyId_number_idx" ON "WhatsappContact"("companyId", "number");

ALTER TABLE "WhatsappContact" ADD CONSTRAINT "WhatsappContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
