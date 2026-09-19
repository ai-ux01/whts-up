API keys & credential dependencies
🔴 REQUIRED — the app won't start / core auth breaks without these
My validateConfig() guard enforces these in production (process exits if missing/weak):

Key	Purpose	Where to get it
DATABASE_URL	Postgres connection (pooled)	Neon / your Postgres
DIRECT_URL	Prisma migrations (direct)	Neon (direct string)
JWT_ACCESS_SECRET	Signs 15-min access tokens (≥32 chars)	openssl rand -base64 32
JWT_REFRESH_SECRET	Signs refresh tokens (≥32 chars)	openssl rand -base64 32
ENCRYPTION_KEY	AES-256-GCM for OAuth/WhatsApp tokens at rest	openssl rand -base64 32 — set once, never rotate
CORS_ORIGIN	Allowlist for REST + WebSocket	your Vercel URL
Web (Vercel): NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL are effectively required or the frontend calls localhost.

🟠 REQUIRED FOR THE HEADLINE FEATURE — WhatsApp CRM
Without these, WhatsApp runs in sandbox simulation (fake wamid.mock_* sends). This is the product's core, so treat as required for a real launch:

Key	Without it
WHATSAPP_ACCESS_TOKEN	sends simulated
WHATSAPP_PHONE_NUMBER_ID	can't send
WHATSAPP_VERIFY_TOKEN	webhook verification fails
META_APP_SECRET	inbound webhook HMAC validation fails (required in prod)
PUBLIC_WEBHOOK_BASE_URL	webhook URL display/routing
🟡 FEATURE-GATED — each unlocks one capability; degrades safely without
Key(s)	Feature	Without it (behavior I built)
OPENAI_API_KEY (or OLLAMA_MODE=on + OLLAMA_BASE_URL)	AI replies, content studio, sentiment, DALL-E reel images	AI features return mock/canned fallbacks
ELEVENLABS_API_KEY (+ ELEVENLABS_DEFAULT_VOICE_ID)	Reel voiceover narration	reels render with silent audio
SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (+ SUPABASE_STORAGE_BUCKET)	Media/reel file storage	uploads return mock local paths
GOOGLE_PLACES_API_KEY	Competitor discovery + Google review sync	prod: throws error; dev: demo data
META_APP_ID + META_APP_SECRET (+ META_CONFIG_ID)	Real Facebook/Instagram OAuth connect	prod: throws error; dev: mock OAuth
GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (+ GOOGLE_OAUTH_REDIRECT_URI, GOOGLE_ADS_DEVELOPER_TOKEN)	Google OAuth / Ads	connect fails (no mock fallback)
SMS: SMS_PROVIDER + (TWILIO_ACCOUNT_SID+TWILIO_AUTH_TOKEN+TWILIO_SMS_FROM) or (MSG91_AUTH_KEY+MSG91_SENDER_ID)	SMS campaigns/inbox	silently mock — sends nothing
Email: EMAIL_PROVIDER + (RESEND_API_KEY or SENDGRID_API_KEY) + EMAIL_FROM	Email campaigns/inbox	silently mock — sends nothing
REDIS_URL	BullMQ job queue	falls back to inline processing (no retries)
SENTRY_DSN (+ optional @sentry/node pkg)	Error tracking	no-op
⚙️ Optional tuning (have sane defaults)
NODE_ENV, PORT, API_URL, NEXT_PUBLIC_APP_URL, AI_MODEL, EMBEDDING_MODEL, WHATSAPP_TEMPLATE_LANGUAGE, WHATSAPP_SANDBOX_MODE, WHATSAPP_TEST_TEMPLATE, MSG91_ROUTE, OAUTH_STATE_SECRET (falls back to JWT_ACCESS_SECRET), META_OAUTH_SYNC_WHATSAPP, FACEBOOK_APP_ID (alias for META_APP_ID).

The important gap to flag: silent no-op keys
Two feature areas degrade silently in production without a loud signal:

SMS (sms.service.ts) — with no provider key, it logs [SMS:mock] and returns a fake success. An SMS campaign in prod would report "sent" but deliver nothing.
Email (email.service.ts) — same: [EMAIL:mock] fake success.
Unlike Google Places and Meta OAuth (which I made throw in production), SMS and Email still fall back to mock even in prod. If you plan to launch those channels, that's a data-integrity risk — a merchant thinks their campaign went out.

Recommendation: make SMS/Email also fail-loud in production when a campaign targets those channels without a configured provider — consistent with the Google/Meta guards. Want me to add that guard? It's a small, safe change (throw in prod when the resolved provider is mock and a real send is attempted), and I'll verify with a build.

For a real launch with AI features on: 

OPENAI_API_KEY (and set OLLAMA_MODE=off) — a valid key; verify it works (invalid keys silently fall back to mock).
GOOGLE_PLACES_API_KEY — separate from OAuth; enable Places API in Google Cloud.
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET — only if you use Google OAuth/Ads.
META_APP_ID / META_APP_SECRET — for WhatsApp webhook + social OAuth.
ELEVENLABS_API_KEY — only if you want reel voiceovers.