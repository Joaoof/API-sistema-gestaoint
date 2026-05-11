-- =====================================================================
--  TENANT ISOLATION — Parte 2 (10 modelos restantes)
--  Mesma estratégia da parte 1: ADD nullable → backfill → assert → NOT NULL → indexes.
-- =====================================================================

-- ============ Category ============
ALTER TABLE "Category" ADD COLUMN "companyId" TEXT;
UPDATE "Category" c SET "companyId" = COALESCE(
  (SELECT u."company_id" FROM "Users" u WHERE u.id = c."userId"),
  (SELECT id FROM "Company" ORDER BY "createdAt" ASC LIMIT 1)
);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM "Category" WHERE "companyId" IS NULL) THEN
  RAISE EXCEPTION 'Backfill incompleto em Category'; END IF; END $$;
ALTER TABLE "Category" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX "Category_companyId_idx" ON "Category"("companyId");
CREATE INDEX "Category_companyId_status_idx" ON "Category"("companyId", "status");
DROP INDEX IF EXISTS "idx_category_status";

-- ============ Supplier ============
ALTER TABLE "Supplier" ADD COLUMN "companyId" TEXT;
-- Sem createdBy nem user ref; pega via primeiro Product/AP do supplier
UPDATE "Supplier" s SET "companyId" = COALESCE(
  (SELECT p."companyId" FROM "Product" p WHERE p."supplierId" = s.id LIMIT 1),
  (SELECT ap."companyId" FROM "AccountPayable" ap WHERE ap."supplierId" = s.id LIMIT 1),
  (SELECT id FROM "Company" ORDER BY "createdAt" ASC LIMIT 1)
);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM "Supplier" WHERE "companyId" IS NULL) THEN
  RAISE EXCEPTION 'Backfill incompleto em Supplier'; END IF; END $$;
ALTER TABLE "Supplier" ALTER COLUMN "companyId" SET NOT NULL;
-- Troca uniques globais por compostos
ALTER TABLE "Supplier" DROP CONSTRAINT IF EXISTS "Supplier_name_key";
ALTER TABLE "Supplier" DROP CONSTRAINT IF EXISTS "Supplier_email_key";
CREATE UNIQUE INDEX "Supplier_companyId_name_key" ON "Supplier"("companyId", "name");
CREATE INDEX "Supplier_companyId_idx" ON "Supplier"("companyId");

-- ============ Driver ============
ALTER TABLE "Driver" ADD COLUMN "companyId" TEXT;
UPDATE "Driver" d SET "companyId" = COALESCE(
  (SELECT o."companyId" FROM "Order" o
     JOIN "Delivery" del ON del."orderId" = o.id
    WHERE del."driverId" = d.id LIMIT 1),
  (SELECT id FROM "Company" ORDER BY "createdAt" ASC LIMIT 1)
);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM "Driver" WHERE "companyId" IS NULL) THEN
  RAISE EXCEPTION 'Backfill incompleto em Driver'; END IF; END $$;
ALTER TABLE "Driver" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX "Driver_companyId_idx" ON "Driver"("companyId");
CREATE INDEX "Driver_companyId_active_idx" ON "Driver"("companyId", "active");
DROP INDEX IF EXISTS "Driver_active_idx";

-- ============ Seller ============
ALTER TABLE "Seller" ADD COLUMN "companyId" TEXT;
UPDATE "Seller" s SET "companyId" = COALESCE(
  (SELECT o."companyId" FROM "Order" o WHERE o."sellerId" = s.id LIMIT 1),
  (SELECT id FROM "Company" ORDER BY "createdAt" ASC LIMIT 1)
);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM "Seller" WHERE "companyId" IS NULL) THEN
  RAISE EXCEPTION 'Backfill incompleto em Seller'; END IF; END $$;
ALTER TABLE "Seller" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Seller" DROP CONSTRAINT IF EXISTS "Seller_email_key";
CREATE INDEX "Seller_companyId_idx" ON "Seller"("companyId");
CREATE INDEX "Seller_companyId_active_idx" ON "Seller"("companyId", "active");
DROP INDEX IF EXISTS "Seller_active_idx";

-- ============ Inventory ============
ALTER TABLE "Inventory" ADD COLUMN "companyId" TEXT;
UPDATE "Inventory" i SET "companyId" = COALESCE(
  (SELECT p."companyId" FROM "Product" p WHERE p.id = i."productId"),
  (SELECT id FROM "Company" ORDER BY "createdAt" ASC LIMIT 1)
);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM "Inventory" WHERE "companyId" IS NULL) THEN
  RAISE EXCEPTION 'Backfill incompleto em Inventory'; END IF; END $$;
ALTER TABLE "Inventory" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX "Inventory_companyId_idx" ON "Inventory"("companyId");

-- ============ Bank ============
ALTER TABLE "Bank" ADD COLUMN "companyId" TEXT;
UPDATE "Bank" b SET "companyId" = COALESCE(
  (SELECT u."company_id" FROM "Users" u WHERE u.id = b."user_id"),
  (SELECT id FROM "Company" ORDER BY "createdAt" ASC LIMIT 1)
);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM "Bank" WHERE "companyId" IS NULL) THEN
  RAISE EXCEPTION 'Backfill incompleto em Bank'; END IF; END $$;
ALTER TABLE "Bank" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX "Bank_companyId_idx" ON "Bank"("companyId");
CREATE INDEX "Bank_companyId_ativo_idx" ON "Bank"("companyId", "ativo");
DROP INDEX IF EXISTS "Bank_user_id_idx";
DROP INDEX IF EXISTS "Bank_user_id_ativo_idx";

-- ============ Delivery ============
ALTER TABLE "Delivery" ADD COLUMN "companyId" TEXT;
UPDATE "Delivery" d SET "companyId" = (SELECT o."companyId" FROM "Order" o WHERE o.id = d."orderId");
DO $$ BEGIN IF EXISTS (SELECT 1 FROM "Delivery" WHERE "companyId" IS NULL) THEN
  RAISE EXCEPTION 'Backfill incompleto em Delivery'; END IF; END $$;
ALTER TABLE "Delivery" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX "Delivery_companyId_idx" ON "Delivery"("companyId");
CREATE INDEX "Delivery_companyId_status_idx" ON "Delivery"("companyId", "status");
CREATE INDEX "Delivery_companyId_scheduledDate_idx" ON "Delivery"("companyId", "scheduledDate");
DROP INDEX IF EXISTS "Delivery_status_idx";
DROP INDEX IF EXISTS "Delivery_scheduledDate_idx";

-- ============ RecurringBill ============
ALTER TABLE "RecurringBill" ADD COLUMN "companyId" TEXT;
UPDATE "RecurringBill" SET "companyId" = (SELECT id FROM "Company" ORDER BY "createdAt" ASC LIMIT 1);
ALTER TABLE "RecurringBill" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX "RecurringBill_companyId_idx" ON "RecurringBill"("companyId");
CREATE INDEX "RecurringBill_companyId_active_idx" ON "RecurringBill"("companyId", "active");
DROP INDEX IF EXISTS "RecurringBill_active_idx";

-- ============ AiConversation ============
ALTER TABLE "AiConversation" ADD COLUMN "companyId" TEXT;
UPDATE "AiConversation" ac SET "companyId" = COALESCE(
  (SELECT u."company_id" FROM "Users" u WHERE u.id = ac."userId"),
  (SELECT id FROM "Company" ORDER BY "createdAt" ASC LIMIT 1)
);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM "AiConversation" WHERE "companyId" IS NULL) THEN
  RAISE EXCEPTION 'Backfill incompleto em AiConversation'; END IF; END $$;
ALTER TABLE "AiConversation" ALTER COLUMN "companyId" SET NOT NULL;
CREATE INDEX "AiConversation_companyId_updatedAt_idx" ON "AiConversation"("companyId", "updatedAt" DESC);

-- ============ AiPendingAction ============
ALTER TABLE "AiPendingAction" ADD COLUMN "companyId" TEXT;
UPDATE "AiPendingAction" pa SET "companyId" = COALESCE(
  (SELECT u."company_id" FROM "Users" u WHERE u.id = pa."userId"),
  (SELECT id FROM "Company" ORDER BY "createdAt" ASC LIMIT 1)
);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM "AiPendingAction" WHERE "companyId" IS NULL) THEN
  RAISE EXCEPTION 'Backfill incompleto em AiPendingAction'; END IF; END $$;
ALTER TABLE "AiPendingAction" ALTER COLUMN "companyId" SET NOT NULL;
