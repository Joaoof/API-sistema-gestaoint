CREATE TYPE "DeliveryKind" AS ENUM ('DELIVERY', 'PICKUP');

ALTER TABLE "Delivery" ADD COLUMN "kind" "DeliveryKind" NOT NULL DEFAULT 'DELIVERY';
CREATE INDEX "Delivery_kind_idx" ON "Delivery"("kind");
