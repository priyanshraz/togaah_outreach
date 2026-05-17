export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// n8n actual response format (from screenshot)
interface N8nScraperResponse {
  status: 'success' | 'error';
  execution_id?: string;
  timestamp?: string;
  execution_time_seconds?: number;
  // New format
  supabase_info?: {
    table_name: string;
    total_leads_requested: number;
    total_leads_saved: number;
    save_status: string;
  };
  // Old format (fallback)
  scraper_summary?: {
    niches: string;
    location: string;
    total_scraped: number;
    verified_leads: number;
    invalid_leads: number;
    unknown_leads: number;
    success_rate: string;
  };
  sheet_info?: {
    sheet_tab: string;
    sheet_url: string;
    leads_added: number;
  };
  error_type?: string;
  error_message?: string;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { niches, location, max_results, target_sheet } = body;

    if (!niches || !location || !max_results || !target_sheet) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        userId: session.user.id,
        workflowType: 'SCRAPER',
        workflowName: `${location} — ${niches}`,
        status: 'RUNNING',
        inputData: JSON.stringify(body),
        startedAt: new Date(),
      },
    });

    // Call n8n scraper webhook — 10 min timeout
    let n8nRaw: Response;
    try {
      n8nRaw = await fetch(process.env.N8N_SCRAPER_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niches,
          location,
          max_results: Number(max_results),
          target_sheet,
          user_id: session.user.id,
        }),
        signal: AbortSignal.timeout(600000), // 10 minutes
      });
    } catch (fetchErr) {
      const isTimeout = fetchErr instanceof Error && fetchErr.name === 'TimeoutError';
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: 'FAILED', errorMessage: isTimeout ? 'Timeout' : 'Network error', completedAt: new Date() },
      });
      return NextResponse.json(
        { error: isTimeout ? 'Scraper timed out (>10 min). Try fewer results.' : 'Could not reach n8n.' },
        { status: 503 }
      );
    }

    if (!n8nRaw.ok) {
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: 'FAILED', completedAt: new Date() },
      });
      return NextResponse.json({ error: `n8n returned HTTP ${n8nRaw.status}` }, { status: 502 });
    }

    const n8nData: N8nScraperResponse = await n8nRaw.json();
    const duration = Date.now() - startTime;

    if (n8nData.status === 'error') {
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: 'FAILED', errorMessage: n8nData.error_message, outputData: JSON.stringify(n8nData), completedAt: new Date(), duration },
      });
      return NextResponse.json({ error: n8nData.error_message || 'Scraper failed' }, { status: 400 });
    }

    // Normalize result — handle both new (supabase_info) and old (scraper_summary) formats
    const sup = n8nData.supabase_info;
    const sum = n8nData.scraper_summary;

    const totalScraped   = sup?.total_leads_requested ?? sum?.total_scraped ?? 0;
    const totalSaved     = sup?.total_leads_saved ?? sum?.verified_leads ?? 0;
    const tableName      = sup?.table_name ?? target_sheet;

    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'SUCCESS',
        n8nExecutionId: n8nData.execution_id || null,
        outputData: JSON.stringify(n8nData),
        completedAt: new Date(),
        duration,
      },
    });

    await prisma.scraperJob.create({
      data: {
        executionId: execution.id,
        niches,
        location,
        maxResults: Number(max_results),
        totalScraped,
        validEmails: totalSaved,
        invalidEmails: Math.max(0, totalScraped - totalSaved),
        targetSheet: target_sheet,
      },
    });

    // Return normalized result to frontend
    return NextResponse.json({
      success: true,
      result: {
        total_scraped:   totalScraped,
        total_saved:     totalSaved,
        table_name:      tableName,
        execution_time:  n8nData.execution_time_seconds ?? Math.round(duration / 1000),
        save_status:     sup?.save_status ?? 'success',
      },
      executionId: n8nData.execution_id,
      rawResponse: n8nData,
    });

  } catch (error) {
    console.error('Scraper POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
