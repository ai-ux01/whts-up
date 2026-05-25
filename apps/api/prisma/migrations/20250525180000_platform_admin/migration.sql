-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "slug" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "Workspace" SET "slug" = 'workspace-' || "id" WHERE "slug" IS NULL;

ALTER TABLE "Workspace" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "workspaceId" DROP NOT NULL;
