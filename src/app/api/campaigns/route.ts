export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { prisma } from '@/lib/prisma';

interface N8nCampaignResponse {
  status: string;           // "pending_approval" | "error"
  execution_id: string;
  workflow_type: string;
  message: string;
  campaign_preview?: {
    campaign_name: string;
    service_type: string;
    subject_line: string;
    preview_text: string;
    body_preview: string;
    full_email_body: string;
  };
  sheet_info?: {
    sheet_url: string;
    sheet_tab: string;
    sheet_gid: string;
  };
  approval_required?: boolean;
  approval_endpoint?: string;
  error_message?: string;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Validate required fields
    const requiredFields = [
      'campaign_name', 'service_type', 'target_region',
      'campaign_goal', 'campaign_message', 'cta_button_text',
      'tone', 'selected_sheet',
    ];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Call n8n Workflow 1 — 130s timeout (n8n takes 50-120s for AI generation)
    let n8nRaw: Response;
    try {
      n8nRaw = await fetch(process.env.N8N_CAMPAIGN_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          user_id: user.id,
          user_email: user.email,
        }),
        signal: AbortSignal.timeout(130000),
      });
    } catch (fetchErr) {
      const isTimeout = fetchErr instanceof Error && fetchErr.name === 'TimeoutError';
      return NextResponse.json(
        { error: isTimeout ? 'n8n workflow timed out (>130s). Try again.' : 'Could not reach n8n webhook.' },
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

    const n8nData: N8nCampaignResponse = await n8nRaw.json();

    // n8n signals an internal workflow error
    if (n8nData.status === 'error') {
      return NextResponse.json(
        { error: n8nData.error_message || 'n8n workflow returned an error' },
        { status: 400 }
      );
    }

    const duration = Date.now() - startTime;

    // Log n8n response for debugging
    console.log('n8n response status:', n8nData.status);
    console.log('n8n execution_id:', n8nData.execution_id);
    console.log('n8n has preview:', !!n8nData.campaign_preview);

    // Persist execution record
    let execution;
    try {
      execution = await prisma.workflowExecution.create({
        data: {
          userId: user.id,
          workflowType: 'CAMPAIGN',
          workflowName: body.campaign_name,
          status: 'SUCCESS',
          n8nExecutionId: n8nData.execution_id || null,
          inputData: JSON.stringify(body),
          outputData: JSON.stringify(n8nData),
          startedAt: new Date(startTime),
          completedAt: new Date(),
          duration,
        },
      });
    } catch (dbErr) {
      console.error('DB error creating workflowExecution:', dbErr);
      return NextResponse.json(
        { error: 'Database error saving execution record', details: String(dbErr) },
        { status: 500 }
      );
    }

    // Persist campaign record with full AI preview + sheet info
    let campaign;
    try {
      campaign = await prisma.campaign.create({
        data: {
          executionId: execution.id,
          campaignName: body.campaign_name,
          serviceType: body.service_type,
          targetRegion: body.target_region,
          campaignGoal: body.campaign_goal,
          campaignMessage: body.campaign_message,
          selectedSheet: body.selected_sheet,
          aiGeneratedContent: n8nData.campaign_preview
            ? JSON.stringify(n8nData.campaign_preview)
            : null,
          status: 'PENDING_APPROVAL',
          createdBy: user.id,
        },
      });
    } catch (dbErr) {
      console.error('DB error creating campaign:', dbErr);
      return NextResponse.json(
        { error: 'Database error saving campaign record', details: String(dbErr) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        campaignName: campaign.campaignName,
        status: campaign.status,
        preview: n8nData.campaign_preview ?? null,
        sheetInfo: n8nData.sheet_info ?? null,
      },
      message: n8nData.message || 'Campaign created. Review and approve to send emails.',
    });

  } catch (error) {
    console.error('Campaign POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaigns = await prisma.campaign.findMany({
      where: { execution: { userId: user.id } },
      include: {
        execution: {
          select: { status: true, createdAt: true, duration: true, outputData: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const parsed = campaigns.map((c) => ({
      ...c,
      aiGeneratedContent: c.aiGeneratedContent ? JSON.parse(c.aiGeneratedContent) : null,
    }));

    return NextResponse.json({ campaigns: parsed });
  } catch (error) {
    console.error('Campaign GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
