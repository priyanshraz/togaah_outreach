export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { prisma } from '@/lib/prisma';

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v2';
const TABLES = ['table1', 'table2', 'table3', 'table4', 'table5', 'table6'];

function headers() {
  return {
    Authorization: `Bearer ${process.env.INSTANTLY_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

// Fetch bounced lead emails for a campaign.
// Tries multiple Instantly v2 endpoint patterns until one succeeds.
async function fetchBouncedEmails(campaign_id: string): Promise<string[]> {
  const emails: string[] = [];

  // ── Attempt 1: POST /api/v2/leads/list with filter ────────────────────────
  try {
    let skip = 0;
    const limit = 100;
    while (true) {
      const res = await fetch(`${INSTANTLY_BASE}/leads/list`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          campaign_id,
          filter_list_status: [3], // 3 = Bounced in Instantly
          limit,
          skip,
        }),
      });
      if (!res.ok) break;
      const data = await res.json();
      const items: { email: string }[] = Array.isArray(data) ? data
        : Array.isArray(data?.items) ? data.items
        : Array.isArray(data?.data)  ? data.data
        : [];
      items.forEach((l) => { if (l.email) emails.push(l.email.toLowerCase().trim()); });
      if (items.length < limit) break;
      skip += limit;
    }
    if (emails.length > 0) return emails;
  } catch { /* try next */ }

  // ── Attempt 2: GET /api/v2/lead with list_status ──────────────────────────
  try {
    let skip = 0;
    const limit = 100;
    while (true) {
      const res = await fetch(
        `${INSTANTLY_BASE}/lead?campaign_id=${campaign_id}&list_status=3&limit=${limit}&skip=${skip}`,
        { headers: headers() }
      );
      if (!res.ok) break;
      const data = await res.json();
      const items: { email: string }[] = Array.isArray(data) ? data
        : Array.isArray(data?.items) ? data.items
        : Array.isArray(data?.data)  ? data.data
        : [];
      items.forEach((l) => { if (l.email) emails.push(l.email.toLowerCase().trim()); });
      if (items.length < limit) break;
      skip += limit;
    }
    if (emails.length > 0) return emails;
  } catch { /* try next */ }

  // ── Attempt 3: GET /api/v2/leads with filter_list_status ─────────────────
  try {
    let skip = 0;
    const limit = 100;
    while (true) {
      const res = await fetch(
        `${INSTANTLY_BASE}/leads?campaign_id=${campaign_id}&filter_list_status=3&limit=${limit}&skip=${skip}`,
        { headers: headers() }
      );
      if (!res.ok) { console.log('Attempt 3 status:', res.status, await res.text().catch(() => '')); break; }
      const data = await res.json();
      const items: { email: string }[] = Array.isArray(data) ? data
        : Array.isArray(data?.items) ? data.items
        : Array.isArray(data?.data)  ? data.data
        : [];
      items.forEach((l) => { if (l.email) emails.push(l.email.toLowerCase().trim()); });
      if (items.length < limit) break;
      skip += limit;
    }
  } catch { /* nothing */ }

  return emails;
}

// POST /api/instantly/delete-bounced
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { campaign_id } = await req.json();
    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

    // ── Step 1: Get bounced emails ────────────────────────────────────────
    const bouncedEmails = await fetchBouncedEmails(campaign_id);
    console.log(`[delete-bounced] campaign=${campaign_id} found ${bouncedEmails.length} bounced`);

    if (bouncedEmails.length === 0) {
      return NextResponse.json({
        success: true,
        bounced_emails_found: 0,
        deleted_from_instantly: 0,
        deleted_from_supabase: 0,
        message: 'No bounced leads found via Instantly API',
      });
    }

    // ── Step 2: Delete from Instantly.ai ─────────────────────────────────
    // Instantly v2: DELETE /api/v2/lead with { campaign_id, email }
    let deletedInstantly = 0;
    const deleteErrors: string[] = [];
    for (const email of bouncedEmails) {
      try {
        const r = await fetch(`${INSTANTLY_BASE}/lead`, {
          method: 'DELETE',
          headers: headers(),
          body: JSON.stringify({ campaign_id, email }),
        });
        if (r.ok) {
          deletedInstantly++;
        } else {
          const txt = await r.text().catch(() => '');
          deleteErrors.push(`${email}: ${r.status} ${txt.slice(0, 80)}`);
        }
      } catch (e) {
        console.error(`[delete-bounced] delete ${email}:`, e);
      }
    }
    if (deleteErrors.length > 0) {
      console.log('[delete-bounced] delete errors (first 3):', deleteErrors.slice(0, 3));
    }
    console.log(`[delete-bounced] Deleted ${deletedInstantly}/${bouncedEmails.length} from Instantly`);

    // ── Step 3: Delete from all Supabase tables ───────────────────────────
    let deletedSupabase = 0;
    for (const table of TABLES) {
      try {
        const count = await prisma.$executeRawUnsafe(
          `DELETE FROM public."${table}" WHERE LOWER(TRIM(email)) = ANY($1::text[])`,
          bouncedEmails
        );
        deletedSupabase += count;
        if (count > 0) console.log(`[delete-bounced] Deleted ${count} from ${table}`);
      } catch (e) {
        console.error(`[delete-bounced] ${table} error:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      bounced_emails_found: bouncedEmails.length,
      deleted_from_instantly: deletedInstantly,
      deleted_from_supabase: deletedSupabase,
      message: `Deleted ${bouncedEmails.length} bounced contacts`,
    });

  } catch (error) {
    console.error('[delete-bounced] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
