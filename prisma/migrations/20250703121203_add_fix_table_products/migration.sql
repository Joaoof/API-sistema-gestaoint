/*
  Warnings:

  - You are about to drop the column `category_name` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `salerPrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `supplier_name` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "category_name",
DROP COLUMN "salerPrice",
DROP COLUMN "supplier_name",
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "salePrice" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "supplierId" TEXT;

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_supplierId_idx" ON "Product"("supplierId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
