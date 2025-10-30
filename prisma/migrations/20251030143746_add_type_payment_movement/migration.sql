/*
  Warnings:

  - Added the required column `typePayment` to the `CashMovement` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."MovementTypePayment" AS ENUM ('CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'OTHER');

-- AlterTable
ALTER TABLE "public"."CashMovement" ADD COLUMN     "typePayment" "public"."MovementTypePayment" NOT NULL;
