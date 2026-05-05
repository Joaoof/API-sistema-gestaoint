-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'STOCK_LOW',
  'ORDER_PENDING',
  'INVOICE_DUE',
  'INVOICE_OVERDUE',
  'PAYMENT_RECEIVED',
  'PAYMENT_FAILED',
  'DELIVERY_SCHEDULED',
  'DELIVERY_COMPLETED',
  'CUSTOM',
  'INFO'
);

CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'WHATSAPP', 'SMS', 'PUSH');

CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ');

-- CreateTable Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "entity" TEXT,
    "entityId" TEXT,
    "metadataJson" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_companyId_userId_readAt_idx" ON "Notification"("companyId", "userId", "readAt");
CREATE INDEX "Notification_companyId_createdAt_idx" ON "Notification"("companyId", "createdAt" DESC);
CREATE INDEX "Notification_companyId_type_idx" ON "Notification"("companyId", "type");

-- CreateTable NotificationTemplate
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationTemplate_companyId_key_channel_key" ON "NotificationTemplate"("companyId", "key", "channel");
CREATE INDEX "NotificationTemplate_companyId_idx" ON "NotificationTemplate"("companyId");

-- CreateTable MessageLog
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "direction" "MessageDirection" NOT NULL DEFAULT 'OUTBOUND',
    "toAddress" TEXT NOT NULL,
    "fromAddress" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "errorMessage" TEXT,
    "customerId" TEXT,
    "templateKey" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MessageLog_companyId_createdAt_idx" ON "MessageLog"("companyId", "createdAt" DESC);
CREATE INDEX "MessageLog_companyId_customerId_idx" ON "MessageLog"("companyId", "customerId");
CREATE INDEX "MessageLog_companyId_status_idx" ON "MessageLog"("companyId", "status");
CREATE INDEX "MessageLog_externalId_idx" ON "MessageLog"("externalId");
