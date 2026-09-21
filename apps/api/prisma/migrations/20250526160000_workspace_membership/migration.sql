-- Multi-business: users can belong to multiple workspaces.
CREATE TABLE IF NOT EXISTS "WorkspaceMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceMembership_userId_workspaceId_key"
  ON "WorkspaceMembership"("userId", "workspaceId");
CREATE INDEX IF NOT EXISTS "WorkspaceMembership_userId_idx" ON "WorkspaceMembership"("userId");
CREATE INDEX IF NOT EXISTS "WorkspaceMembership_workspaceId_idx" ON "WorkspaceMembership"("workspaceId");

DO $$ BEGIN
  ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Backfill: every user with a workspace becomes a member of it.
INSERT INTO "WorkspaceMembership" ("id", "userId", "workspaceId", "role", "createdAt")
SELECT
  gen_random_uuid()::text,
  u."id",
  u."workspaceId",
  u."role",
  CURRENT_TIMESTAMP
FROM "User" u
WHERE u."workspaceId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "WorkspaceMembership" m
    WHERE m."userId" = u."id" AND m."workspaceId" = u."workspaceId"
  );
