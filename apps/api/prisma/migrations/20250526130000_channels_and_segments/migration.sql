-- Capture schema drift that was previously applied via `prisma db push` without
-- a migration file (multi-channel support + segments). Idempotent so it can be
-- safely applied to databases that already received the changes via db push.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "Channel" AS ENUM ('WHATSAPP', 'INSTAGRAM', 'SMS', 'EMAIL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Campaign
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "segmentId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "channel" "Channel" NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "body" TEXT;
ALTER TABLE "Campaign" ALTER COLUMN "templateName" DROP NOT NULL;

-- AlterTable: CampaignRecipient
ALTER TABLE "CampaignRecipient" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);
ALTER TABLE "CampaignRecipient" ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3);
ALTER TABLE "CampaignRecipient" ADD COLUMN IF NOT EXISTS "clickedAt" TIMESTAMP(3);

-- AlterTable: Conversation
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "channel" "Channel" NOT NULL DEFAULT 'WHATSAPP';

-- CreateTable: Segment
CREATE TABLE IF NOT EXISTS "Segment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Segment_workspaceId_idx" ON "Segment"("workspaceId");

-- AddForeignKey: Segment -> Workspace
DO $$ BEGIN
  ALTER TABLE "Segment" ADD CONSTRAINT "Segment_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey: Campaign -> Segment
DO $$ BEGIN
  ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_segmentId_fkey"
    FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
