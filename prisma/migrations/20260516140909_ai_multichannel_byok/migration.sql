-- =====================================================================
--  AI multi-canal + BYOK por tenant + pool de créditos separado
--
--  Suporte ao bot WhatsApp (Evolution) reusando AiChatService:
--   - AiConversation/AiPendingAction passam a ter channel/peerNumber e
--     userId opcional (msg do Zap não tem usuário do sistema).
--   - AiCreditAccount ganha pool whatsappBalance separado do balance web.
--   - AiCreditTransaction passa a marcar de qual canal foi o consumo.
--
--  Idempotente: usa IF NOT EXISTS / DROP NOT NULL onde possível.
-- =====================================================================

-- ============ AiConversation ============
ALTER TABLE "AiConversation" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "AiConversation" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'web';
ALTER TABLE "AiConversation" ADD COLUMN IF NOT EXISTS "peerNumber" TEXT;
CREATE INDEX IF NOT EXISTS "AiConversation_companyId_channel_peerNumber_updatedAt_idx"
  ON "AiConversation" ("companyId", "channel", "peerNumber", "updatedAt" DESC);

-- ============ AiPendingAction ============
ALTER TABLE "AiPendingAction" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "AiPendingAction" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'web';
ALTER TABLE "AiPendingAction" ADD COLUMN IF NOT EXISTS "peerNumber" TEXT;
CREATE INDEX IF NOT EXISTS "AiPendingAction_companyId_status_createdAt_idx"
  ON "AiPendingAction" ("companyId", "status", "createdAt" DESC);

-- ============ AiCreditAccount ============
ALTER TABLE "AiCreditAccount" ADD COLUMN IF NOT EXISTS "whatsappBalance" INTEGER NOT NULL DEFAULT 0;

-- ============ AiCreditTransaction ============
ALTER TABLE "AiCreditTransaction" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'web';
CREATE INDEX IF NOT EXISTS "AiCreditTransaction_companyId_channel_createdAt_idx"
  ON "AiCreditTransaction" ("companyId", "channel", "createdAt" DESC);
