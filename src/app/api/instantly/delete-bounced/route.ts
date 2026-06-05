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

// ── Fetch bounced leads (this works with read-only key) ────────────────────
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
      : Array.isArray(raw?.data) ? raw.data : [];
    items.forEach((l) => {
      const email = String(l.email ?? '').toLowerCase().trim();
      const id    = String(l.id ?? l.lead_id ?? l._id ?? '');
      if (email) leads.push({ id, email });
    });
    if (items.length < 100) break;
    skip += 100;
  }
  return leads;
}

// ── Mark bounced leads as unsubscribed in Instantly ───────────────────────
// REQUIRES write-enabled API key. Returns { done, needsWriteKey }
async function markUnsubscribedInstantly(leads: Lead[]): Promise<{ done: number; needsWriteKey: boolean }> {
  if (leads.length === 0) return { done: 0, needsWriteKey: false };

  // Test with first lead — if 401, API key is read-only
  const test = await fetch(`${BASE}/lead/${leads[0].id}`, {
    method: 'PATCH', headers: hdrs(),
    body: JSON.stringify({ list_status: 4 }),
  });

  if (test.status === 401) {
    console.log('[bounced] API key is read-only — cannot modify leads in Instantly');
    return { done: 0, needsWriteKey: true };
  }

  let done = test.ok ? 1 : 0;

  // Process remaining leads
  for (const lead of leads.slice(1)) {
    const r = await fetch(`${BASE}/lead/${lead.id}`, {
      method: 'PATCH', headers: hdrs(),
      body: JSON.stringify({ list_status: 4 }),
    });
    if (r.ok) done++;
    else console.log(`[bounced] PATCH ${r.status} id=${lead.id}`);
  }

  return { done, needsWriteKey: false };
}

// ── POST /api/instantly/delete-bounced ────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { campaign_id } = await req.json();
    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

    // Step 1: Get bounced leads (works with read-only key)
    const bouncedLeads = await getBounced(campaign_id);
    const emails = bouncedLeads.map((l) => l.email);
    console.log(`[bounced] found ${bouncedLeads.length} bounced leads`);

    if (bouncedLeads.length === 0) {
      return NextResponse.json({ success: true, bounced_emails_found: 0, deleted_from_instantly: 0, deleted_from_supabase: 0, message: 'No bounced leads found' });
    }

    // Step 2: Try to mark as unsubscribed in Instantly (needs write key)
    const { done: markedInstantly, needsWriteKey } = await markUnsubscribedInstantly(bouncedLeads);

    // Step 3: Delete from Supabase (works independently of Instantly key)
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

    const instantlyMsg = needsWriteKey
      ? `⚠️ Instantly: API key needs write permission (update INSTANTLY_API_KEY in Vercel)`
      : `Instantly: ${markedInstantly} marked as Do Not Contact`;

    return NextResponse.json({
      success: true,
      bounced_emails_found: bouncedLeads.length,
      deleted_from_instantly: markedInstantly,
      deleted_from_supabase: deletedSupabase,
      needs_write_key: needsWriteKey,
      message: `${bouncedLeads.length} bounced found · ${instantlyMsg} · Supabase: ${deletedSupabase} deleted`,
    });

  } catch (error) {
    console.error('[bounced] fatal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
