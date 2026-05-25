#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/api"

echo "==> Checking database connection..."

if command -v docker &>/dev/null && docker compose ps postgres 2>/dev/null | grep -q running; then
  echo "Docker Postgres detected on port 5433."
  export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5433/whatsup?schema=public}"
elif lsof -i :5432 2>/dev/null | grep -q postgres; then
  echo "Local Postgres detected on port 5432."
  USERNAME="${USER:-$(whoami)}"
  export DATABASE_URL="${DATABASE_URL:-postgresql://$USERNAME@localhost:5432/whatsup?schema=public}"
  CREATEDB=""
  for p in /opt/homebrew/opt/postgresql@*/bin/createdb /usr/local/bin/createdb; do
    [ -x "$p" ] && CREATEDB="$p" && break
  done
  if [ -n "$CREATEDB" ]; then
    "$CREATEDB" whatsup 2>/dev/null || echo "Database 'whatsup' may already exist."
  else
    echo "Tip: create the database manually: createdb whatsup"
  fi
else
  echo "No Postgres found. Start Docker: docker compose up -d"
  exit 1
fi

echo "Using: $DATABASE_URL"
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
echo "Done. Demo login: admin@demo.com / password123"
