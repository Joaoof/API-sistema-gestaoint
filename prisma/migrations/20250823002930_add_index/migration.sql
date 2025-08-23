-- CreateIndex
CREATE INDEX "Users_company_id_idx" ON "public"."Users"("company_id");

-- CreateIndex
CREATE INDEX "Users_company_id_email_idx" ON "public"."Users"("company_id", "email");
