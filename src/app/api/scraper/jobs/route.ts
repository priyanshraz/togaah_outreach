export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobs = await prisma.scraperJob.findMany({
      where: { execution: { userId: user.id } },
      include: {
        execution: {
          select: { status: true, createdAt: true, duration: true, outputData: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Scraper jobs GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
