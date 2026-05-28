export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const TABLES = ['table1', 'table2', 'table3', 'table4', 'table5', 'table6'];

async function getCount(table: string): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return 0;

  try {
    const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'count=exact',
      },
    });
    // Count is in Content-Range: 0-0/1022
    const range = res.headers.get('content-range');
    const match = range?.match(/\/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  } catch {
    return 0;
  }
}

export async function GET() {
  const entries = await Promise.all(
    TABLES.map(async (t) => [t, await getCount(t)] as [string, number])
  );
  return NextResponse.json({ counts: Object.fromEntries(entries) });
}
