-- Migration manual: adiciona ProductImage + campos novos em Product.
-- Use IF NOT EXISTS por toda parte para ser idempotente — pode rodar mais de uma vez sem quebrar.

BEGIN;

-- ─── Product: campos novos ───────────────────────────────────────────────
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "sku"      TEXT,
  ADD COLUMN IF NOT EXISTS "minStock" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "unit"     TEXT    NOT NULL DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS "weight"   DECIMAL;

-- Índices em Product.sku (único quando não nulo)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Product_sku_key') THEN
    CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku") WHERE "sku" IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Product_sku_idx" ON "Product"("sku");

-- ─── ProductImage ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ProductImage" (
  "id"        TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "url"       TEXT NOT NULL,
  "key"       TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "order"     INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductImage_key_key"          ON "ProductImage"("key");
CREATE INDEX        IF NOT EXISTS "ProductImage_productId_idx"    ON "ProductImage"("productId");
CREATE INDEX        IF NOT EXISTS "ProductImage_productId_order_idx" ON "ProductImage"("productId", "order");

-- FK
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ProductImage_productId_fkey'
  ) THEN
    ALTER TABLE "ProductImage"
      ADD CONSTRAINT "ProductImage_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
