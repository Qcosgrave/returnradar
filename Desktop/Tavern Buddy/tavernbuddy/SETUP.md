# Tavernbuddy — Setup Guide

## Overview

Tavernbuddy is a SaaS app for bar owners. It connects to Square POS, generates weekly AI insights via Claude, and delivers them by email every Monday. Bar owners can also ask questions about their data via an AI chat interface.

**Stack:** Next.js 16, Supabase, Stripe, Square API, Claude AI (claude-sonnet-4-6), Resend

---

## Step 1: Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste + run the contents of `supabase-schema.sql`
3. Go to **Settings → API** and copy:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` — service_role key (keep this secret)
4. Go to **Authentication → URL Configuration** and set:
   - Site URL: `https://yourdomain.com` (or `http://localhost:3000` for dev)
   - Redirect URLs: add `http://localhost:3000/auth/callback` and `https://yourdomain.com/auth/callback`

---

## Step 2: Square Developer App

1. Create an account at [developer.squareup.com](https://developer.squareup.com)
2. Create a new **Application**
3. Under **OAuth**, set the redirect URL to:
   - `http://localhost:3000/api/square/callback` (dev)
   - `https://yourdomain.com/api/square/callback` (production)
4. Copy:
   - `SQUARE_APPLICATION_ID` — Application ID
   - `SQUARE_APPLICATION_SECRET` — Application Secret
5. Set `SQUARE_ENVIRONMENT=sandbox` for development, `production` when live
6. Enable these OAuth scopes: `MERCHANT_PROFILE_READ`, `PAYMENTS_READ`, `ORDERS_READ`, `ITEMS_READ`, `EMPLOYEES_READ`, `TIMECARDS_READ`

---

## Step 3: Stripe

1. Create an account at [stripe.com](https://stripe.com)
2. Get your keys from **Developers → API Keys**:
   - `STRIPE_SECRET_KEY` — secret key (sk_...)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — publishable key (pk_...)
3. Create two **Products** with recurring prices:
   - Starter: $99/month → copy price ID to `STRIPE_STARTER_PRICE_ID`
   - Pro: $249/month → copy price ID to `STRIPE_PRO_PRICE_ID`
4. Set up a **Webhook** at `https://yourdomain.com/api/stripe/webhook` listening for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`
5. Enable the **Customer Portal** in Stripe Dashboard → Billing → Customer Portal

---

## Step 4: Anthropic (Claude)

1. Get an API key at [console.anthropic.com](https://console.anthropic.com)
2. Set `ANTHROPIC_API_KEY`

---

## Step 5: Resend (Email)

1. Create an account at [resend.com](https://resend.com)
2. Add and verify your sending domain (`reports@tavernbuddy.com` or your domain)
3. Get your API key and set `RESEND_API_KEY`
4. Update the `from` address in `src/lib/resend.ts` to match your verified domain

---

## Step 6: Environment Variables

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

SQUARE_APPLICATION_ID=sq0idp-...
SQUARE_APPLICATION_SECRET=sq0csp-...
SQUARE_ENVIRONMENT=sandbox

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

ANTHROPIC_API_KEY=sk-ant-...

RESEND_API_KEY=re_...

NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=generate-a-random-secret-here
```

---

## Step 7: Running Locally

```bash
cd tavernbuddy
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Step 8: Deploying to Vercel

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Set the root directory to `tavernbuddy`
4. Add all environment variables from `.env.local`
5. Set `NEXT_PUBLIC_APP_URL` to your production URL
6. The `vercel.json` configures two cron jobs:
   - Nightly sync: `0 2 * * *` (2am UTC) → `/api/cron/sync`
   - Weekly reports: `0 8 * * 1` (Monday 8am UTC) → `/api/cron/weekly-reports`
7. After deploy, update your Square OAuth redirect URL and Stripe webhook URL to production

---

## Cron Job Security

Cron jobs are secured with `CRON_SECRET`. When Vercel calls cron routes, it passes `Authorization: Bearer <CRON_SECRET>`. Set this to a random 32+ character string.

---

## Manual Report Generation (Testing)

You can manually trigger a report for your own account:

```bash
curl -X POST https://yourdomain.com/api/cron/weekly-reports \
  -H "Cookie: <your session cookie>"
```

Or trigger it from Settings in the dashboard (coming soon).

---

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── auth/                 # Login, signup, OAuth callback
│   ├── onboarding/           # 3-step onboarding flow
│   ├── dashboard/            # Dashboard pages
│   │   ├── page.tsx          # Overview with KPIs + charts
│   │   ├── reports/          # Weekly reports archive
│   │   ├── chat/             # Ask Tavernbuddy (Pro)
│   │   └── settings/         # Profile, Square, billing
│   └── api/
│       ├── square/           # OAuth flow + disconnect
│       ├── stripe/           # Checkout, portal, webhook
│       ├── cron/             # Nightly sync + weekly reports
│       ├── chat/             # AI chat endpoint
│       ├── reports/          # Reports API
│       ├── dashboard/        # Metrics API
│       └── user/             # User profile API
├── lib/
│   ├── supabase/             # Client, server, admin clients
│   ├── square.ts             # Square API helpers
│   ├── stripe.ts             # Stripe helpers
│   ├── claude.ts             # Report generation + chat
│   ├── resend.ts             # Email sending
│   ├── data.ts               # Data aggregation queries
│   └── sample-data.ts        # Fallback demo data
└── components/
    └── dashboard/            # UI components
```

---

## Sample Data

When Square isn't connected, the dashboard shows sample data from `src/lib/sample-data.ts`. This keeps the UI useful during development and for new signups who haven't connected yet.

---

## Plans

| Feature | Starter ($99/mo) | Pro ($249/mo) |
|---------|-----------------|---------------|
| Weekly reports | ✓ | ✓ |
| Email delivery | ✓ | ✓ |
| Dashboard | ✓ | ✓ |
| Ask Tavernbuddy chat | — | ✓ |
| Historical queries | — | ✓ |
