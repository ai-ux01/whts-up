#!/usr/bin/env bash
# Print secrets to paste into Render / Vercel env. Do not commit output.
set -euo pipefail
echo "JWT_ACCESS_SECRET=$(openssl rand -base64 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo "WHATSAPP_VERIFY_TOKEN=whats-up-$(openssl rand -hex 8)"
