ALTER TABLE "Users" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Users_isSuperAdmin_idx" ON "Users"("isSuperAdmin") WHERE "isSuperAdmin" = true;
