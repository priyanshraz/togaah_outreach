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

// ── Fetch bounced leads ────────────────────────────────────────────────────
async function getBounced(campaign_id: string): Promise<Lead[]> {
  const leads: Lead[] = [];
  let skip = 0;
  while (true) {
    const res = await fetch(`${BASE}/leads/list`, {
      method: 'POST', headers: hdrs(),
      body: JSON.stringify({ campaign_id, filter_list_status: [3], limit: 100, skip }),
    });
    if (!res.ok) break;
    const raw = await res.json();
    const items: Record<string, unknown>[] = Array.isArray(raw) ? raw
      : Array.isArray(raw?.items) ? raw.items
      : Array.isArray(raw?.data)  ? raw.data : [];
    items.forEach((l) => {
      const email = String(l.email ?? '').toLowerCase().trim();
      const id    = String(l.id ?? l.lead_id ?? l._id ?? '');
      if (email) leads.push({ id, email });
    });
    if (items.length < 100) break;
    skip += 100;
  }
  console.log(`[bounced] fetched ${leads.length} bounced leads`);
  return leads;
}

// ── Mark lead as unsubscribed in Instantly (list_status 4 = Do Not Contact)
// This is the correct v2 approach — DELETE returns 400 because Instantly
// requires you to UPDATE the status rather than hard-delete leads.
async function markUnsubscribed(campaign_id: string, leads: Lead[]): Promise<number> {
  let done = 0;

  // Strategy A: PATCH /lead/{id} — update list_status to 4 (opted out)
  for (const lead of leads) {
    if (!lead.id) continue;
    const r = await fetch(`${BASE}/lead/${lead.id}`, {
      method: 'PATCH', headers: hdrs(),
      body: JSON.stringify({ list_status: 4 }),
    });
    if (r.ok) { done++; continue; }
    console.log(`[bounced] PATCH ${r.status} id=${lead.id}`);

    // Strategy B: DELETE /lead/{id} with campaign_id in body
    // (400 was because we sent no body previously)
    const r2 = await fetch(`${BASE}/lead/${lead.id}`, {
      method: 'DELETE', headers: hdrs(),
      body: JSON.stringify({ campaign_id }),
    });
    if (r2.ok) { done++; continue; }
    console.log(`[bounced] DELETE+body ${r2.status} id=${lead.id}`);

    // Strategy C: POST /leads/update with email + status
    const r3 = await fetch(`${BASE}/leads/update`, {
      method: 'POST', headers: hdrs(),
      body: JSON.stringify({ campaign_id, email: lead.email, list_status: 4 }),
    });
    if (r3.ok) { done++; }
    else console.log(`[bounced] update ${r3.status} email=${lead.email}`);
  }

  console.log(`[bounced] marked ${done}/${leads.length} in Instantly`);
  return done;
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

    if (bouncedLeads.length === 0) {
      return NextResponse.json({ success: true, bounced_emails_found: 0, deleted_from_instantly: 0, deleted_from_supabase: 0, message: 'No bounced leads found' });
    }

    // Step 2: Mark as unsubscribed in Instantly
    const markedInstantly = await markUnsubscribed(campaign_id, bouncedLeads);

    // Step 3: Delete from all Supabase tables
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
      deleted_from_instantly: markedInstantly,
      deleted_from_supabase: deletedSupabase,
      message: `${bouncedLeads.length} bounced contacts processed · Instantly: ${markedInstantly} marked · Supabase: ${deletedSupabase} deleted`,
    });

  } catch (error) {
    console.error('[bounced] fatal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
