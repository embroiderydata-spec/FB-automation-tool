# Database Backups & Disaster Recovery Runbook

## 1. Supabase Backup Architecture

PagePulse AI relies on Supabase PostgreSQL for all persistent state. Depending on the Supabase tier, backups are handled as follows:

| Plan | Backup Type | Frequency | Retention | Point-In-Time Recovery (PITR) |
|---|---|---|---|---|
| **Free Tier** | Automated Nightly Physical Backups | Daily | 7 Days | Not Available |
| **Pro Tier** | Automated Nightly + Daily Physical | Daily | 7 Days | Available (7 Days add-on) |
| **Team / Enterprise**| Automated Nightly + PITR | Continuous WAL | Up to 30 Days | Included |

---

## 2. Automated Logical Backups (Recommended Secondary Backup)

To ensure cloud independence, configure a scheduled logical dump via GitHub Actions or VPS cron using `pg_dump`.

### Manual Backup Command
```bash
# Export complete schema and data into compressed SQL
pg_dump "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  --clean \
  --if-exists \
  --quote-all-identifiers \
  --no-owner \
  --no-privileges \
  | gzip > "backup_pagepulse_$(date +%Y%m%d_%H%M%S).sql.gz"
```

### Automated GitHub Actions Workflow (.github/workflows/db-backup.yml)
- Runs daily at 02:00 UTC.
- Dumps database schema and uploads encrypted archive to private AWS S3 / Cloudflare R2 bucket.
- Retains backups for 30 days.

---

## 3. Disaster Recovery & Restoration Procedures

In the event of accidental data corruption, migration failure, or infrastructure outage:

### Step 1: Emergency Platform Freeze
Immediately activate the Global Emergency Kill-Switch to pause all writes:
```bash
curl -X POST https://your-domain.vercel.app/api/emergency \
  -H "Content-Type: application/json" \
  -d '{"action": "pause", "confirmation": "CONFIRM_EMERGENCY_STOP", "reason": "Database restore in progress"}'
```

### Step 2: Supabase Point-In-Time Restore (Pro Tier)
1. Navigate to **Supabase Dashboard → Project Settings → Backups**.
2. Select **Point in Time**.
3. Choose the timestamp immediately preceding the outage/incident.
4. Click **Restore Database**.

### Step 3: Manual Restoration from SQL Dump
```bash
# Decompress and restore via psql
gunzip -c backup_pagepulse_20261120.sql.gz | psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Step 4: Post-Restore Verification Checklist
- [ ] Verify `public.profiles` count matches expected active users.
- [ ] Verify `public.facebook_pages` connections and decryption status.
- [ ] Run permission migration (`supabase/migrations/20240108000000_grant_permissions.sql`).
- [ ] Test health check endpoint: `GET /api/health/database`.
- [ ] Resume operations:
```bash
curl -X POST https://your-domain.vercel.app/api/emergency \
  -H "Content-Type: application/json" \
  -d '{"action": "resume", "confirmation": "CONFIRM_RESUME"}'
```
