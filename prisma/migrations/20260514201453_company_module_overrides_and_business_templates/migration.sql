-- =====================================================================
--  Multi-tenant feature flags por empresa + Business Templates
--  - CompanyModuleOverride: liga/desliga módulo independente do plano,
--    com config Json criptografada pela aplicação (tokens IA, Typebot).
--  - BusinessTemplate + TemplateModule: receitas por tipo de negócio
--    (Lanchonete, Oficina, Construtora...) aplicáveis a uma empresa.
-- =====================================================================

CREATE TABLE "CompanyModuleOverride" (
  "id"         TEXT NOT NULL,
  "companyId"  TEXT NOT NULL,
  "module_key" TEXT NOT NULL,
  "enabled"    BOOLEAN NOT NULL DEFAULT true,
  "config"     JSONB,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CompanyModuleOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyModuleOverride_companyId_module_key_key"
  ON "CompanyModuleOverride" ("companyId", "module_key");

CREATE INDEX "CompanyModuleOverride_companyId_idx"
  ON "CompanyModuleOverride" ("companyId");

CREATE INDEX "CompanyModuleOverride_module_key_idx"
  ON "CompanyModuleOverride" ("module_key");

ALTER TABLE "CompanyModuleOverride"
  ADD CONSTRAINT "CompanyModuleOverride_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------

CREATE TABLE "BusinessTemplate" (
  "id"           TEXT NOT NULL,
  "template_key" TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "description"  TEXT,
  "icon"         TEXT,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BusinessTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessTemplate_template_key_key"
  ON "BusinessTemplate" ("template_key");

-- ----------------------------------------------------------------------

CREATE TABLE "TemplateModule" (
  "id"         TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "module_key" TEXT NOT NULL,
  "enabled"    BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "TemplateModule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TemplateModule_templateId_module_key_key"
  ON "TemplateModule" ("templateId", "module_key");

CREATE INDEX "TemplateModule_templateId_idx"
  ON "TemplateModule" ("templateId");

ALTER TABLE "TemplateModule"
  ADD CONSTRAINT "TemplateModule_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "BusinessTemplate"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
