-- LaunchedCampaign: one-click launch recorded as a single unit for the Launch tab.
CREATE TABLE IF NOT EXISTS "LaunchedCampaign" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "objective" TEXT,
    "launched" INTEGER NOT NULL DEFAULT 0,
    "steps" JSONB NOT NULL,
    "postId" TEXT,
    "reelId" TEXT,
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaunchedCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LaunchedCampaign_workspaceId_createdAt_idx"
    ON "LaunchedCampaign" ("workspaceId", "createdAt");

DO $$
BEGIN
    ALTER TABLE "LaunchedCampaign"
        ADD CONSTRAINT "LaunchedCampaign_workspaceId_fkey"
        FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
