export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { prisma } from '@/lib/prisma';

const TABLES = ['table1', 'table2', 'table3', 'table4', 'table5', 'table6'];

// Deletes rows from all lead tables where the email is invalid.
// Targets rows where:
//   - email column is NULL / empty / whitespace
//   - OR valid_email = false
//   - OR email_valid = false
//   - OR email_status = 'invalid'
export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const results: Record<string, number> = {};
    let totalDeleted = 0;

    for (const table of TABLES) {
      let deleted = 0;

      // Attempt 1: delete rows where email is null/empty
      try {
        const n1 = await prisma.$executeRawUnsafe(
          `DELETE FROM public."${table}" WHERE email IS NULL OR TRIM(CAST(email AS TEXT)) = ''`
        );
        deleted += n1;
      } catch { /* column may not exist */ }

      // Attempt 2: delete rows where valid_email = false (boolean column)
      try {
        const n2 = await prisma.$executeRawUnsafe(
          `DELETE FROM public."${table}" WHERE valid_email = false`
        );
        deleted += n2;
      } catch { /* column doesn't exist in this table */ }

      // Attempt 3: delete rows where email_valid = false
      try {
        const n3 = await prisma.$executeRawUnsafe(
          `DELETE FROM public."${table}" WHERE email_valid = false`
        );
        deleted += n3;
      } catch { /* column doesn't exist */ }

      // Attempt 4: delete rows where email_status = 'invalid'
      try {
        const n4 = await prisma.$executeRawUnsafe(
          `DELETE FROM public."${table}" WHERE LOWER(TRIM(CAST(email_status AS TEXT))) = 'invalid'`
        );
        deleted += n4;
      } catch { /* column doesn't exist */ }

      if (deleted > 0) {
        console.log(`[delete-invalid] ${table}: ${deleted} deleted`);
        results[table] = deleted;
      }
      totalDeleted += deleted;
    }

    return NextResponse.json({
      success: true,
      total_deleted: totalDeleted,
      by_table: results,
      message: `Deleted ${totalDeleted} invalid email leads across all tables`,
    });

  } catch (error) {
    console.error('[delete-invalid] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
