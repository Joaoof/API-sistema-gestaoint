-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "rrule" TEXT,
    "recurrenceUntil" TIMESTAMP(3),
    "category" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "link" TEXT,
    "channelsJson" JSONB,
    "remindersJson" JSONB,
    "metadataJson" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEventException" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "occurrence" TIMESTAMP(3) NOT NULL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "overrideJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEventException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarReminderFire" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "occurrence" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL,
    "offsetMin" INTEGER NOT NULL,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "errorMessage" TEXT,

    CONSTRAINT "CalendarReminderFire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEvent_companyId_startAt_idx" ON "CalendarEvent"("companyId", "startAt");
CREATE INDEX "CalendarEvent_companyId_endAt_idx" ON "CalendarEvent"("companyId", "endAt");
CREATE INDEX "CalendarEvent_companyId_userId_idx" ON "CalendarEvent"("companyId", "userId");
CREATE INDEX "CalendarEvent_companyId_category_idx" ON "CalendarEvent"("companyId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEventException_eventId_occurrence_key" ON "CalendarEventException"("eventId", "occurrence");
CREATE INDEX "CalendarEventException_eventId_idx" ON "CalendarEventException"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarReminderFire_eventId_occurrence_channel_offsetMin_key" ON "CalendarReminderFire"("eventId", "occurrence", "channel", "offsetMin");
CREATE INDEX "CalendarReminderFire_eventId_occurrence_idx" ON "CalendarReminderFire"("eventId", "occurrence");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_companyId_userId_idx" ON "PushSubscription"("companyId", "userId");

-- AddForeignKey
ALTER TABLE "CalendarEventException" ADD CONSTRAINT "CalendarEventException_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarReminderFire" ADD CONSTRAINT "CalendarReminderFire_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
