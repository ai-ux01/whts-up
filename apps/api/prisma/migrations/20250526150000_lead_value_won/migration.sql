-- Phase 5: revenue attribution — track deal value and won timestamp on leads.
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "value" DOUBLE PRECISION;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "wonAt" TIMESTAMP(3);
