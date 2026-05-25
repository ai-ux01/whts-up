# Get started with Neon (this project)

Neon is the **free PostgreSQL** database for WhatsApp Lead Manager. Your NestJS API (Prisma) connects with a normal Postgres URL.

## 1. Create a Neon account & project

1. Open **[console.neon.tech](https://console.neon.tech)** (or [neon.tech](https://neon.tech) → Sign up).
2. **New project**
   - Name: `whats-up` (any name)
   - Region: pick closest to you (e.g. **AWS Mumbai / ap-south-1** if available, or Singapore)
   - Postgres version: **16** (default is fine)
3. Wait until the project is **Active**.

## 2. Copy connection strings

On the project **Dashboard**, click **Connect**.

| Setting | Use |
|---------|-----|
| Branch | `main` (default) |
| Database | `neondb` (default) or create `whatsup` |
| Role | default role |
| Connection type | **Pooled** for the app |

Copy two strings (toggle **Pooled** vs **Direct** in the modal):

| Env var | Neon UI | Used for |
|---------|---------|----------|
| `DATABASE_URL` | **Pooled** (`…-pooler…` in host) | API at runtime (Render / local) |
| `DIRECT_URL` | **Direct** (no `pooler` in host) | Prisma migrations |

Both should end with **`?sslmode=require`** (add it if missing).

Example shape (yours will differ):

```bash
# Pooled — apps/api/.env and Render
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Direct — migrations only
DIRECT_URL="postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
```

## 3. Local setup

Edit **`apps/api/.env`**:

```bash
DATABASE_URL="paste-pooled-string-here"
DIRECT_URL="paste-direct-string-here"
```

Run migrations and demo data:

```bash
cd /Users/anshulkumar/whats-up
pnpm --filter api exec prisma migrate deploy
pnpm db:seed
pnpm dev
```

Check API: http://localhost:4000/api/v1/health → `"db":"up"`.

## 4. Render (production API)

In **Render → whats-up-api → Environment**:

- `DATABASE_URL` = **Pooled** Neon string  
- `DIRECT_URL` = **Direct** Neon string (same as local)

Redeploy. The Docker start command runs `prisma migrate deploy` automatically.

Then seed once from your machine:

```bash
DATABASE_URL="your-pooled-url" DIRECT_URL="your-direct-url" pnpm db:seed
```

(`db:seed` uses `DATABASE_URL` from env when you prefix the command.)

## 5. Optional: SQL Editor

Neon **SQL Editor** → run:

```sql
SELECT 1;
```

After seed, inspect tables:

```sql
SELECT name, slug, "metaAdsAccountId", "googleAdsCustomerId" FROM "Workspace";
SELECT phone, "leadSource" FROM "Contact" LIMIT 10;
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `SSL connection` errors | Add `?sslmode=require` to both URLs |
| Migrations fail on pooler | Use `DIRECT_URL` (non-pooler host) |
| `P1001` can't reach DB | Neon project paused? Open dashboard to wake it |
| Auth failed | Reset password in Neon → Connection → regenerate |

## Free tier limits (good to know)

- **0.5 GB** storage  
- Project **auto-sleeps** when idle; first query may take 1–2s to wake  
- Fine for demo + Render free tier  

Next: [DEPLOY-FREE.md](./DEPLOY-FREE.md) (Render + Vercel + Meta webhook).
