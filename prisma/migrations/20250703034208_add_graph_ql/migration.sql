/*
  Warnings:

  - You are about to drop the column `categoryId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `supplierId` on the `Product` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_supplierId_fkey";

-- DropIndex
DROP INDEX "Category_name_key";

-- DropIndex
DROP INDEX "Product_categoryId_idx";

-- DropIndex
DROP INDEX "Product_categoryId_status_idx";

-- DropIndex
DROP INDEX "Product_supplierId_createdAt_idx";

-- DropIndex
DROP INDEX "Product_supplierId_idx";

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "categoryId",
DROP COLUMN "price",
DROP COLUMN "status",
DROP COLUMN "supplierId",
ADD COLUMN     "category_name" TEXT,
ADD COLUMN     "costPrice" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "salerPrice" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
ADD COLUMN     "supplier_name" TEXT;

-- CreateIndex
CREATE INDEX "idx_category_name" ON "Category"("name");

-- CreateIndex
CREATE INDEX "idx_category_status" ON "Category"("status");
