#!/bin/sh
set -e
cd "$(dirname "$0")/.."

# Run migrations to completion BEFORE starting the server so the app never
# serves traffic against an un-migrated schema. Retry briefly to tolerate a
# cold serverless database (e.g. Neon) waking up.
echo "Running database migrations..."
attempt=1
max_attempts=5
until prisma migrate deploy --schema=./prisma/schema.prisma; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Migration failed after ${max_attempts} attempts — aborting startup." >&2
    exit 1
  fi
  echo "Migration attempt ${attempt} failed, retrying in 5s..."
  attempt=$((attempt + 1))
  sleep 5
done
echo "Migrations applied."

exec node dist/src/main.js
