-- Enable real Google Business Profile reply write-back by storing the review's
-- API resource name (null for read-only Places-sourced reviews).
ALTER TABLE "GoogleReview" ADD COLUMN IF NOT EXISTS "googleResourceName" TEXT;
