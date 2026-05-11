-- =====================================================================
--  TENANT ISOLATION — Fase 1 (6 modelos críticos)
--  Adiciona companyId em Product, Customer, Order, AccountReceivable,
--  AccountPayable e CashMovement. Backfill seguro via createdBy/userId
--  ou, em último caso, a Company mais antiga.
--
--  Estratégia:
--    1) Adiciona coluna NULLABLE
--    2) Backfill (DO block com fallback)
--    3) Aborta se sobrar NULL (defesa contra perda silenciosa)
--    4) Torna NOT NULL e cria índices
-- =====================================================================

-- Aborta logo no início se não houver nenhuma Company (não dá pra
-- fazer backfill sem destino).
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "Company";
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Sem Company no banco — crie pelo menos uma antes de aplicar esta migration.';
  END IF;
END $$;

-- Empresa de fallback (a mais antiga) — usada quando o registro não tem
-- nenhum vínculo a User (ex: Customer/Supplier sem createdBy).
-- Guardamos como CTE temporária em cada UPDATE pra não depender de cache.

-- ============ Product ============
ALTER TABLE "Product" ADD COLUMN "companyId" TEXT;

UPDATE "Product" p
SET "companyId" = COALESCE(
  (SELECT u."company_id" FROM "Users" u WHERE u.id = p."createdById"),
  (SELECT id FROM "Company" ORDER BY "createdAt" ASC LIMIT 1)
);

-- Antes de NOT NULL, garante que ficou tudo preenchido
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Product" WHERE "companyId" IS NULL) THEN
    RAISE EXCEPTION 'Backfill incompleto em Product';
  END IF;
END $$;

ALTER TABLE "Product" ALTER COLUMN "companyId" SET NOT NULL;

-- Troca o UNIQUE global em nameProduct por unique composto (companyId, nameProduct)
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_nameProduct_key";
CREATE UNIQUE INDEX "Product_companyId_nameProduct_key"
  ON "Product"("companyId", "nameProduct");

CREATE INDEX "Product_companyId_idx" ON "Product"("companyId");
CREATE INDEX "Product_companyId_status_idx" ON "Product"("companyId", "status");
DROP INDEX IF EXISTS "Product_nameProduct_idx";
DROP INDEX IF EXISTS "Product_status_idx";

-- ============ Customer ============
ALTER TABLE "Customer" ADD COLUMN "companyId" TEXT;

UPDATE "Customer" c
SET "companyId" = COALESCE(
  -- pega da primeira AR/Order do cliente, se houver
  (SELECT u."company_id"
     FROM "Order" o
     JOIN "Users" u ON u.id = o."createdById"
    WHERE o."customerId" = c.id
    LIMIT 1),
  (SELECT id FROM "Company" ORDER BY "createdAt" ASC LIMIT 1)
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Customer" WHERE "companyId" IS NULL) THEN
    RAISE EXCEPTION 'Backfill incompleto em Customer';
  END IF;
END $$;

ALTER TABLE "Customer" ALTER COLUMN "companyId" SET NOT NULL;

CREATE INDEX "Customer_companyId_idx" ON "Customer"("companyId");
CREATE INDEX "Customer_companyId_name_idx" ON "Customer"("companyId", "name");
CREATE INDEX "Customer_companyId_document_idx" ON "Customer"("companyId", "document");

-- ============ Order ============
ALTER TABLE "Order" ADD COLUMN "companyId" TEXT;

UPDATE "Order" o
SET "companyId" = COALESCE(
  (SELECT u."company_id" FROM "Users" u WHERE u.id = o."createdById"),
  (SELECT id FROM "Company" ORDER BY "createdAt" ASC LIMIT 1)
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Order" WHERE "companyId" IS NULL) THEN
    RAISE EXCEPTION 'Backfill incompleto em Order';
  END IF;
END $$;

ALTER TABLE "Order" ALTER COLUMN "companyId" SET NOT NULL;

CREATE INDEX "Order_companyId_idx" ON "Order"("companyId");
CREATE INDEX "Order_companyId_createdAt_idx" ON "Order"("companyId", "createdAt" DESC);
CREATE INDEX "Order_companyId_status_idx" ON "Order"("companyId", "status");
DROP INDEX IF EXISTS "Order_createdAt_idx";
DROP INDEX IF EXISTS "Order_status_idx";

-- ============ AccountReceivable ============
ALTER TABLE "AccountReceivable" ADD COLUMN "companyId" TEXT;

UPDATE "AccountReceivable" ar
SET "companyId" = COALESCE(
  -- via Order vinculado
  (SELECT o."companyId" FROM "Order" o WHERE o.id = ar."orderId"),
  -- via Customer
  (SELECT c."companyId" FROM "Customer" c WHERE c.id = ar."customerId"),
  (SELECT id FROM "Company" ORDER BY "createdAt" ASC LIMIT 1)
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "AccountReceivable" WHERE "companyId" IS NULL) THEN
    RAISE EXCEPTION 'Backfill incompleto em AccountReceivable';
  END IF;
END $$;

ALTER TABLE "AccountReceivable" ALTER COLUMN "companyId" SET NOT NULL;

CREATE INDEX "AccountReceivable_companyId_idx" ON "AccountReceivable"("companyId");
CREATE INDEX "AccountReceivable_companyId_status_idx" ON "AccountReceivable"("companyId", "status");
CREATE INDEX "AccountReceivable_companyId_dueDate_idx" ON "AccountReceivable"("companyId", "dueDate");
DROP INDEX IF EXISTS "AccountReceivable_dueDate_idx";
DROP INDEX IF EXISTS "AccountReceivable_status_idx";

-- ============ AccountPayable ============
ALTER TABLE "AccountPayable" ADD COLUMN "companyId" TEXT;

UPDATE "AccountPayable" ap
SET "companyId" = COALESCE(
  (SELECT p."companyId" FROM "Product" p WHERE p.id = ap."productId"),
  (SELECT id FROM "Company" ORDER BY "createdAt" ASC LIMIT 1)
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "AccountPayable" WHERE "companyId" IS NULL) THEN
    RAISE EXCEPTION 'Backfill incompleto em AccountPayable';
  END IF;
END $$;

ALTER TABLE "AccountPayable" ALTER COLUMN "companyId" SET NOT NULL;

CREATE INDEX "AccountPayable_companyId_idx" ON "AccountPayable"("companyId");
CREATE INDEX "AccountPayable_companyId_status_idx" ON "AccountPayable"("companyId", "status");
CREATE INDEX "AccountPayable_companyId_dueDate_idx" ON "AccountPayable"("companyId", "dueDate");
DROP INDEX IF EXISTS "AccountPayable_dueDate_idx";
DROP INDEX IF EXISTS "AccountPayable_status_idx";

-- ============ CashMovement ============
ALTER TABLE "CashMovement" ADD COLUMN "companyId" TEXT;

UPDATE "CashMovement" cm
SET "companyId" = COALESCE(
  (SELECT u."company_id" FROM "Users" u WHERE u.id = cm."user_id"),
  (SELECT id FROM "Company" ORDER BY "createdAt" ASC LIMIT 1)
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "CashMovement" WHERE "companyId" IS NULL) THEN
    RAISE EXCEPTION 'Backfill incompleto em CashMovement';
  END IF;
END $$;

ALTER TABLE "CashMovement" ALTER COLUMN "companyId" SET NOT NULL;

-- Os índices antigos eram por user_id — substitui pelos compostos por company.
CREATE INDEX "CashMovement_companyId_date_idx" ON "CashMovement"("companyId", "date" DESC);
CREATE INDEX "CashMovement_companyId_status_idx" ON "CashMovement"("companyId", "status");
CREATE INDEX "CashMovement_companyId_type_idx" ON "CashMovement"("companyId", "type");
DROP INDEX IF EXISTS "CashMovement_user_id_status_idx";
DROP INDEX IF EXISTS "CashMovement_user_id_category_idx";
DROP INDEX IF EXISTS "CashMovement_user_id_type_idx";
