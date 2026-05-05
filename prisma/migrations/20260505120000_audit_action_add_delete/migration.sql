-- Add DELETE to AuditAction enum (distinct from SOFT_DELETE)
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DELETE';
