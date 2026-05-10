ALTER TABLE "CashMovement" ADD COLUMN "accountPayableId" TEXT;
CREATE INDEX "CashMovement_accountPayableId_idx" ON "CashMovement"("accountPayableId");
