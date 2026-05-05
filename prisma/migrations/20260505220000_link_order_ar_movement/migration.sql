ALTER TABLE "AccountReceivable" ADD COLUMN "orderId" TEXT;
CREATE INDEX "AccountReceivable_orderId_idx" ON "AccountReceivable"("orderId");

ALTER TABLE "CashMovement"
  ADD COLUMN "orderId" TEXT,
  ADD COLUMN "accountReceivableId" TEXT,
  ADD COLUMN "customerId" TEXT;
CREATE INDEX "CashMovement_orderId_idx" ON "CashMovement"("orderId");
CREATE INDEX "CashMovement_accountReceivableId_idx" ON "CashMovement"("accountReceivableId");
CREATE INDEX "CashMovement_customerId_idx" ON "CashMovement"("customerId");
