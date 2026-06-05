export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { prisma } from '@/lib/prisma';

const BASE = 'https://api.instantly.ai/api/v2';
const TABLES = ['table1', 'table2', 'table3', 'table4', 'table5', 'table6'];

function hdrs() {
  return {
    Authorization: `Bearer ${process.env.INSTANTLY_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

interface Lead { id: string; email: string; }

// ── Fetch bounced leads using POST /leads/list ────────────────────────────
async function getBounced(campaign_id: string): Promise<Lead[]> {
  const leads: Lead[] = [];
  let skip = 0;
  while (true) {
    const res = await fetch(`${BASE}/leads/list`, {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ campaign_id, filter_list_status: [3], limit: 100, skip }),
    });
    if (!res.ok) { console.error('leads/list', res.status, await res.text().catch(() => '')); break; }
    const raw = await res.json();
    // Log first call to understand structure
    if (skip === 0) console.log('[bounced] sample:', JSON.stringify(raw).slice(0, 400));
    const items: Record<string, unknown>[] = Array.isArray(raw) ? raw
      : Array.isArray(raw?.items) ? raw.items
      : Array.isArray(raw?.data) ? raw.data : [];
    items.forEach((l) => {
      const email = String(l.email ?? '').toLowerCase().trim();
      const id = String(l.id ?? l.lead_id ?? l._id ?? '');
      if (email) leads.push({ id, email });
    });
    if (items.length < 100) break;
    skip += 100;
  }
  return leads;
}

// ── Try multiple delete strategies for Instantly ─────────────────────────
async function deleteFromInstantly(campaign_id: string, leads: Lead[]): Promise<number> {
  let deleted = 0;
  for (const lead of leads) {
    let ok = false;

    // Strategy 1: DELETE /lead/{id}?campaign_id=xxx  (no body)
    if (!ok && lead.id) {
      const r = await fetch(`${BASE}/lead/${lead.id}?campaign_id=${campaign_id}`, {
        method: 'DELETE', headers: hdrs(),
      });
      if (r.ok) { ok = true; }
      else console.log(`S1 ${r.status}`, lead.id);
    }

    // Strategy 2: DELETE /lead/{id}  (no body, no query)
    if (!ok && lead.id) {
      const r = await fetch(`${BASE}/lead/${lead.id}`, {
        method: 'DELETE', headers: hdrs(),
      });
      if (r.ok) { ok = true; }
      else console.log(`S2 ${r.status}`, lead.id);
    }

    // Strategy 3: POST /leads/delete  with email list
    if (!ok) {
      const r = await fetch(`${BASE}/leads/delete`, {
        method: 'POST', headers: hdrs(),
        body: JSON.stringify({ campaign_id, emails: [lead.email] }),
      });
      if (r.ok) { ok = true; }
      else console.log(`S3 ${r.status}`, lead.email);
    }

    // Strategy 4: Global unsubscribe — ensures no future emails
    if (!ok) {
      const r = await fetch(`${BASE}/account/unsubscribe/add`, {
        method: 'POST', headers: hdrs(),
        body: JSON.stringify({ emails: [lead.email] }),
      });
      if (r.ok) { ok = true; }
      else console.log(`S4 ${r.status}`, lead.email);
    }

    if (ok) deleted++;
  }
  return deleted;
}

// ── POST /api/instantly/delete-bounced ────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { campaign_id } = await req.json();
    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

    // Step 1: Get bounced leads
    const bouncedLeads = await getBounced(campaign_id);
    const emails = bouncedLeads.map((l) => l.email);
    console.log(`[bounced] found=${bouncedLeads.length} ids=${JSON.stringify(bouncedLeads.slice(0,2))}`);

    if (bouncedLeads.length === 0) {
      return NextResponse.json({ success: true, bounced_emails_found: 0, deleted_from_instantly: 0, deleted_from_supabase: 0, message: 'No bounced leads found' });
    }

    // Step 2: Delete from Instantly
    const deletedInstantly = await deleteFromInstantly(campaign_id, bouncedLeads);
    console.log(`[bounced] instantly deleted=${deletedInstantly}/${bouncedLeads.length}`);

    // Step 3: Delete from Supabase tables
    let deletedSupabase = 0;
    for (const table of TABLES) {
      try {
        const n = await prisma.$executeRawUnsafe(
          `DELETE FROM public."${table}" WHERE LOWER(TRIM(CAST(email AS TEXT))) = ANY($1::text[])`,
          emails
        );
        if (n > 0) { console.log(`[bounced] supabase ${table}: ${n}`); deletedSupabase += n; }
      } catch (e) { console.error(`[bounced] ${table}:`, String(e).slice(0, 150)); }
    }

    return NextResponse.json({
      success: true,
      bounced_emails_found: bouncedLeads.length,
      deleted_from_instantly: deletedInstantly,
      deleted_from_supabase: deletedSupabase,
      message: `${bouncedLeads.length} bounced · Instantly: ${deletedInstantly} · Supabase: ${deletedSupabase}`,
    });

  } catch (error) {
    console.error('[bounced] fatal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
