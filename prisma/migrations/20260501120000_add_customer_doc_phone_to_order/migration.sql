-- AlterTable: Order (snapshot de CPF e telefone do cliente no momento da venda)
ALTER TABLE "Order" ADD COLUMN "customerDocument" TEXT;
ALTER TABLE "Order" ADD COLUMN "customerPhone" TEXT;
