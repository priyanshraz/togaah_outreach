export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { n8nClient } from '@/lib/n8n';
import { scraperSchema } from '@/lib/validations';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = scraperSchema.parse(body);

    const execution = await prisma.workflowExecution.create({
      data: {
        userId: session.user.id,
        workflowType: 'SCRAPER',
        workflowName: `${validatedData.location} - ${validatedData.niches}`,
        status: 'RUNNING',
        inputData: JSON.stringify(validatedData),
        startedAt: new Date(),
      },
    });

    const startTime = Date.now();
    const n8nResponse = await n8nClient.triggerScraper({
      niches: validatedData.niches,
      location: validatedData.location,
      max_results: validatedData.max_results,
      target_sheet: validatedData.target_sheet,
      user_id: session.user.id,
    });

    const results = n8nResponse.results as Record<string, unknown> | undefined;
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: n8nResponse.status === 'success' ? 'SUCCESS' : 'FAILED',
        n8nExecutionId: n8nResponse.execution_id !== 'error' ? n8nResponse.execution_id : null,
        outputData: JSON.stringify(n8nResponse),
        errorMessage: n8nResponse.error_message,
        completedAt: new Date(),
        duration: Date.now() - startTime,
      },
    });

    await prisma.scraperJob.create({
      data: {
        executionId: execution.id,
        niches: validatedData.niches,
        location: validatedData.location,
        maxResults: validatedData.max_results,
        totalScraped: Number(results?.total_scraped ?? 0),
        validEmails: Number(results?.valid_emails ?? 0),
        invalidEmails: Number(results?.invalid_emails ?? 0),
        targetSheet: validatedData.target_sheet,
        apifyRunId: results?.apify_run_id as string | undefined,
      },
    });

    return NextResponse.json({ success: true, n8nResponse });
  } catch (error) {
    console.error('Scraper POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
