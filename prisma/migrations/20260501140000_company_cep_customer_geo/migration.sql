-- AlterTable: Company (cep + geolocalização)
ALTER TABLE "Company" ADD COLUMN "cep" TEXT;
ALTER TABLE "Company" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Company" ADD COLUMN "longitude" DOUBLE PRECISION;

-- AlterTable: Customer (fantasia, razão, cidade/estado, lat/lng)
ALTER TABLE "Customer" ADD COLUMN "nomeFantasia" TEXT;
ALTER TABLE "Customer" ADD COLUMN "razaoSocial" TEXT;
ALTER TABLE "Customer" ADD COLUMN "cidade" TEXT;
ALTER TABLE "Customer" ADD COLUMN "estado" TEXT;
ALTER TABLE "Customer" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Customer" ADD COLUMN "longitude" DOUBLE PRECISION;
