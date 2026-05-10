CREATE TABLE "AiConversation" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "title"     TEXT,
  "model"     TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiConversation_userId_updatedAt_idx" ON "AiConversation"("userId", "updatedAt" DESC);

CREATE TABLE "AiMessage" (
  "id"             TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role"           TEXT NOT NULL,
  "content"        TEXT NOT NULL,
  "toolCalls"      JSONB,
  "toolCallId"     TEXT,
  "toolName"       TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");

CREATE TABLE "AiPendingAction" (
  "id"             TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "conversationId" TEXT,
  "tool"           TEXT NOT NULL,
  "params"         JSONB NOT NULL,
  "description"    TEXT NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'PENDING',
  "result"         JSONB,
  "error"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt"     TIMESTAMP(3),
  CONSTRAINT "AiPendingAction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiPendingAction_userId_status_createdAt_idx" ON "AiPendingAction"("userId", "status", "createdAt" DESC);
