#!/bin/sh
set -e
cd "$(dirname "$0")/.."

# Run migrations in background so Render detects PORT while Neon wakes / migrates
(
  prisma migrate deploy --schema=./prisma/schema.prisma
) &

exec node dist/src/main.js
