CREATE TABLE "Invitation" (
  "id"               TEXT NOT NULL,
  "email"            TEXT NOT NULL,
  "role"             TEXT NOT NULL DEFAULT 'user',
  "companyId"        TEXT,
  "planId"           TEXT,
  "invitedBy"        TEXT NOT NULL,
  "token"            TEXT NOT NULL,
  "message"          TEXT,
  "acceptedAt"       TIMESTAMP(3),
  "acceptedByUserId" TEXT,
  "revokedAt"        TIMESTAMP(3),
  "expiresAt"        TIMESTAMP(3) NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");
CREATE INDEX "Invitation_companyId_idx" ON "Invitation"("companyId");
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");
