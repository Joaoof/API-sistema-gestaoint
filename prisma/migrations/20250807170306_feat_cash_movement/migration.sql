/*
  Warnings:

  - Added the required column `user_id` to the `CashMovement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN     "user_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
