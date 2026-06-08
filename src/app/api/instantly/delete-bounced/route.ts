export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';

const BASE = 'https://api.instantly.ai/api/v2';

function hdrs() {
  return {
    Authorization: `Bearer ${process.env.INSTANTLY_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

// GET bounced lead count for a campaign (paginated)
// POST /api/v2/leads/list  { campaign_id, status: -1, limit: 100 }
async function getBouncedCount(campaign_id: string): Promise<number> {
  let count = 0;
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
      const err = await res.text().catch(() => '');
      console.error(`[delete-bounced] list ${res.status}:`, err.slice(0, 200));
      break;
    }

    const data = await res.json();
    const items: unknown[] = data?.items ?? [];
    count += items.length;

    if (data?.next_starting_after) {
      starting_after = data.next_starting_after;
    } else {
      break;
    }
  }

  return count;
}

// ── GET /api/instantly/delete-bounced?campaign_id=xxx
// Returns the bounced lead count for confirmation dialog
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const campaign_id = req.nextUrl.searchParams.get('campaign_id');
    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

    const count = await getBouncedCount(campaign_id);
    return NextResponse.json({ success: true, bounced_count: count });

  } catch (error) {
    console.error('[delete-bounced] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST /api/instantly/delete-bounced
// Body: { campaign_id }
// Deletes ALL bounced leads (status -1) from the campaign in one API call
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { campaign_id } = await req.json();
    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });

    // DELETE /api/v2/leads — deletes ALL leads with status -1 in one call
    const res = await fetch(`${BASE}/leads`, {
      method: 'DELETE',
      headers: hdrs(),
      body: JSON.stringify({ campaign_id, status: -1 }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[delete-bounced] DELETE error:', res.status, JSON.stringify(data));
      return NextResponse.json(
        { error: data?.error ?? `Instantly API error ${res.status}` },
        { status: res.status >= 500 ? 502 : 400 }
      );
    }

    const deleted_count = data?.deleted_count ?? 0;
    console.log(`[delete-bounced] campaign=${campaign_id} deleted=${deleted_count}`);

    return NextResponse.json({
      success: true,
      deleted_count,
      message: `${deleted_count} bounced leads deleted successfully`,
    });

  } catch (error) {
    console.error('[delete-bounced] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
