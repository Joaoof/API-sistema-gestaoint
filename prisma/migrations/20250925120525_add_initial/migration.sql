-- DropForeignKey
ALTER TABLE "public"."CashMovement" DROP CONSTRAINT "CashMovement_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Category" DROP CONSTRAINT "Category_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."CompanyPlan" DROP CONSTRAINT "CompanyPlan_company_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."CompanyPlan" DROP CONSTRAINT "CompanyPlan_planId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Inventory" DROP CONSTRAINT "Inventory_productId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlanModule" DROP CONSTRAINT "PlanModule_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlanModule" DROP CONSTRAINT "PlanModule_planId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Product" DROP CONSTRAINT "Product_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."Product" DROP CONSTRAINT "Product_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Users" DROP CONSTRAINT "Users_company_id_fkey";

-- CreateTable
CREATE TABLE "public"."auth_login_view" (
    "user_id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "user_role" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_logo" TEXT,
    "plan_id" TEXT NOT NULL,
    "plan_name" TEXT NOT NULL,
    "modules" JSONB NOT NULL,

    CONSTRAINT "auth_login_view_pkey" PRIMARY KEY ("user_id")
);
