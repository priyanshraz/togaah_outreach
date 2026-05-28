export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const TABLES = ['table1', 'table2', 'table3', 'table4', 'table5', 'table6'];

async function getCount(table: string): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('[counts] Missing SUPABASE env vars');
    return 0;
  }

  try {
    // Use Range: 0-0 + Prefer: count=exact — PostgREST returns total in Content-Range header
    const res = await fetch(`${url}/rest/v1/${table}?select=id`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'count=exact',
        Range: '0-0',
      },
    });

    const range = res.headers.get('content-range'); // e.g. "0-0/1022"
    console.log(`[counts] ${table} → HTTP ${res.status}, content-range: ${range}`);

    if (!res.ok && res.status !== 206) {
      const body = await res.text().catch(() => '');
      console.error(`[counts] ${table} error body:`, body);
      return 0;
    }

    const match = range?.match(/\/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  } catch (err) {
    console.error(`[counts] ${table} fetch error:`, err);
    return 0;
  }
}

export async function GET() {
  const entries = await Promise.all(
    TABLES.map(async (t) => [t, await getCount(t)] as [string, number])
  );
  const counts = Object.fromEntries(entries);
  console.log('[counts] result:', counts);
  return NextResponse.json({ counts });
}
