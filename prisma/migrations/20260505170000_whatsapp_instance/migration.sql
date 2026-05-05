CREATE TYPE "WhatsappInstanceStatus" AS ENUM (
  'DISCONNECTED',
  'CONNECTING',
  'QR_PENDING',
  'CONNECTED',
  'ERROR'
);

CREATE TABLE "WhatsappInstance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "status" "WhatsappInstanceStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "qrCode" TEXT,
    "phone" TEXT,
    "profileName" TEXT,
    "profilePicUrl" TEXT,
    "lastError" TEXT,
    "webhookToken" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappInstance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsappInstance_companyId_key" ON "WhatsappInstance"("companyId");
CREATE UNIQUE INDEX "WhatsappInstance_instanceName_key" ON "WhatsappInstance"("instanceName");
