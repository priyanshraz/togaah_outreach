export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';

const VALID_TABLES = [
  'table1',
  'table2',
  'table3',
  'table4',
  'table5',
  'table6',
];

const DISPLAY_NAMES: Record<string, string> = {
  table1: 'table1',
  table2: 'table2',
  table3: 'table3',
  table4: 'table4',
  table5: 'table5',
  table6: 'table6',
};

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
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
          user_id: user.id,
          user_email: user.email,
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
