-- AlterTable: Customer (bairro, cep)
ALTER TABLE "Customer" ADD COLUMN "bairro" TEXT;
ALTER TABLE "Customer" ADD COLUMN "cep" TEXT;

-- AlterTable: Company (nomeFantasia, razaoSocial, inscricaoEstadual, cidade, estado)
ALTER TABLE "Company" ADD COLUMN "nomeFantasia" TEXT;
ALTER TABLE "Company" ADD COLUMN "razaoSocial" TEXT;
ALTER TABLE "Company" ADD COLUMN "inscricaoEstadual" TEXT;
ALTER TABLE "Company" ADD COLUMN "cidade" TEXT;
ALTER TABLE "Company" ADD COLUMN "estado" TEXT;

-- AlterTable: Users (phone, avatarUrl)
ALTER TABLE "Users" ADD COLUMN "phone" TEXT;
ALTER TABLE "Users" ADD COLUMN "avatarUrl" TEXT;

-- AlterTable: Order (dueDate)
ALTER TABLE "Order" ADD COLUMN "dueDate" TIMESTAMP(3);

-- CreateIndex: Order.createdById
CREATE INDEX "Order_createdById_idx" ON "Order"("createdById");
