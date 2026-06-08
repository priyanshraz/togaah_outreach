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

interface LeadItem { email?: string; [k: string]: unknown; }

// Fetch all bounced leads (paginated) — returns { count, emails }
async function fetchBounced(campaign_id: string): Promise<{ count: number; emails: string[] }> {
  const emails: string[] = [];
  let starting_after: string | undefined;

  while (true) {
    const body: Record<string, unknown> = { campaign_id, status: -1, limit: 100 };
    if (starting_after) body.starting_after = starting_after;

    const res = await fetch(`${BASE}/leads/list`, {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`[delete-bounced] list ${res.status}:`, await res.text().catch(() => ''));
      break;
    }

    const data = await res.json();
    const items: LeadItem[] = data?.items ?? [];
    items.forEach((l) => {
      if (l?.email) emails.push(l.email.toLowerCase().trim());
    });

    if (data?.next_starting_after) {
      starting_after = data.next_starting_after;
    } else {
      break;
    }
  }

  return { count: emails.length, emails };
}

// ── GET ?campaign_id=xxx — fetch bounced count for confirmation dialog
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const campaign_id = req.nextUrl.searchParams.get('campaign_id');
    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

    const { count } = await fetchBounced(campaign_id);
    return NextResponse.json({ success: true, bounced_count: count });

  } catch (error) {
    console.error('[delete-bounced] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST { campaign_id }
// 1. Fetch bounced emails from Instantly (for Supabase deletion)
// 2. Delete all bounced from Instantly in one call: DELETE /leads { campaign_id, status: -1 }
// 3. Delete matching emails from all Supabase tables
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { campaign_id } = await req.json();
    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

    // Step 1 — get bounced email list (needed for Supabase)
    const { count: bounced_count, emails } = await fetchBounced(campaign_id);
    console.log(`[delete-bounced] found ${bounced_count} bounced emails`);

    // Step 2 — delete all bounced from Instantly in one call
    let instantly_deleted = 0;
    const instRes = await fetch(`${BASE}/leads`, {
      method: 'DELETE',
      headers: hdrs(),
      body: JSON.stringify({ campaign_id, status: -1 }),
    });
    const instData = await instRes.json().catch(() => ({}));
    if (!instRes.ok) {
      console.error('[delete-bounced] Instantly DELETE error:', instRes.status, instData);
    } else {
      instantly_deleted = instData?.deleted_count ?? bounced_count;
      console.log(`[delete-bounced] Instantly deleted: ${instantly_deleted}`);
    }

    // Step 3 — delete same emails from all Supabase tables
    let supabase_deleted = 0;
    if (emails.length > 0) {
      for (const table of TABLES) {
        try {
          const n = await prisma.$executeRawUnsafe(
            `DELETE FROM public."${table}" WHERE LOWER(TRIM(CAST(email AS TEXT))) = ANY($1::text[])`,
            emails
          );
          if (n > 0) {
            console.log(`[delete-bounced] ${table}: ${n} deleted`);
            supabase_deleted += n;
          }
        } catch (e) {
          console.error(`[delete-bounced] ${table}:`, String(e).slice(0, 150));
        }
      }
      console.log(`[delete-bounced] Supabase total deleted: ${supabase_deleted}`);
    }

    return NextResponse.json({
      success: true,
      deleted_count: instantly_deleted,
      supabase_deleted,
      message: `${instantly_deleted} bounced leads deleted from Instantly · ${supabase_deleted} removed from Supabase`,
    });

  } catch (error) {
    console.error('[delete-bounced] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
