-- Message delivery tracking + webhook idempotency
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Message_externalId_key" ON "Message"("externalId") WHERE "externalId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "ProcessedWebhookEvent" (
    "wamid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("wamid")
);

ALTER TABLE "CampaignRecipient" ADD COLUMN IF NOT EXISTS "externalMessageId" TEXT;

CREATE INDEX IF NOT EXISTS "CampaignRecipient_externalMessageId_idx" ON "CampaignRecipient"("externalMessageId");
