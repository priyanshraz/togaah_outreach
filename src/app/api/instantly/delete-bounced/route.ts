export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { prisma } from '@/lib/prisma';

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v2';
const TABLES = ['table1', 'table2', 'table3', 'table4', 'table5', 'table6'];

function hdrs() {
  return {
    Authorization: `Bearer ${process.env.INSTANTLY_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

interface InstantlyLead {
  id: string;
  email: string;
  [key: string]: unknown;
}

// Fetch bounced leads (email + id) via POST /leads/list
async function fetchBouncedLeads(campaign_id: string): Promise<InstantlyLead[]> {
  const leads: InstantlyLead[] = [];
  let skip = 0;
  const limit = 100;

  while (true) {
    const res = await fetch(`${INSTANTLY_BASE}/leads/list`, {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({
        campaign_id,
        filter_list_status: [3], // 3 = Bounced
        limit,
        skip,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error(`[delete-bounced] leads/list ${res.status}:`, err.slice(0, 200));
      break;
    }

    const data = await res.json();
    console.log('[delete-bounced] leads/list sample:', JSON.stringify(data).slice(0, 300));

    const items: InstantlyLead[] = Array.isArray(data) ? data
      : Array.isArray(data?.items) ? data.items
      : Array.isArray(data?.data)  ? data.data
      : [];

    items.forEach((l) => {
      if (l.email) leads.push({ ...l, id: l.id ?? '', email: l.email.toLowerCase().trim() });
    });

    if (items.length < limit) break;
    skip += limit;
  }

  return leads;
}

// POST /api/instantly/delete-bounced
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { campaign_id } = await req.json();
    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

    // ── Step 1: Fetch bounced leads ───────────────────────────────────────
    const bouncedLeads = await fetchBouncedLeads(campaign_id);
    const bouncedEmails = bouncedLeads.map((l) => l.email);
    console.log(`[delete-bounced] Found ${bouncedLeads.length} bounced leads`);

    if (bouncedLeads.length === 0) {
      return NextResponse.json({
        success: true,
        bounced_emails_found: 0,
        deleted_from_instantly: 0,
        deleted_from_supabase: 0,
        message: 'No bounced leads found',
      });
    }

    // ── Step 2: Delete from Instantly.ai using lead ID ────────────────────
    // Correct Instantly v2 endpoint: DELETE /api/v2/lead/{id}
    let deletedInstantly = 0;
    for (const lead of bouncedLeads) {
      if (!lead.id) continue;
      try {
        const r = await fetch(`${INSTANTLY_BASE}/lead/${lead.id}`, {
          method: 'DELETE',
          headers: hdrs(),
        });
        if (r.ok) {
          deletedInstantly++;
        } else {
          const txt = await r.text().catch(() => '');
          console.log(`[delete-bounced] DELETE /lead/${lead.id} → ${r.status}: ${txt.slice(0, 100)}`);
        }
      } catch (e) {
        console.error(`[delete-bounced] delete ${lead.id}:`, e);
      }
    }
    console.log(`[delete-bounced] Deleted ${deletedInstantly}/${bouncedLeads.length} from Instantly`);

    // ── Step 3: Delete from all Supabase tables ───────────────────────────
    let deletedSupabase = 0;
    if (bouncedEmails.length > 0) {
      for (const table of TABLES) {
        try {
          // Try both lowercase and case-insensitive match
          const count = await prisma.$executeRawUnsafe(
            `DELETE FROM public."${table}" WHERE LOWER(TRIM(CAST(email AS TEXT))) = ANY($1::text[])`,
            bouncedEmails
          );
          if (count > 0) {
            console.log(`[delete-bounced] Deleted ${count} from ${table}`);
            deletedSupabase += count;
          }
        } catch (e) {
          console.error(`[delete-bounced] ${table} error:`, String(e).slice(0, 200));
        }
      }
    }
    console.log(`[delete-bounced] Total deleted from Supabase: ${deletedSupabase}`);

    return NextResponse.json({
      success: true,
      bounced_emails_found: bouncedLeads.length,
      deleted_from_instantly: deletedInstantly,
      deleted_from_supabase: deletedSupabase,
      message: `Found ${bouncedLeads.length} bounced · Instantly: ${deletedInstantly} deleted · Supabase: ${deletedSupabase} deleted`,
    });

  } catch (error) {
    console.error('[delete-bounced] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
