/*
  Warnings:

  - You are about to drop the `Tax` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."Tax";

-- CreateTable
CREATE TABLE "public"."TaxExpense" (
    "id" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."TaxStatus" NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "TaxExpense_pkey" PRIMARY KEY ("id")
);
