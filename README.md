# AI WhatsApp Lead Manager

Production-ready MVP: AI-powered WhatsApp CRM for Indian businesses. Receive leads, auto-reply with OpenAI (Hindi + English), manage conversations, leads, broadcasts, and automations.

## Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind, ShadCN-style UI, React Query, Zustand, Socket.io
- **Backend:** NestJS, Prisma, PostgreSQL, JWT auth, Socket.io
- **Integrations:** Meta WhatsApp Cloud API, OpenAI / Ollama

## Monorepo structure

```
apps/web          → Next.js frontend (Vercel)
apps/api          → NestJS API (Railway)
packages/shared   → Shared Zod schemas & enums
```

## Quick start (local)

### 1. Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL)

### 2. Install & database

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
docker compose up -d   # Postgres (5433) + Redis (6379)
```

**PostgreSQL** — pick one:

| Setup | Command | `DATABASE_URL` in `apps/api/.env` |
|-------|---------|-----------------------------------|
| **Neon** (free cloud) | [console.neon.tech](https://console.neon.tech) | Pooled → `DATABASE_URL`, Direct → `DIRECT_URL` — see [docs/NEON.md](docs/NEON.md) |
| **Docker** (port 5433) | `docker compose up -d` | `DATABASE_URL` and `DIRECT_URL` = same Docker URL |
| **Mac local Postgres** (port 5432) | `createdb whatsup` | `postgresql://YOUR_MAC_USERNAME@localhost:5432/whatsup?schema=public` |

**Redis (recommended):** `REDIS_URL=redis://localhost:6379` — background campaign sends with retries. Without Redis, sends run inline (same as before).

```bash
pnpm db:setup
# Re-seed demo data (marketing IDs + 5 leads by channel):
pnpm db:seed
```

**Demo seed includes** dummy marketing account IDs (Meta Ads, Page, Pixel, Google Ads, Instagram) and sample leads for `meta_ads`, `google_ads`, `meta_organic`, `whatsapp`, and `campaign` — visible on Dashboard → Leads by source, Leads, and Inbox.

### 3. Run dev servers

```bash
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1
- Health: http://localhost:4000/api/v1/health

**Logins:**

| Portal | URL | Credentials |
|--------|-----|-------------|
| **Client** | http://localhost:3000/login | `admin@demo.com` / `password123` |
| **Platform admin** | http://localhost:3000/admin/login | `superadmin@platform.com` / `password123` |

**Local AI (Ollama):** `OLLAMA_MODE=on`, then `ollama serve`, `ollama pull llama3.2`.

## Platform admin (multi-client)

Super admins use **`/admin/login`**. Create/suspend client workspaces; clients sign in at `/login`.

## Digital marketing accounts

**Settings → Digital marketing accounts** stores Meta Ads, Page, Google Ads, Pixel, Instagram, default UTM. Inbound **Click-to-WhatsApp** ads are tagged `meta_ads` automatically via WhatsApp `referral` data.

## Product features (recent)

| Feature | Where |
|---------|--------|
| **24h messaging window** | Inbox shows open/closed; blocks free-text outside window |
| **Delivery status** | Sent / delivered / read on outbound bubbles (webhook statuses) |
| **Webhook idempotency** | Duplicate Meta message IDs are ignored |
| **Test WhatsApp** | Settings → Send test (`hello_world` template) |
| **Template picker** | Campaigns loads approved templates from Meta |
| **Leads CSV export** | Leads → Export CSV |
| **Health check** | `GET /api/v1/health` |
| **AI off for closed leads** | No auto-reply when lead status is CLOSED |
| **Redis job queue** | Campaigns/automations in BullMQ (retries, dedupe by campaign id) |
| **Encrypted tokens** | `ENCRYPTION_KEY` encrypts WhatsApp access token in DB |
| **Meta / Google OAuth** | Settings → Connect Meta / Connect Google |

## OAuth (Meta & Google)

**Settings → Digital marketing accounts → Connect Meta / Connect Google**

1. Create a [Meta Developer](https://developers.facebook.com/) app (same app as WhatsApp).
2. Add **Facebook Login** product → **Valid OAuth Redirect URIs**:
   - `http://localhost:4000/api/v1/integrations/meta/callback`
3. Set `META_APP_ID` (App ID) and `META_APP_SECRET` in `apps/api/.env`.
4. [Google Cloud Console](https://console.cloud.google.com/) → OAuth client (Web) → redirect:
   - `http://localhost:4000/api/v1/integrations/google/callback`
5. Enable **Google Ads API**, create developer token, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`.

After connect, the app auto-fills **Meta Ads account ID**, **Page ID**, and **WhatsApp Phone Number ID** (when visible to your Meta user). Google fills **customer ID** when developer token is set.

Optional: `META_OAUTH_SYNC_WHATSAPP=true` copies the Meta OAuth token into WhatsApp access token when a phone ID is discovered.

## Meta WhatsApp setup

1. [Meta Developer](https://developers.facebook.com/) app → **WhatsApp** product.
2. Copy **Phone number ID** and **access token**.
3. Expose API (`ngrok http 4000`), webhook URL:
   - `https://YOUR-NGROK.ngrok-free.dev/api/v1/whatsapp/webhook`
4. **Verify token** — same in Meta, `WHATSAPP_VERIFY_TOKEN` in `.env`, and Settings.
5. Click **Verify and save** in Meta (not a browser GET).
6. Subscribe to **messages**.
7. Paste credentials in **Settings**.

**403 on webhook?** Token mismatch or missing `hub.*` query params.

**Error 190?** Stale DB token — restart API, open Settings (syncs `.env`), or save a new token.

**Error 131030?** Development mode — add each number as a test recipient in Meta → WhatsApp → API Setup.

**Production:** Set `META_APP_SECRET` and `NODE_ENV=production` so webhook signatures are required.

> Outside the 24-hour window, use **approved templates** in Campaigns for marketing messages.

## Environment variables

### API (`apps/api/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Auth (32+ chars) |
| `OLLAMA_MODE` | `on` = Ollama; `off` = OpenAI |
| `OPENAI_API_KEY` | When `OLLAMA_MODE=off` |
| `WHATSAPP_VERIFY_TOKEN` | Meta webhook verify |
| `META_APP_SECRET` | Webhook signature (required in production) |
| `REDIS_URL` | e.g. `redis://localhost:6379` for background jobs |
| `ENCRYPTION_KEY` | 32-byte key: `openssl rand -base64 32` — encrypts DB tokens |
| `META_APP_ID` | Facebook app ID for OAuth |
| `META_OAUTH_REDIRECT_URI` | Meta OAuth callback (default localhost:4000) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Auto-discover Ads customer ID on connect |
| `WHATSAPP_TEST_TEMPLATE` | Optional; default `hello_world` for test send |
| `CORS_ORIGIN` | Frontend URL(s) |
| `PUBLIC_WEBHOOK_BASE_URL` | ngrok base for webhook display |

### Web (`apps/web/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `http://localhost:4000` |

## Deploy for free

**Vercel (web) + Render (API) + Neon (Postgres)** — step-by-step guide:

**[docs/DEPLOY-FREE.md](docs/DEPLOY-FREE.md)**

Quick summary:

1. **Neon** — create Postgres, copy `DATABASE_URL`
2. **Render** — connect GitHub repo, use root `render.yaml`, set WhatsApp/Meta/OpenAI env vars
3. **Vercel** — root directory `apps/web`, set `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` to your Render URL
4. **Meta** — webhook `https://YOUR-API.onrender.com/api/v1/whatsapp/webhook`

Set `OLLAMA_MODE=off` on Render (use OpenAI or disable AI). Free Render instances sleep when idle (~30s cold start).

## API overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | DB health |
| POST | `/auth/login`, `/auth/admin/login` | Auth |
| GET | `/dashboard/stats` | Metrics |
| GET/PATCH | `/conversations`, `/leads`, `/workspaces/settings` | CRM |
| POST | `/workspaces/settings/test-whatsapp` | Test template send |
| GET | `/workspaces/whatsapp/templates` | Approved templates |
| GET | `/leads/export` | CSV download |
| POST | `/conversations/:id/messages` | Send (`forceSend` optional) |
| GET/POST | `/whatsapp/webhook` | Meta webhook |

## Tests

```bash
pnpm --filter api test:unit
```

## License

Private / commercial use per your agreement.
