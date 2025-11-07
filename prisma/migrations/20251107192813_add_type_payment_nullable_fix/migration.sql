/*
  Warnings:

  - Made the column `typePayment` on table `CashMovement` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `typePayment` to the `mv_cash_movements_per_user` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."CashMovement" ALTER COLUMN "typePayment" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."mv_cash_movements_per_user" ADD COLUMN     "typePayment" "public"."MovementTypePayment" NOT NULL;
