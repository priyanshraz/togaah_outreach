export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { prisma } from '@/lib/prisma';

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v2';
const TABLES = ['table1', 'table2', 'table3', 'table4', 'table5', 'table6'];

async function instantlyFetch(endpoint: string, options?: RequestInit) {
  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) throw new Error('INSTANTLY_API_KEY not configured');
  const res = await fetch(`${INSTANTLY_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
  return res;
}

// POST /api/instantly/delete-bounced
// Body: { campaign_id: string }
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { campaign_id } = await req.json();
    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

    // ── Step 1: Fetch bounced leads from Instantly.ai ──────────────────────
    // Get all leads for this campaign filtered by bounced status
    const bouncedEmails: string[] = [];
    let skip = 0;
    const limit = 100;

    while (true) {
      const res = await instantlyFetch(
        `/leads?campaign_id=${campaign_id}&status=bounced&limit=${limit}&skip=${skip}`
      );

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('Instantly leads fetch error:', text);
        break;
      }

      const data = await res.json();
      // Response can be array or { items: [] } or { data: [] }
      const items: { email: string }[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.items) ? data.items
        : Array.isArray(data?.data)  ? data.data
        : [];

      items.forEach((l) => { if (l.email) bouncedEmails.push(l.email.toLowerCase().trim()); });

      if (items.length < limit) break;
      skip += limit;
    }

    if (bouncedEmails.length === 0) {
      return NextResponse.json({ success: true, deleted_from_instantly: 0, deleted_from_supabase: 0, message: 'No bounced leads found' });
    }

    // ── Step 2: Delete from Instantly.ai ──────────────────────────────────
    let deletedInstantly = 0;
    try {
      const delRes = await instantlyFetch(`/leads/delete`, {
        method: 'POST',
        body: JSON.stringify({ campaign_id, emails: bouncedEmails }),
      });
      if (delRes.ok) deletedInstantly = bouncedEmails.length;
      else console.error('Instantly delete error:', await delRes.text());
    } catch (e) {
      console.error('Instantly delete exception:', e);
    }

    // ── Step 3: Delete from Supabase tables ───────────────────────────────
    let deletedSupabase = 0;
    for (const table of TABLES) {
      try {
        const result = await prisma.$executeRawUnsafe(
          `DELETE FROM public."${table}" WHERE LOWER(email) = ANY($1::text[])`,
          bouncedEmails
        );
        deletedSupabase += result;
      } catch (e) {
        console.error(`Delete from ${table} error:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      bounced_emails_found: bouncedEmails.length,
      deleted_from_instantly: deletedInstantly,
      deleted_from_supabase: deletedSupabase,
      message: `Deleted ${bouncedEmails.length} bounced contacts from Instantly.ai and ${deletedSupabase} from Supabase`,
    });

  } catch (error) {
    console.error('delete-bounced error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
