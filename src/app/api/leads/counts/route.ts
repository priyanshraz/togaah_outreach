export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TABLES = ['table1', 'table2', 'table3', 'table4', 'table5', 'table6'];

async function getCount(table: string): Promise<number> {
  try {
    // Use raw SQL via Prisma direct connection — bypasses Supabase RLS
    const result = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) AS count FROM public."${table}"`
    );
    return Number(result[0]?.count ?? 0);
  } catch (err) {
    console.error(`[counts] ${table}:`, err);
    return 0;
  }
}

export async function GET() {
  const entries = await Promise.all(
    TABLES.map(async (t) => [t, await getCount(t)] as [string, number])
  );
  return NextResponse.json({ counts: Object.fromEntries(entries) });
}
