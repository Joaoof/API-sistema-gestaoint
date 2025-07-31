-- AlterTable
ALTER TABLE "CompanyPlan" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
