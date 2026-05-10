CREATE TABLE "RecurringBill" (
  "id"               TEXT NOT NULL,
  "supplierName"     TEXT NOT NULL,
  "description"      TEXT NOT NULL,
  "amount"           DECIMAL(65,30) NOT NULL,
  "dayOfMonth"       INTEGER NOT NULL,
  "interestRate"     DECIMAL(65,30) NOT NULL DEFAULT 0.033,
  "notes"            TEXT,
  "active"           BOOLEAN NOT NULL DEFAULT true,
  "lastGeneratedFor" TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringBill_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RecurringBill_active_idx" ON "RecurringBill"("active");
