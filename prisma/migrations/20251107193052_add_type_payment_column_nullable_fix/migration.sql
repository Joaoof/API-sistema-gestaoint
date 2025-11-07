-- AlterTable
ALTER TABLE "public"."CashMovement" ALTER COLUMN "typePayment" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."mv_cash_movements_per_user" ALTER COLUMN "typePayment" DROP NOT NULL;
