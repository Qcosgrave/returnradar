# ReturnRadar 🔔

**Never miss a return window again.** Forward receipts to your personal inbox address and get automated alerts before return deadlines expire.

---

## Architecture

```
Email forwarded → Mailgun webhook → FastAPI backend → Claude parser → Postgres
                                                                        ↓
                                               Daily scheduler → SendGrid alert emails
                                                                        ↓
                                                             React dashboard (Vercel)
```

---

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your keys

uvicorn main:app --reload
# API runs at http://localhost:8000
```

**.env.example:**
```
ANTHROPIC_API_KEY=sk-ant-...
SENDGRID_API_KEY=SG...
FROM_EMAIL=alerts@yourdomain.com
APP_URL=http://localhost:5173
DATABASE_URL=sqlite+aiosqlite:///./returnradar.db
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App runs at http://localhost:5173
```

---

## Deployment

### Backend → Railway (recommended)

1. Create account at [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo → select `backend/` folder
3. Add a **Postgres** database from Railway's addon menu
4. Set environment variables in Railway dashboard:
   - `DATABASE_URL` → copy from Railway Postgres addon (change `postgresql://` to `postgresql+asyncpg://`)
   - `ANTHROPIC_API_KEY`
   - `SENDGRID_API_KEY`
   - `FROM_EMAIL`
   - `APP_URL` (your Vercel frontend URL)
5. Railway auto-deploys on git push

### Frontend → Vercel

1. Create account at [vercel.com](https://vercel.com)
2. New Project → Import GitHub repo → select `frontend/` folder
3. Framework preset: **Vite**
4. Add environment variable: `VITE_API_URL=https://your-railway-app.railway.app`
5. Deploy — done.

---

## Email Ingestion Setup (Mailgun)

1. Create account at [mailgun.com](https://mailgun.com) (free tier: 1,000 emails/month)
2. Add a domain (e.g., `inbox.returnradar.app`) or use the sandbox domain for testing
3. Go to **Receiving** → **Create Route**:
   - Expression: `match_recipient(".*@inbox.returnradar.app")`
   - Action: `forward("https://your-api.railway.app/api/emails/inbound")`
4. That's it — emails forwarded to `anything@inbox.returnradar.app` now hit your API

**User onboarding:** When a user signs up, generate their unique address (e.g., `john8f2a91c4@inbox.returnradar.app`) and show it in the dashboard. They forward receipts there or set up a mail rule.

---

## Alert Scheduler Setup

The scheduler needs to run once per day. Two options:

### Option A: Railway Cron Job (easiest)
In Railway, add a second service pointing to the same repo with start command:
```
python scheduler.py
```
Set it to run daily via Railway's cron feature.

### Option B: Add to FastAPI startup with APScheduler
```python
# In main.py lifespan:
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from scheduler import run_alerts

scheduler = AsyncIOScheduler()
scheduler.add_job(run_alerts, 'cron', hour=9, minute=0)
scheduler.start()
```

---

## How the Parser Works

1. **Classify** — keyword matching on subject/body → is this a receipt?
2. **Heuristic extract** — regex for merchant, date, total, order ID, return window
3. **Claude fallback** — if confidence < 0.7 or missing key fields, ask Claude to extract structured JSON
4. **Policy resolve** — use explicit window from email → merchant table → 30-day fallback
5. **Deadline compute** — `delivery_date || order_date + return_window_days`

Claude prompt enforces `return_window_days: null` if not explicitly stated — no hallucinated policies.

---

## Project Structure

```
receipt-agent/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── database.py          # SQLAlchemy models + DB init + merchant seed data
│   ├── parser.py            # Full parsing pipeline (classify → extract → resolve)
│   ├── scheduler.py         # Daily alert job
│   ├── railway.toml         # Railway deployment config
│   ├── requirements.txt
│   └── routers/
│       ├── emails.py        # Inbound webhook
│       ├── purchases.py     # Purchase CRUD
│       ├── users.py         # User management
│       └── alerts.py        # Alert history
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        └── App.jsx          # Full dashboard UI
```

---

## Merchant Policy Table

30 top merchants are pre-seeded in `database.py` including Amazon (30d), Apple (14d), Nike (60d), Nordstrom (365d), Zappos (365d), Costco (90d), and more. Add new merchants directly to the seed list or via a database admin UI.

---

## Next Steps (V2 ideas)

- Gmail OAuth so users don't have to forward manually
- SMS alerts via Twilio
- Category-specific policies (Apple devices vs accessories)
- Delivery-date detection from shipping emails
- Browser extension for one-click receipt capture
- React Native mobile app wrapper for App Store
