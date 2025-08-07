/*
  Warnings:

  - You are about to drop the column `cpnj` on the `Company` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[cnpj]` on the table `Company` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "EntryTypeClient" AS ENUM ('Sale', 'Change', 'Others');

-- DropIndex
DROP INDEX "Company_cpnj_key";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "cpnj",
ADD COLUMN     "cnpj" TEXT;

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "typeEntry" "EntryTypeClient" NOT NULL,
    "value" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_user_id_key" ON "Client"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Company_cnpj_key" ON "Company"("cnpj");
