-- CreateEnum
CREATE TYPE "public"."TaxStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateTable
CREATE TABLE "public"."Tax" (
    "id" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "public"."TaxStatus" NOT NULL,

    CONSTRAINT "Tax_pkey" PRIMARY KEY ("id")
);
