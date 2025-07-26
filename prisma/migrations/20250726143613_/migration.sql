/*
  Warnings:

  - A unique constraint covering the columns `[cpnj]` on the table `Companies` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Companies" ADD COLUMN     "cpnj" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Companies_cpnj_key" ON "Companies"("cpnj");
