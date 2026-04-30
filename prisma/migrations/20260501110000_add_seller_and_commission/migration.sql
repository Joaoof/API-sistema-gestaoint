-- AlterTable: Seller (add new columns + relax constraints)
ALTER TABLE "Seller" ADD COLUMN "phone" TEXT;
ALTER TABLE "Seller" ADD COLUMN "document" TEXT;
ALTER TABLE "Seller" ADD COLUMN "commissionPercent" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- email becomes optional
ALTER TABLE "Seller" ALTER COLUMN "email" DROP NOT NULL;

-- updatedAt becomes auto-managed by Prisma; ensure column has a default
ALTER TABLE "Seller" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex: Seller
CREATE INDEX IF NOT EXISTS "Seller_active_idx" ON "Seller"("active");
CREATE INDEX IF NOT EXISTS "Seller_name_idx" ON "Seller"("name");

-- AlterTable: Order (add seller snapshot + commission)
ALTER TABLE "Order" ADD COLUMN "sellerId" TEXT;
ALTER TABLE "Order" ADD COLUMN "sellerName" TEXT;
ALTER TABLE "Order" ADD COLUMN "commissionPercent" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "commissionAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateIndex: Order.sellerId
CREATE INDEX IF NOT EXISTS "Order_sellerId_idx" ON "Order"("sellerId");
