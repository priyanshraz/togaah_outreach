export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v1';

async function instantlyFetch(endpoint: string) {
  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) throw new Error('INSTANTLY_API_KEY not configured');

  const res = await fetch(`${INSTANTLY_BASE}${endpoint}&api_key=${apiKey}`, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly API error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all campaigns
    const campaignsData = await instantlyFetch('/campaign/list?limit=100&skip=0');
    const campaigns = campaignsData?.campaigns ?? campaignsData ?? [];

    // Fetch analytics for each campaign
    const analyticsPromises = campaigns.map(async (campaign: { id: string; name: string; status: number }) => {
      try {
        const analytics = await instantlyFetch(
          `/analytics/campaign/summary?campaign_id=${campaign.id}&`
        );
        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          leads_count: analytics?.leads_count ?? 0,
          contacted_count: analytics?.contacted_count ?? 0,
          emails_sent_count: analytics?.emails_sent_count ?? 0,
          open_count: analytics?.open_count ?? 0,
          reply_count: analytics?.reply_count ?? 0,
          bounced_count: analytics?.bounced_count ?? 0,
          unsubscribed_count: analytics?.unsubscribed_count ?? 0,
          completed_count: analytics?.completed_count ?? 0,
          new_leads_contacted: analytics?.new_leads_contacted ?? 0,
          total_opportunities: analytics?.total_opportunities ?? 0,
        };
      } catch {
        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          leads_count: 0,
          contacted_count: 0,
          emails_sent_count: 0,
          open_count: 0,
          reply_count: 0,
          bounced_count: 0,
          unsubscribed_count: 0,
          completed_count: 0,
          new_leads_contacted: 0,
          total_opportunities: 0,
        };
      }
    });

    const campaignAnalytics = await Promise.all(analyticsPromises);

    // Calculate totals
    const totals = campaignAnalytics.reduce(
      (acc, c) => ({
        total_leads: acc.total_leads + c.leads_count,
        total_sent: acc.total_sent + c.emails_sent_count,
        total_opened: acc.total_opened + c.open_count,
        total_replied: acc.total_replied + c.reply_count,
        total_bounced: acc.total_bounced + c.bounced_count,
        total_unsubscribed: acc.total_unsubscribed + c.unsubscribed_count,
      }),
      {
        total_leads: 0,
        total_sent: 0,
        total_opened: 0,
        total_replied: 0,
        total_bounced: 0,
        total_unsubscribed: 0,
      }
    );

    return NextResponse.json({
      success: true,
      totals,
      campaigns: campaignAnalytics,
    });

  } catch (error) {
    console.error('Instantly analytics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Instantly analytics' },
      { status: 500 }
    );
  }
}
