/*
  Warnings:

  - You are about to drop the `EntryMovement` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "MovementCategory" AS ENUM ('SALE', 'CHANGE', 'OTHER_IN', 'EXPENSE', 'WITHDRAWAL', 'PAYMENT');

-- DropTable
DROP TABLE "EntryMovement";

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "category" "MovementCategory" NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashMovement_date_idx" ON "CashMovement"("date");
