-- CreateTable: Driver
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "cnh" TEXT,
    "cnhCategory" TEXT,
    "phone" TEXT,
    "document" TEXT,
    "vehicle" TEXT,
    "vehiclePlate" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Driver
CREATE INDEX "Driver_active_idx" ON "Driver"("active");
CREATE INDEX "Driver_name_idx" ON "Driver"("name");

-- AlterTable: Delivery (driverId + snapshots)
ALTER TABLE "Delivery" ADD COLUMN "driverId" TEXT;
ALTER TABLE "Delivery" ADD COLUMN "driverPhotoUrl" TEXT;
ALTER TABLE "Delivery" ADD COLUMN "driverPhone" TEXT;

-- CreateIndex: Delivery.driverId
CREATE INDEX "Delivery_driverId_idx" ON "Delivery"("driverId");
