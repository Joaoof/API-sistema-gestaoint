-- ProductKind enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductKind') THEN
    CREATE TYPE "public"."ProductKind" AS ENUM ('PRODUCT', 'SERVICE', 'LABOR');
  END IF;
END$$;

-- OrderType enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderType') THEN
    CREATE TYPE "public"."OrderType" AS ENUM ('STANDARD', 'CUSTOM_ORDER');
  END IF;
END$$;

-- Product.kind
ALTER TABLE "public"."Product"
  ADD COLUMN IF NOT EXISTS "kind" "public"."ProductKind" NOT NULL DEFAULT 'PRODUCT';

CREATE INDEX IF NOT EXISTS "Product_kind_idx" ON "public"."Product" ("kind");

-- Order.orderType / expectedDeliveryDate / depositAmount
ALTER TABLE "public"."Order"
  ADD COLUMN IF NOT EXISTS "orderType"            "public"."OrderType" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS "expectedDeliveryDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "depositAmount"        DECIMAL(65,30) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Order_orderType_idx" ON "public"."Order" ("orderType");

-- OrderItem.itemKind / itemUnit / description
ALTER TABLE "public"."OrderItem"
  ADD COLUMN IF NOT EXISTS "itemKind"    "public"."ProductKind" NOT NULL DEFAULT 'PRODUCT',
  ADD COLUMN IF NOT EXISTS "itemUnit"    TEXT NOT NULL DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS "description" TEXT;

CREATE INDEX IF NOT EXISTS "OrderItem_itemKind_idx" ON "public"."OrderItem" ("itemKind");

-- Backfill: snapshot itemKind/itemUnit a partir do produto vinculado
UPDATE "public"."OrderItem" oi
SET "itemKind" = p."kind",
    "itemUnit" = COALESCE(p."unit", 'UN')
FROM "public"."Product" p
WHERE oi."productId" = p."id"
  AND oi."itemKind" = 'PRODUCT'
  AND p."kind" <> 'PRODUCT';
