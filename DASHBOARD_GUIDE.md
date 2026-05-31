# Togahh Outreach Dashboard — User Guide

> **Platform:** Medical Tourism Email Outreach Automation  
> **URL:** https://togaah-outreach-kc5r.vercel.app/dashboard  
> **Stack:** Next.js 14 · Supabase · n8n Workflows · Instantly.ai

---

## Table of Contents

1. [Dashboard (Home)](#1-dashboard-home)
2. [Email Messages](#2-email-messages)
3. [Outreach Analytics](#3-outreach-analytics)
4. [Lead Scraper](#4-lead-scraper)
5. [Scraper History](#5-scraper-history)
6. [Reset Lead Status](#6-reset-lead-status)
7. [Data Tables (Supabase)](#7-data-tables-supabase)
8. [How Everything Connects](#8-how-everything-connects)

---

## 1. Dashboard (Home)

**Route:** `/dashboard`

The main overview page. Shows a live snapshot of all automation activity.

### What You See

| Card | What It Shows |
|---|---|
| **Total Email Templates Generated** | Total number of AI-generated email campaigns created (all time) |
| **Leads Scraped** | Total businesses found via Google Maps scraper, with valid email count below |
| **Workflows Success Rate** | % of all n8n workflow executions that completed successfully |

### Charts

- **Campaigns per Month** — Bar chart showing how many email campaigns were created in each of the last 6 months
- **Leads by Sheet** — Pie chart showing how leads are distributed across tables (table1–table6)

### Recent Workflow Executions

Shows the last 8 automation runs. Each row displays:
- **Icon** — Email (campaign), Search (scraper), or Trash (cleanup/approval)
- **Name** — The workflow name or location/niche
- **Time** — How long ago it ran
- **Status** — SUCCESS (green), FAILED (red), RUNNING (blue), PENDING (yellow)
- **Delete button** — Available on every row to remove the execution record

### Quick Actions

Two shortcut cards at the bottom:
- **New Campaign** → goes to create a new AI email
- **Scrape Leads** → goes to the Lead Scraper form

---

## 2. Email Messages

**Route:** `/dashboard/campaigns`

Manages the full lifecycle of AI-generated email campaigns.

### Campaign Statuses

| Status | Meaning |
|---|---|
| `PENDING_APPROVAL` | AI generated the email — waiting for your review |
| `APPROVED` | You approved it and emails were sent via Instantly.ai |
| `REJECTED` | You rejected or regenerated it |

### How to Create a New Email

1. Click **+ New Email Message**
2. Fill in the form:
   - **Email Name** — Internal reference name
   - **Service Type** — Hair Transplant, Dental, Cosmetic Surgery, Eye Treatment, IVF, etc.
   - **Target Region** — Europe, Middle East, Asia, North America, Global
   - **Lead Sheet** — Which table to pull leads from (table1–table6, shows live lead count)
   - **Email Goal** — Book consultation, Share content, etc.
   - **Email Message** — Brief description of what the email should say
   - **Email Tone** — Warm, Professional, Friendly, Urgent
   - **CTA Button Text + Link** — The call-to-action button in the email
3. Click **Create Campaign & Generate Content**
4. Wait 50–120 seconds while AI generates the full email

### Reviewing & Approving

1. Find the campaign with `PENDING_APPROVAL` status
2. Click **Review & Approve**
3. A dialog opens showing:
   - Subject line, preview text
   - Full email body (scrollable)
4. Options:
   - **Approve & Send** — Triggers n8n to send emails via Instantly.ai
   - **Reject & Regenerate** — Enter feedback, AI rewrites the email
   - **Just Reject** — Marks as rejected without regenerating

### Reusing a Campaign

Click **Reuse** on any existing campaign → the form pre-fills with the old settings → edit and generate fresh content.

---

## 3. Outreach Analytics

**Route:** `/dashboard/outreach`

Live email performance data pulled directly from **Instantly.ai**.

### Stats Cards (8 metrics)

| Metric | What It Means |
|---|---|
| **Total Leads** | Total contacts across all Instantly.ai campaigns |
| **Contacted** | How many leads were contacted |
| **Emails Sent** | Total emails sent out |
| **Opened** | How many recipients opened the email |
| **Replies** | How many replied |
| **Completed** | Finished the full email sequence |
| **Bounced** | Emails that couldn't be delivered |
| **Unsubscribed** | Contacts who opted out |

### Campaign Table

Shows each Instantly.ai campaign with: Leads, Contacted, Sent, Opened, Open %, Replies, Reply %, Clicks, Bounced, Done.

> Data refreshes automatically every 60 seconds. Click **Refresh** to update manually.

---

## 4. Lead Scraper

**Route:** `/dashboard/scraper`

Finds business contacts from **Google Maps** and saves them to your Supabase lead tables.

### How to Run a Scrape

1. Fill in the form:
   - **Business Niches** — Type of businesses to search (letters only, no numbers). Example: `hair clinic, dental clinic`
   - **Location (City, Country)** — Type 2+ characters → select from the autocomplete dropdown. Must be selected from suggestions (no free typing)
   - **Max Results** — Between 50 and 500. Auto-corrects if out of range
   - **Save Verified Leads To** — Select table1–table6 (shows current lead count per table)
2. Click **Start Lead Scraper**
3. A loading screen appears with step-by-step progress (takes 2–8 minutes)
4. Success screen shows: Total Found, Leads Saved, Save Rate

### Important Notes

- Numbers are blocked in Business Niches and Location fields
- Location must be selected from the autocomplete dropdown — random text is not accepted
- Keep the tab open during scraping (process runs up to 10 minutes)
- Results are saved directly to the selected Supabase table

---

## 5. Scraper History

**Route:** `/dashboard/scraper/history`

Shows all past scraping runs with their results.

### Summary Stats at Top

- Total Runs, Total Scraped, Verified Leads, Invalid

### History Table Columns

| Column | Description |
|---|---|
| Niches | What business types were searched |
| Location | City and country searched |
| Total | Total businesses found |
| Verified | Leads with valid emails saved |
| Invalid | Leads with no valid email |
| Rate | % of leads that were valid |
| Status | SUCCESS or FAILED |
| Duration | How long the scrape took |
| Date | When it ran |

---

## 6. Reset Lead Status

**Route:** `/dashboard/leads/reset`

Resets the `sent_status` column on any lead table so those leads become available for new campaigns again.

### When to Use

Instantly.ai marks leads as "sent" after an email is sent. Once all leads in a table are marked sent, no more emails go out. Use this to reset and re-use the same leads for a new campaign.

### How to Reset

1. Select a table from the dropdown (shows live lead count per table)
2. Click **Reset Sent Status**
3. A confirmation dialog appears — click **Yes, Reset Now**
4. All leads in that table become available again

### Tables Available

| Table | Contains |
|---|---|
| table1 | All Services leads |
| table2 | Hair Transplant leads |
| table3 | Dental Treatment leads |
| table4 | Cosmetic Surgery leads |
| table5 | Eye Treatment leads |
| table6 | IVF Fertility leads |

---

## 7. Data Tables (Supabase)

Lead data is stored in Supabase PostgreSQL. Each table (table1–table6) contains business contacts scraped from Google Maps.

### Typical Table Columns

- `email` — Business email address
- `name` / `business_name` — Business name
- `phone` — Phone number (if found)
- `website` — Website URL
- `address` — Physical address
- `sent_status` — Whether Instantly.ai has sent an email to this lead

Row counts are visible live in the Lead Scraper and Reset Lead Status dropdowns.

---

## 8. How Everything Connects

```
You fill a form
       ↓
Dashboard calls an API route (/api/...)
       ↓
API route calls an n8n Webhook
       ↓
n8n runs automation:
  • Campaigns  → AI generates email → saves to DB → you approve → Instantly.ai sends
  • Scraper    → Searches Google Maps → validates emails → saves to Supabase table
  • Reset      → Updates sent_status in Supabase table
       ↓
Dashboard shows results from Prisma DB (campaigns, scraper history)
Outreach Analytics shows results from Instantly.ai API
```

### Key Integrations

| Service | Purpose |
|---|---|
| **n8n** (self-hosted) | Runs all background automations (scraping, email generation, sending) |
| **Instantly.ai** | Sends cold emails and tracks open/reply rates |
| **Supabase** | Stores scraped lead data (table1–table6) |
| **Prisma DB** | Stores campaign records, workflow execution logs |
| **OpenStreetMap / Nominatim** | Powers the location autocomplete in Lead Scraper |

---

## Quick Reference — n8n Webhooks

| Action | Webhook | Timeout |
|---|---|---|
| Create Campaign (AI) | `/webhook/campaign-trigger` | 130 seconds |
| Approve & Send Emails | `/webhook/campaign-approve` | 120 seconds |
| Scrape Google Maps | `/webhook/scraper-trigger` | 10 minutes |
| Reset Lead Status | `/webhook/reset-sent-status` | 60 seconds |

---

*Last updated: May 2026 · Togahh Medical Tourism Automation Platform*
