/*
  Warnings:

  - You are about to drop the `PlanModules` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `Users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropTable
DROP TABLE "PlanModules";

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");
