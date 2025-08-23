-- AlterTable
ALTER TABLE "public"."Company" ADD COLUMN     "is_active" BOOLEAN DEFAULT true;

-- CreateIndex
CREATE INDEX "idx_company_id" ON "public"."CompanyPlan"("id");
