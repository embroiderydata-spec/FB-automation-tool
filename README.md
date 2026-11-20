# AI Facebook Page Automation Platform

A scalable SaaS web application engineered to manage and automate up to **100 Facebook Pages** from a single centralized dashboard.

> **Status:**  
> - **Phase 1: Project Foundation** — ✅ Completed  
> - **Phase 2: Facebook Page Manager & Meta OAuth Integration** — ✅ Completed  
> *Note: AI video generation and autonomous publishing workflows are scheduled for Phase 3.*

---

## 🛠️ Technology Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router, Server & Client Components)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict typing across schema & domain models)
- **Validation:** [Zod](https://zod.dev/) (Strict runtime payload and settings validation)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with CSS variables
- **UI Components:** Custom [shadcn/ui](https://ui.shadcn.com/) inspired design system
- **Icons:** [Lucide Icons](https://lucide.dev/)
- **Theme:** [next-themes](https://github.com/pacocoursey/next-themes) (Seamless dark/light mode toggle)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security & SSR Auth)
- **Meta Integration:** Official Meta Graph API v21.0 & OAuth 2.0 with AES-256-GCM token encryption
- **Test Runner:** [tsx](https://github.com/privatenumber/tsx) + Node.js Native Test Runner (`node:test`)

---

## 📐 Architecture & Module Structure

```
facebook-automation-tool/
├── app/
│   ├── (auth)/
│   │   └── login/                     # Supabase Auth Login & Demo Sandbox
│   ├── api/
│   │   ├── facebook-pages/            # GET /api/facebook-pages (list, stats, filters)
│   │   │   └── [id]/                  # GET, PATCH (settings), DELETE (disconnect)
│   │   │       ├── automation/        # POST (toggle automation on/off)
│   │   │       └── sync/              # POST (sync live metadata from Graph API)
│   │   └── meta/
│   │       ├── connect/               # GET (initiates OAuth with CSRF state cookie)
│   │       ├── callback/              # GET (validates state, exchanges tokens, saves account)
│   │       ├── disconnect/            # POST (disconnects account & associated pages)
│   │       └── pages/
│   │           ├── discover/          # GET (discovers accessible pages via Graph API)
│   │           └── import/            # POST (imports selected pages & initializes settings)
│   ├── dashboard/                     # Protected Dashboard Shell (App Router)
│   │   ├── page.tsx                   # Dashboard Overview & Metrics
│   │   ├── pages/                     # Facebook Pages Manager (Up to 100 Pages)
│   │   ├── content/                   # AI Content Studio (Phase 3 Preview)
│   │   ├── videos/                    # Video Library & Render Pipeline (Phase 3 Preview)
│   │   ├── calendar/                  # Content Publishing Calendar
│   │   ├── queue/                     # Publishing Queue & Dispatcher
│   │   ├── analytics/                 # Cross-Page Telemetry & Aggregation
│   │   ├── providers/                 # AI Providers & Secret Key Config
│   │   └── settings/                  # Platform Settings & Infrastructure Health
│   ├── globals.css                    # Tailwind theme tokens (dark/light)
│   └── layout.tsx                     # Root layout with Theme & Auth Providers
├── components/
│   ├── dashboard/
│   │   ├── pages/
│   │   │   ├── disconnect-dialog.tsx  # Confirmation dialog for safe disconnect
│   │   │   ├── page-import-modal.tsx  # Discovery & multi-page selection modal
│   │   │   └── page-settings-drawer.tsx # Detailed 4-tab settings drawer
│   │   ├── sidebar.tsx                # Collapsible sidebar with capacity meter
│   │   ├── header.tsx                 # Top navigation bar
│   │   └── stats-cards.tsx            # Key statistics cards
│   └── ui/                            # Button, Badge, Card, Input, Label, Tabs
├── lib/
│   ├── auth/                          # AuthContext, Supabase Session & Demo Session
│   ├── crypto/
│   │   └── encryption.ts              # AES-256-GCM token encryption & decryption
│   ├── meta/
│   │   ├── config.ts                  # Centralized Graph API v21.0 & permissions
│   │   ├── oauth.ts                   # OAuth URL builder, token exchange & state validation
│   │   └── graph.ts                   # GET /me/accounts with pagination & error handling
│   ├── supabase/                      # SSR Browser, Server & Middleware Clients
│   └── validations/
│       └── facebook.ts                # Zod schemas for imports, settings, toggles
├── supabase/
│   └── migrations/
│       ├── 20240101000000_initial_schema.sql             # Phase 1: 14 Core Tables & RLS
│       └── 20240102000000_phase2_facebook_management.sql  # Phase 2: Facebook Fields & Triggers
├── tests/
│   ├── encryption.test.ts             # 6 encryption & security tests
│   ├── graph-api.test.ts              # 4 pagination & error handling tests
│   ├── oauth.test.ts                  # 5 state & URL generation tests
│   └── validation.test.ts             # 8 Zod schema validation tests
├── .env.example                       # Example environment variable template
├── .env.local                         # Local environment config
└── middleware.ts                      # Route protection middleware
```

---

## 🔒 Security & Token Protection

1. **AES-256-GCM Server-Side Encryption:**
   All Meta user access tokens and Page access tokens are encrypted server-side using authenticated AES-256-GCM before being stored in Supabase PostgreSQL (`facebook_accounts` and `facebook_pages`).
2. **Zero Token Exposure:**
   Tokens are **never returned to client-side API responses**, never written to client storage (`localStorage` / `sessionStorage`), and never logged in console or error outputs.
3. **Cryptographic CSRF State Validation:**
   Every OAuth session generates a 256-bit cryptographic state stored in a secure `SameSite=Lax`, `HttpOnly` cookie with a 10-minute expiry.
4. **Tenant Isolation:**
   Supabase Row Level Security (RLS) ensures that every query strictly enforces `auth.uid() = user_id`. User A cannot access, view, or modify User B's Facebook Pages or accounts.
5. **Automation Safety Guardrail:**
   All imported Pages strictly have `automation_enabled = false` and `auto_publish = false` by default.

---

## 📘 Meta Developer App Setup Guide

To connect real Facebook Pages via official Meta OAuth, follow this step-by-step setup guide:

### 1. Create a Meta Developer App
1. Go to the [Meta for Developers Portal](https://developers.facebook.com/) and log in with your Facebook account.
2. Click **"My Apps"** ➔ **"Create App"**.
3. Select **"Other"** as the use case, then choose **"Business"** or **"Consumer"**.
4. Enter an App Name (e.g. `FB Automation Platform`) and your contact email. Click **"Create App"**.

### 2. Add and Configure Facebook Login
1. On the App Dashboard, find **"Facebook Login for Business"** (or **"Facebook Login"**) and click **"Set Up"**.
2. Select **"Web"** as the platform.
3. In the left navigation, go to **"Facebook Login"** ➔ **"Settings"**.
4. Under **"Valid OAuth Redirect URIs"**, add:
   ```
   http://localhost:3000/api/meta/callback
   ```
   *(For production, replace `http://localhost:3000` with your production domain, e.g. `https://yourdomain.com/api/meta/callback`)*.
5. Toggle **"Enforce HTTPS"** to YES (required for production domains).
6. Click **"Save Changes"**.

### 3. Retrieve App ID & App Secret
1. In the left navigation, go to **"App Settings"** ➔ **"Basic"**.
2. Copy your **App ID**.
3. Under **"App Secret"**, click **"Show"** and copy the secret.
4. Paste these values into your `.env.local` file:
   ```env
   META_APP_ID=your_copied_app_id
   META_APP_SECRET=your_copied_app_secret
   META_GRAPH_API_VERSION=v21.0
   META_OAUTH_REDIRECT_URI=http://localhost:3000/api/meta/callback
   ```

### 4. Permissions & Access Levels
Our platform requests the following 3 minimal permissions:
- **`pages_show_list`**: Lists the Facebook Pages managed by the user.
- **`pages_read_engagement`**: Reads Page profile pictures, follower counts, and engagement.
- **`pages_manage_posts`**: Configures publishing parameters and post scheduling.

> **Important Meta Access Notice:**  
> - **In Development Mode:** Only App Administrators, Developers, and Testers added under **"App Roles"** in your Meta App Dashboard can authorize the app. In Development Mode, you can connect any Facebook Page managed by those test accounts immediately without App Review!  
> - **In Production / Live Mode:** To allow third-party users outside your developer organization to connect their Pages, Meta requires **App Review** and **Business Verification** for `pages_read_engagement` and `pages_manage_posts` (Advanced Access).

### 5. Adding Testers for Development
1. In Meta Developer Dashboard, click **"App Roles"** ➔ **"Roles"**.
2. Click **"Add Administrators"** or **"Add Testers"**.
3. Enter the Facebook accounts that own or manage the Facebook Pages you want to test.
4. Have those users accept the invite at `https://developers.facebook.com/requests/`.

---

## 🚀 Running the Project & Tests

### 1. Run Automated Unit & Integration Tests (27 Passing Tests)
```powershell
npm test
```
Tests cover AES-256-GCM encryption/decryption, token exposure prevention, OAuth state validation, Graph API pagination, rate-limit error handling, and Zod input validation schemas.

### 2. Run Database Migrations in Supabase
Run the Phase 2 migration script in your Supabase SQL Editor:
- [supabase/migrations/20240102000000_phase2_facebook_management.sql](supabase/migrations/20240102000000_phase2_facebook_management.sql)

### 3. Start Local Development Server
```powershell
npm run dev
```
Open [http://localhost:3000/dashboard/pages](http://localhost:3000/dashboard/pages) in your browser.

---

## 📋 Phase 2 Checklist

- [x] Official Meta OAuth authorization flow (`GET /api/meta/connect` & `/api/meta/callback`)
- [x] Cryptographic state CSRF validation (`validateOAuthState`)
- [x] AES-256-GCM server-side token encryption & decryption
- [x] Page discovery with cursor-based pagination supporting 100+ Pages (`GET /api/meta/pages/discover`)
- [x] Zero access token exposure to browser
- [x] Interactive Page Selection & Import Modal with search, select all, counters, and deduplication
- [x] Detailed 4-tab Page Settings Drawer (Content, Video, Schedule, Automation)
- [x] Automation default strictly set to OFF
- [x] Live Page metadata synchronization (`POST /api/facebook-pages/[id]/sync`)
- [x] Quick automation toggle (`POST /api/facebook-pages/[id]/automation`)
- [x] Safe Page disconnection with job cancellation & history preservation (`DELETE /api/facebook-pages/[id]`)
- [x] Safe Account disconnection with permission revocation (`POST /api/meta/disconnect`)
- [x] 27 automated tests passing with 0 failures
- [x] Production build passes with 0 errors (`npm run build`)
