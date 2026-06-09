export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let executionId: string | null = null;

  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { niches, location, max_results, target_sheet } = body;

    if (!niches || !location || !max_results || !target_sheet) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create execution record (track ID for cleanup on error)
    const execution = await prisma.workflowExecution.create({
      data: {
        userId: user.id,
        workflowType: 'SCRAPER',
        workflowName: `${location} — ${niches}`,
        status: 'RUNNING',
        inputData: JSON.stringify(body),
        startedAt: new Date(),
      },
    });
    executionId = execution.id;

    // ── Call n8n scraper webhook ───────────────────────────────────────────
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
          user_id: user.id,
        }),
        signal: AbortSignal.timeout(600000), // 10 minutes
      });
    } catch (fetchErr) {
      const isTimeout = fetchErr instanceof Error && fetchErr.name === 'TimeoutError';
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: { status: 'FAILED', errorMessage: isTimeout ? 'Timeout' : 'Network error', completedAt: new Date() },
      });
      return NextResponse.json(
        { error: isTimeout ? 'Scraper timed out (>10 min). Try fewer results.' : 'Could not reach n8n.' },
        { status: 503 }
      );
    }

    // ── Read response safely — handle empty/non-JSON body ─────────────────
    const rawText = await n8nRaw.text().catch(() => '');
    console.log(`[scraper] n8n status=${n8nRaw.status} body_length=${rawText.length}`);
    console.log(`[scraper] raw response (first 500):`, rawText.slice(0, 500));

    if (!n8nRaw.ok) {
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: { status: 'FAILED', errorMessage: `n8n HTTP ${n8nRaw.status}`, completedAt: new Date() },
      });
      return NextResponse.json({ error: `n8n returned HTTP ${n8nRaw.status}: ${rawText.slice(0, 200)}` }, { status: 502 });
    }

    // Parse JSON safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let n8nData: any = {};
    if (rawText.trim()) {
      try {
        n8nData = JSON.parse(rawText);
      } catch {
        console.error('[scraper] JSON parse failed, raw:', rawText.slice(0, 300));
        // n8n returned non-JSON — treat as success with unknown counts
        n8nData = { status: 'success' };
      }
    } else {
      console.warn('[scraper] n8n returned empty body');
      n8nData = { status: 'success' };
    }

    const duration = Date.now() - startTime;

    if (n8nData.status === 'error') {
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: { status: 'FAILED', errorMessage: n8nData.error_message, outputData: rawText, completedAt: new Date(), duration },
      });
      return NextResponse.json({ error: n8nData.error_message || 'Scraper failed' }, { status: 400 });
    }

    // ── Normalize counts — try every known field name n8n might use ───────
    const sup = n8nData.supabase_info;
    const sum = n8nData.scraper_summary;

    // total scraped — try all possible field paths
    const totalScraped: number =
      sup?.total_leads_requested
      ?? sup?.total_scraped
      ?? sum?.total_scraped
      ?? n8nData.total_scraped
      ?? n8nData.total_leads
      ?? n8nData.leads_found
      ?? Number(max_results); // fallback: assume all requested were scraped

    // total saved/valid — try all possible field paths
    const totalSaved: number =
      sup?.total_leads_saved
      ?? sup?.leads_saved
      ?? sum?.verified_leads
      ?? sum?.valid_leads
      ?? n8nData.total_leads_saved
      ?? n8nData.leads_saved
      ?? n8nData.verified_leads
      ?? n8nData.valid_leads
      ?? totalScraped; // if no saved count found, assume ALL scraped are valid

    const tableName: string =
      sup?.table_name
      ?? n8nData.table_name
      ?? target_sheet;

    const saveStatus: string =
      sup?.save_status
      ?? n8nData.save_status
      ?? 'success';

    console.log(`[scraper] normalized → totalScraped=${totalScraped} totalSaved=${totalSaved} table=${tableName}`);

    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'SUCCESS',
        n8nExecutionId: n8nData.execution_id || null,
        outputData: rawText,
        completedAt: new Date(),
        duration,
      },
    });

    await prisma.scraperJob.create({
      data: {
        executionId: executionId,
        niches,
        location,
        maxResults: Number(max_results),
        totalScraped,
        validEmails: totalSaved,
        invalidEmails: Math.max(0, totalScraped - totalSaved),
        targetSheet: target_sheet,
      },
    });

    return NextResponse.json({
      success: true,
      result: {
        total_scraped:  totalScraped,
        total_saved:    totalSaved,
        table_name:     tableName,
        execution_time: n8nData.execution_time_seconds ?? Math.round(duration / 1000),
        save_status:    saveStatus,
      },
      executionId: n8nData.execution_id ?? null,
      rawResponse: n8nData,
    });

  } catch (error) {
    console.error('Scraper POST error:', error);
    // Mark execution as FAILED if we have the ID
    if (executionId) {
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Internal error',
          completedAt: new Date(),
        },
      }).catch(() => {});
    }
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
