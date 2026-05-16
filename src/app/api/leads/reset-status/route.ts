export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const VALID_TABLES = [
  'all_service_leads',
  'hair_transplant_leads',
  'dental_treatment_leads',
  'cosmic_surgery_leads',
  'eye_treatment_leads',
  'ivf_fertility_leads',
];

const DISPLAY_NAMES: Record<string, string> = {
  all_service_leads:       'All Services Leads',
  hair_transplant_leads:   'Hair Transplant Leads',
  dental_treatment_leads:  'Dental Treatment Leads',
  cosmic_surgery_leads:    'Cosmetic Surgery Leads',
  eye_treatment_leads:     'Eye Treatment Leads',
  ivf_fertility_leads:     'IVF Fertility Leads',
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { table_name } = body;

    if (!table_name) {
      return NextResponse.json({ error: 'table_name is required' }, { status: 400 });
    }

    if (!VALID_TABLES.includes(table_name)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    const webhookUrl = process.env.N8N_RESET_STATUS_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json({ error: 'N8N_RESET_STATUS_WEBHOOK_URL not configured' }, { status: 500 });
    }

    // Call n8n webhook
    let n8nRaw: Response;
    try {
      n8nRaw = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name,
          display_name: DISPLAY_NAMES[table_name],
          user_id: session.user.id,
          user_email: session.user.email,
        }),
        signal: AbortSignal.timeout(60000),
      });
    } catch (fetchErr) {
      const isTimeout = fetchErr instanceof Error && fetchErr.name === 'TimeoutError';
      return NextResponse.json(
        { error: isTimeout ? 'Request timed out. Try again.' : 'Could not reach n8n webhook.' },
        { status: 503 }
      );
    }

    if (!n8nRaw.ok) {
      const text = await n8nRaw.text().catch(() => '');
      return NextResponse.json(
        { error: `n8n returned HTTP ${n8nRaw.status}`, details: text },
        { status: 502 }
      );
    }

    const n8nData = await n8nRaw.json();

    if (n8nData.status === 'error') {
      return NextResponse.json(
        { error: n8nData.error_message || 'Reset failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      status: 'success',
      message: n8nData.message || `${DISPLAY_NAMES[table_name]} ka sent_status reset ho gaya`,
      table_name,
      display_name: DISPLAY_NAMES[table_name],
      rows_reset: n8nData.rows_reset ?? 0,
      timestamp: n8nData.timestamp || new Date().toISOString(),
    });

  } catch (error) {
    console.error('Reset status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
