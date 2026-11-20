# Production Deployment & Operations Guide

## 1. Production Architecture Overview

PagePulse AI utilizes a decoupled production architecture:
1. **Web Dashboard & API**: Hosted on **Vercel** (Serverless Edge & Node.js runtime).
2. **Database & Storage**: Hosted on **Supabase** (Managed PostgreSQL with connection pooling & S3 storage).
3. **Dedicated Background Worker**: Hosted on a **VPS or Docker Container** (Railway, Fly.io, or Ubuntu VPS) to handle long-running FFmpeg video rendering, AI generation pipelines, and scheduled Facebook Reels publishing without browser dependencies.

---

## 2. Vercel Web Deployment

1. **Connect Repository**: Import the GitHub repository `embroiderydata-spec/FB-automation-tool` into Vercel.
2. **Environment Variables**:
   In Vercel Project Settings → Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `TOKEN_ENCRYPTION_KEY`
   - `META_APP_ID`
   - `META_APP_SECRET`
   - `OPENAI_API_KEY`
   - `REPLICATE_API_TOKEN` / `RUNWAY_API_KEY`
   - `ELEVENLABS_API_KEY`
3. **Deploy**: Build command `npm run build`, output directory `.next`.

---

## 3. Dedicated Background Worker Deployment (Docker / VPS)

Because vertical video rendering (1080x1920 @ 30fps) and multi-step AI video pipelines exceed serverless function timeout limits, the background worker runs as a dedicated process.

### Option A: Running with Docker Compose
```bash
# 1. Clone repository on VPS
git clone https://github.com/embroiderydata-spec/FB-automation-tool.git
cd FB-automation-tool

# 2. Configure production secrets
cp .env.example .env.local
nano .env.local

# 3. Launch worker and web stack
docker compose up -d worker
```

### Option B: Running with PM2 / Systemd
```bash
# Install dependencies & build
npm ci
npm run build

# Start worker under PM2 daemon manager
npm install -g pm2
pm2 start worker/runner.ts --name "pagepulse-worker" --interpreter npx --interpreter-args tsx
pm2 save
pm2 startup
```

---

## 4. Production Cron & Background Job Automation

If running without a persistent VPS worker, Vercel Cron Jobs can trigger the worker endpoints every 1-5 minutes via `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/publishing/worker",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/workflows/worker",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

---

## 5. Security Checklist Before Going Live

- [ ] All table permissions granted in Supabase (`supabase/migrations/20240108000000_grant_permissions.sql`).
- [ ] Row Level Security (RLS) enabled on all 14 database tables.
- [ ] AES-256-GCM `TOKEN_ENCRYPTION_KEY` set (64 hex characters).
- [ ] Meta Developer App switched to **Live Mode** with verified permissions (`read_insights`, `pages_manage_posts`, `pages_read_engagement`).
- [ ] Spending caps configured (`AI_MAX_DAILY_BUDGET`).
- [ ] Global Emergency Kill-Switch verified via `/dashboard/settings`.
