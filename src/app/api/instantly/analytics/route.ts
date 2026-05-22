export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v2';

async function instantlyFetch(endpoint: string) {
  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) throw new Error('INSTANTLY_API_KEY not configured');

  const res = await fetch(`${INSTANTLY_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Single call — returns ALL campaigns with analytics
    const raw = await instantlyFetch('/campaigns/analytics');

    // Handle both direct array and wrapped response
    const data = Array.isArray(raw) ? raw
      : Array.isArray(raw?.items) ? raw.items
      : Array.isArray(raw?.data)  ? raw.data
      : [];

    // Normalize fields — Instantly may return name or campaign_name
    const campaigns: {
      campaign_name: string;
      campaign_id: string;
      campaign_status: number;
      leads_count: number;
      contacted_count: number;
      emails_sent_count: number;
      new_leads_contacted_count: number;
      open_count: number;
      open_count_unique: number;
      reply_count: number;
      reply_count_unique: number;
      link_click_count: number;
      bounced_count: number;
      unsubscribed_count: number;
      completed_count: number;
      total_opportunities: number;
      total_opportunity_value: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }[] = data.map((c: any) => ({
      campaign_name:             c.campaign_name || c.name || 'Unnamed Campaign',
      campaign_id:               c.campaign_id   || c.id   || '',
      campaign_status:           Number(c.campaign_status ?? c.status ?? 0),
      leads_count:               c.leads_count              ?? 0,
      contacted_count:           c.contacted_count          ?? 0,
      emails_sent_count:         c.emails_sent_count        ?? 0,
      new_leads_contacted_count: c.new_leads_contacted_count ?? 0,
      open_count:                c.open_count               ?? 0,
      open_count_unique:         c.open_count_unique        ?? 0,
      reply_count:               c.reply_count              ?? 0,
      reply_count_unique:        c.reply_count_unique       ?? 0,
      link_click_count:          c.link_click_count         ?? 0,
      bounced_count:             c.bounced_count            ?? 0,
      unsubscribed_count:        c.unsubscribed_count       ?? 0,
      completed_count:           c.completed_count          ?? 0,
      total_opportunities:       c.total_opportunities      ?? 0,
      total_opportunity_value:   c.total_opportunity_value  ?? 0,
    }));

    // Calculate totals across all campaigns
    const totals = campaigns.reduce(
      (acc, c) => ({
        total_leads:         acc.total_leads + (c.leads_count ?? 0),
        total_contacted:     acc.total_contacted + (c.contacted_count ?? 0),
        total_sent:          acc.total_sent + (c.emails_sent_count ?? 0),
        total_opened:        acc.total_opened + (c.open_count ?? 0),
        total_replied:       acc.total_replied + (c.reply_count ?? 0),
        total_bounced:       acc.total_bounced + (c.bounced_count ?? 0),
        total_unsubscribed:  acc.total_unsubscribed + (c.unsubscribed_count ?? 0),
        total_completed:     acc.total_completed + (c.completed_count ?? 0),
        total_opportunities: acc.total_opportunities + (c.total_opportunities ?? 0),
      }),
      {
        total_leads: 0,
        total_contacted: 0,
        total_sent: 0,
        total_opened: 0,
        total_replied: 0,
        total_bounced: 0,
        total_unsubscribed: 0,
        total_completed: 0,
        total_opportunities: 0,
      }
    );

    return NextResponse.json({ success: true, totals, campaigns });

  } catch (error) {
    console.error('Instantly analytics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
