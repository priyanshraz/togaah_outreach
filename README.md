# Togahh Automation Dashboard

Production-grade outreach automation dashboard for Togahh Medical Tourism.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

### 3. Setup database
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Default login:** `admin@togahh.com` / `pass@123`

---

## Workflows

| Workflow | Trigger | What it does |
|---|---|---|
| **Campaign** | POST `/api/campaigns` | AI generates email → sends via Instantly.ai |
| **Scraper** | POST `/api/scraper` | Apify scrapes Google Maps → saves to Google Sheets |
| **Cleanup** | POST `/api/cleanup/trigger` | Deletes old Instantly contacts |

## Environment Variables

See `.env.example` for all required variables.

## Tech Stack
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (Supabase/Railway)
- **Auth:** NextAuth.js
- **Charts:** Recharts
- **State:** TanStack Query
