-- =====================================================================
--  WhatsappInstance: per-tenant Evolution serverUrl
--  Cada empresa pode apontar pra seu próprio Evolution Manager.
--  apiKey continua em CompanyModuleOverride (módulo chatbot_evolution,
--  campo apiKey criptografado AES-256-GCM).
-- =====================================================================

ALTER TABLE "WhatsappInstance"
  ADD COLUMN IF NOT EXISTS "serverUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);
