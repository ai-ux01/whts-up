-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "metaAdsAccountId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "metaPageId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "googleAdsCustomerId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "facebookPixelId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "instagramUsername" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "defaultUtmSource" TEXT;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "leadSource" TEXT;
ALTER TABLE "Contact" ADD COLUMN "utmSource" TEXT;
ALTER TABLE "Contact" ADD COLUMN "utmMedium" TEXT;
ALTER TABLE "Contact" ADD COLUMN "utmCampaign" TEXT;

-- CreateIndex
CREATE INDEX "Contact_workspaceId_leadSource_idx" ON "Contact"("workspaceId", "leadSource");
