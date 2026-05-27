# AI Content & Communication OS 🚀

A comprehensive, multi-channel AI Content & Communication suite designed for Indian SMBs. The platform seamlessly bridges the gap between customer relationship management and automated visual marketing, acting as a unified **WhatsApp CRM + Canva-style Content Studio + Buffer-style Social Scheduler + AI Reels Creator**.

---

## 🛠️ The Technology Stack

* **Frontend Next.js App**: Next.js 15, TypeScript, Tailwind CSS, Radix UI primitives, TanStack React Query, Zustand, Socket.io client.
* **Backend NestJS Service**: NestJS, Prisma ORM, Cloud PostgreSQL (Neon Serverless), Redis (BullMQ queues), JWT Auth, Socket.io gateways, Passport secure middlewares.
* **Integrations Engine**: Meta WhatsApp Cloud API, OpenAI GPT models, Ollama local llama3 options, and architectural blueprints for ElevenLabs voiceovers and Remotion MP4 compilations.
* **Encryption System**: AES-256-GCM encryption-at-rest for connected social OAuth tokens with frontend masking (`******`).

---

## 📂 Project Structure

```
apps/web          → Next.js frontend client (deployed on Vercel)
apps/api          → NestJS server API (deployed on Render/Railway)
packages/shared   → Shared validation Zod schemas, models, and types
```

---

## ⚡ Quick Start (Local Setup)

### 1. Installation & Settings
Clone the project, install dependencies, and generate local configurations:
```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### 2. Connect Your Database
Launch the local Docker containers:
```bash
docker compose up -d   # Starts Postgres (5433) & Redis (6379)
```

*Alternatively, connect to a cloud serverless Neon instance by setting `DATABASE_URL` in `apps/api/.env`.*

Configure database tables, run migrations, and **seed premium demo credentials**:
```bash
pnpm db:setup
pnpm db:seed
```

> 🌟 **The Database Seed** automatically provisions **exactly 2 vertical industry presets** populated with premium marketing accounts, realistic UTM campaigns, inbox message vlogs, and leads splits:
> 1. **Skyline Luxury Living** (Real Estate preset): `realestate@demo.com` / `password123`
> 2. **Apex Academy** (Coaching preset): `coaching@demo.com` / `password123`
> 3. **Super Admin Console**: `superadmin@platform.com` / `password123`

### 3. Launch Development Workspace
```bash
pnpm dev
```
* Client Dashboard: [http://localhost:3000](http://localhost:3000)
* Platform Super Admin: [http://localhost:3000/admin](http://localhost:3000/admin)
* Backend Health Check: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

---

## 💡 Key Core Modules

### 1. AI Content Studio
* **Brand Kit Builder**: Save primary/secondary HEX branding colors, typography fonts, and voice guidelines.
* **AI Copywriting Suite**: Leverage conversion-focused frameworks (such as **AIDA** - Attention, Interest, Desire, Action) to generate captions, high-performing Facebook Ad copies, WhatsApp CTAs, and 5-slide visual Carousel layout designs.
* **Viral Topic Planner**: Input your vertical type and extract trending short-form topics, hooks, and ideas (fully optimized in Roman conversational **Hinglish** for local retail reach).

### 2. Reel Creator & Mobile Timeline Simulator
* **AI Storyboard Synthesizer**: Input a hook, select an industry preset, and compile a 30-second vertical Reel split into **4 modular scenes** detailing script narration text, visual prompt definitions, stock image overlays, and transition timings.
* **Vertical Player Simulator**: A high-fidelity, client-side phone frame mockup in React that renders background image transitions (`fade`, `slide`, `pop`) and displays custom animated yellow overlay subtitles dynamically timed to scene durations.
* **Narration Mappings**: Configure custom Hinglish vocal voiceovers (Rajesh, Sneha, Kabir) ready to connect to ElevenLabs.

### 3. Media Library Asset Explorer
* Organize graphic elements, audio soundtracks, and videos inside distinct workspace folders (`General`, `Campaigns`, `Reels`).

### 4. Drag-and-Drop Content Calendar
* Schedule posts across Instagram Reels and Facebook Page feeds. Easily review queued releases, track status flags (`PENDING`, `SENT`), and trigger quick-publish workflows.

---

## 🔒 Enterprise-Grade Security (OAuth Encryption)

To secure connected Meta and Google OAuth assets:
1. **AES-256-GCM Encrypted Storage**: Access tokens connected via the backend are automatically encrypted at-rest using **AES-256-GCM** via your `SecretsCryptoService` before writing to the `SocialAccount` DB records.
2. **Frontend Token Masking**: Fetch routes (`GET /content/social-accounts`) automatically scrub token values, returning `******` values so active credentials are never leaked to client logs or frontend browsers.
3. **Secure connection controllers**: A secure `POST /content/social-accounts` controller encrypts client credentials securely during first-time setups.

---

## 📡 Expanded API Endpoints Map

### Core CRM & Platform
| Method | Path | Description |
| :--- | :--- | :--- |
| **GET** | `/health` | Cloud Neon Postgres connection verification |
| **POST** | `/auth/login`, `/auth/admin/login` | Secure JWT Session Generation |
| **GET** | `/dashboard/stats` | Unified performance metrics summary |

### AI Content Studio & CRM OS
| Method | Path | Description |
| :--- | :--- | :--- |
| **GET** | `/content/brand-kit` | Load active brand style variables |
| **PATCH** | `/content/brand-kit` | Modify brand voice configurations & custom CTA |
| **POST** | `/content/studio/generate` | Generate AIDA ad copies, captions, and carousel outlines |
| **POST** | `/content/ideas/generate` | Extract Hinglish short-form viral script concepts |
| **POST** | `/content/reels` | Generate vertical 4-scene storyboard scripts |
| **GET** | `/content/reels` | Fetch all historical vertical Reel timeline projects |
| **POST** | `/content/reels/:id/render` | Trigger background MP4 video compile task |
| **GET** | `/content/media` | Fetch media asset details inside folders |
| **POST** | `/content/media` | Upload and organize graphic library assets |
| **GET** | `/content/calendar` | Fetch all scheduled posts for current month |
| **POST** | `/content/calendar` | Lock scheduled posts into calendar schedule |
| **GET** | `/content/social-accounts` | List connected social profiles (masked tokens) |
| **POST** | `/content/social-accounts` | Securely link a Meta/Google account (AES-GCM encrypted) |
| **GET** | `/content/analytics` | Fetch traffic, impression splits, and click trends |

---

## 🌐 Deployed Environment Checklist

To ensure clean execution when deployed live on **Vercel** and **Render**:

### Vercel (Next.js Frontend Env)
* `NEXT_PUBLIC_API_URL`: **MUST** point to your Render service address (e.g. `https://my-backend.onrender.com/api/v1`).
* `NEXT_PUBLIC_WS_URL`: Point to your websocket address (e.g. `https://my-backend.onrender.com`).

### Render (NestJS API Env)
* `DATABASE_URL`: Cloud Neon PostgreSQL connection URI.
* `CORS_ORIGIN`: **MUST** point to your live Vercel domain (e.g. `https://my-front-end.vercel.app`) to allow secure cross-origin HTTP credentials checks.
* `ENCRYPTION_KEY`: A secure 32-byte string (generate using `openssl rand -base64 32`) to encrypt/decrypt database secrets.
* `OPENAI_API_KEY`: Required for live, generative Hinglish copywriting and script synthesis.
