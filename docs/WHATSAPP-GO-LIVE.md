# WhatsApp Go-Live — step by step

How to connect a **real** WhatsApp number so the app can send and receive messages.
Tailored to this app's endpoints and env vars.

> Time: ~30–45 min. You need a Facebook account and a phone number that is **not**
> already registered on the WhatsApp *consumer* app for this business line.

---

## Part A — Meta setup (one time)

### Step 1: Create a Meta Developer app
1. Go to <https://developers.facebook.com/apps> → **Create App**.
2. Use case: choose **Other** → app type **Business** → Next.
3. Name it (e.g. "Whats-Up CRM"), pick your Business Portfolio → **Create app**.

### Step 2: Add the WhatsApp product
1. In the app dashboard → **Add product** → find **WhatsApp** → **Set up**.
2. This auto-creates a **test** WhatsApp Business Account (WABA) and a **test number**
   you can use immediately for development.

### Step 3: Grab the first values (from WhatsApp → API Setup)
On the **WhatsApp → API Setup** page note:
- **Phone number ID** → this is your `WHATSAPP_PHONE_NUMBER_ID`
- **Temporary access token** (valid 24h) → fine for a first test, but replace with a
  permanent token before real launch (Step 6)
- **Test number** — add your own phone under "To" recipients to test sends

### Step 4: Get the App Secret
1. App dashboard → **App settings → Basic**.
2. Copy **App secret** (click Show) → this is your `META_APP_SECRET`.
   - Used to validate that inbound webhooks really came from Meta (HMAC).

---

## Part B — Configure the API (Render)

Set these in **Render → your service → Environment** (they are `sync:false`, so not in git):

| Env var | Value |
|---|---|
| `NODE_ENV` | `production` (already set in render.yaml) |
| `WHATSAPP_PHONE_NUMBER_ID` | from Step 3 |
| `WHATSAPP_ACCESS_TOKEN` | from Step 3 (temp) or Step 6 (permanent) |
| `META_APP_SECRET` | from Step 4 |
| `WHATSAPP_VERIFY_TOKEN` | **any random string you invent** (e.g. `my-verify-abc123`) — remember it |
| `PUBLIC_WEBHOOK_BASE_URL` | your Render URL, e.g. `https://whats-up-api.onrender.com` (no trailing slash) |
| `WHATSAPP_TEMPLATE_LANGUAGE` | `en_US` (default) |

Save → Render redeploys. Wait until the service is **Live**.

**Sanity check:** open in a browser
```
https://<your-render-url>/api/v1/whatsapp/webhook
```
You should see: *"WhatsApp webhook is reachable…"*. If you get an error page, the API
isn't up yet (check Render logs).

---

## Part C — Register the webhook in Meta (this enables RECEIVING)

1. Meta app dashboard → **WhatsApp → Configuration**.
2. Under **Webhook**, click **Edit**.
3. **Callback URL:**
   ```
   https://<your-render-url>/api/v1/whatsapp/webhook
   ```
4. **Verify token:** the **exact** string you set for `WHATSAPP_VERIFY_TOKEN`.
5. Click **Verify and save**.
   - Meta sends a GET request; the app echoes the challenge only if the token matches.
   - If it fails: the token strings don't match exactly (check for spaces), or the API
     isn't Live yet.
6. Back on the Configuration page, under **Webhook fields**, click **Manage** and
   **Subscribe** to **`messages`**. (This is what delivers inbound messages + delivery
   statuses.)

---

## Part D — Test send + receive

### Receive (customer → you)
1. From your personal WhatsApp, send a message to the **test number** (dev) or your
   **real number** (after Step 6).
2. It should appear in the app **Inbox** within a few seconds.
   - If not: Render logs will show the incoming webhook or an error. Cold start can
     delay the first message ~30–60s on free tier (see Part F).

### Send (you → customer) — within 24h window
1. In the Inbox, open that conversation and reply.
2. The customer receives it on WhatsApp. Delivery ticks update (sent → delivered → read).

> **Important — the 24-hour rule:** you can only send *free-form* text within 24h of the
> customer's last message. To message someone *first* (or after 24h), you must use an
> **approved template** (Step 5) via the **Campaigns** feature.

---

## Part E — Before real launch (production hardening)

### Step 5: Create & approve a message template
1. Meta **Business Manager → WhatsApp Manager → Message templates → Create template**.
2. Pick category (e.g. **Marketing** or **Utility**), language `en_US`, add body text
   with variables like `{{1}}`.
3. Submit → Meta approves (minutes to a day).
4. Use it from the app's **Campaigns** feature for outbound-initiated messages.

### Step 6: Permanent access token (the temp one expires in 24h)
1. **Business Manager → Business settings → Users → System users** → **Add** a system user
   (role: Admin).
2. **Add assets** → assign your **WhatsApp app** (full control).
3. **Generate new token** → select the app → scopes: `whatsapp_business_messaging` and
   `whatsapp_business_management` → generate.
4. Copy the token → set as `WHATSAPP_ACCESS_TOKEN` in Render → redeploy.
   - This token does not expire (unless revoked). The dashboard's 24h token will stop
     working the next day, so do this before launch.

### Step 7: Register your real business number
1. **WhatsApp → API Setup → Add phone number** (or in WhatsApp Manager).
2. Verify it via SMS/call. Set a display name (needs Meta review).
3. Use its new **Phone Number ID** as `WHATSAPP_PHONE_NUMBER_ID`.

### Step 8: Take the app out of "development"
- To message numbers beyond your test recipients, the app must be in **Live** mode and
  the WABA must complete **Business Verification** in Business Manager.

---

## Part F — Gotchas specific to this deploy

- **`NODE_ENV=production` is mandatory.** In non-production the app *silently simulates*
  WhatsApp sends and falls back to mock on API errors. Production makes real calls and
  surfaces real errors.
- **Token must look real.** The app treats a token as "sandbox" (fake sends) if it is
  missing, shorter than 30 chars, or contains `your-`/`placeholder`, or if
  `WHATSAPP_SANDBOX_MODE=true`. Keep `WHATSAPP_SANDBOX_MODE=false`.
- **Render free-tier cold starts** (~30–60s after 15 min idle) can drop the *first*
  inbound webhook. Meta retries, but for reliable receiving use a paid instance or ping
  the health URL every ~14 min to keep it warm.
- **Webhook path:** it is `…/api/v1/whatsapp/webhook` (both GET verify and POST). Use
  exactly that.
- **Signature check:** in production, inbound webhooks without a valid
  `x-hub-signature-256` (from `META_APP_SECRET`) are rejected with 403 — so the App Secret
  must be correct.

---

## Quick reference — verify each layer

```bash
# 1. API up?
curl https://<render-url>/api/v1/health          # {"status":"ok",...}

# 2. Webhook reachable? (GET without params)
curl https://<render-url>/api/v1/whatsapp/webhook # "WhatsApp webhook is reachable..."

# 3. Simulate Meta's verification handshake (should echo 'test123')
curl "https://<render-url>/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"
```

If step 3 returns `test123`, verification will succeed in the Meta console.
