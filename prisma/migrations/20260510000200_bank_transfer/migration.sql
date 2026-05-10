ALTER TABLE "CashMovement" ADD COLUMN "transferId" TEXT;
CREATE INDEX "CashMovement_transferId_idx" ON "CashMovement"("transferId");
