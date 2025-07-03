/*
  Warnings:

  - You are about to drop the column `name` on the `Product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nameProduct]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nameProduct` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Product_name_idx";

-- DropIndex
DROP INDEX "Product_name_key";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "name",
ADD COLUMN     "nameProduct" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Product_nameProduct_key" ON "Product"("nameProduct");

-- CreateIndex
CREATE INDEX "Product_nameProduct_idx" ON "Product"("nameProduct");
