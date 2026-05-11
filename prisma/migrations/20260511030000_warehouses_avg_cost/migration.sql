-- =====================================================================
--  WAREHOUSES + CUSTO MÉDIO — Sessão 3
--  1. Cria Warehouse + 1 warehouse "Principal" por empresa (isMain=true)
--  2. Refatora Inventory: adiciona warehouseId (apontando pro principal)
--  3. Troca unique(productId) por unique(productId, warehouseId)
--  4. Adiciona averageCost em Product (backfill = costPrice)
--  5. Cria tabela InventoryMovement (histórico de entradas/saídas/transfers)
-- =====================================================================

-- ============ Warehouse ============
CREATE TABLE "Warehouse" (
  "id"        TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "code"      TEXT,
  "address"   TEXT,
  "isMain"    BOOLEAN NOT NULL DEFAULT false,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Warehouse_companyId_name_key" ON "Warehouse"("companyId", "name");
CREATE INDEX "Warehouse_companyId_idx" ON "Warehouse"("companyId");
CREATE INDEX "Warehouse_companyId_active_idx" ON "Warehouse"("companyId", "active");

-- Cria 1 warehouse "Principal" por empresa, garantindo isMain único
INSERT INTO "Warehouse" ("id", "companyId", "name", "isMain", "active", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  c.id,
  'Principal',
  true,
  true,
  NOW(),
  NOW()
FROM "Company" c;

-- ============ Inventory ============
ALTER TABLE "Inventory" ADD COLUMN "warehouseId" TEXT;

-- Aponta cada Inventory existente para o warehouse principal da empresa do produto
UPDATE "Inventory" i
SET "warehouseId" = (
  SELECT w.id
  FROM "Warehouse" w
  WHERE w."companyId" = i."companyId" AND w."isMain" = true
  LIMIT 1
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "Inventory" WHERE "warehouseId" IS NULL) THEN
    RAISE EXCEPTION 'Inventário sem warehouse depois do backfill — inconsistência.';
  END IF;
END $$;

ALTER TABLE "Inventory" ALTER COLUMN "warehouseId" SET NOT NULL;

-- Troca a unique de productId pela composta (productId, warehouseId)
ALTER TABLE "Inventory" DROP CONSTRAINT IF EXISTS "Inventory_productId_key";
DROP INDEX IF EXISTS "Inventory_productId_key";
CREATE UNIQUE INDEX "Inventory_productId_warehouseId_key" ON "Inventory"("productId", "warehouseId");

CREATE INDEX "Inventory_warehouseId_idx" ON "Inventory"("warehouseId");
CREATE INDEX "Inventory_productId_idx" ON "Inventory"("productId");

-- ============ Product.averageCost ============
ALTER TABLE "Product" ADD COLUMN "averageCost" DECIMAL(65,30) NOT NULL DEFAULT 0;
UPDATE "Product" SET "averageCost" = "costPrice" WHERE "averageCost" = 0;

-- ============ InventoryMovement (histórico) ============
CREATE TABLE "InventoryMovement" (
  "id"          TEXT NOT NULL,
  "companyId"   TEXT NOT NULL,
  "productId"   TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "type"        TEXT NOT NULL,
  "quantity"    INTEGER NOT NULL,
  "unitCost"    DECIMAL(65,30),
  "reason"      TEXT,
  "reference"   TEXT,
  "transferId"  TEXT,
  "userId"      TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InventoryMovement_companyId_idx" ON "InventoryMovement"("companyId");
CREATE INDEX "InventoryMovement_productId_createdAt_idx" ON "InventoryMovement"("productId", "createdAt" DESC);
CREATE INDEX "InventoryMovement_warehouseId_createdAt_idx" ON "InventoryMovement"("warehouseId", "createdAt" DESC);
CREATE INDEX "InventoryMovement_transferId_idx" ON "InventoryMovement"("transferId");
