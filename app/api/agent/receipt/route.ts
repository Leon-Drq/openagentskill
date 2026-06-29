import { NextRequest, NextResponse } from 'next/server'
import { resolveAgentSkill, type AgentResolveInput } from '@/lib/agent-resolve'
import { formatAgentInstallReceiptText } from '@/lib/agent-install-receipt'

export const revalidate = 300

const RECEIPT_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
  'X-Agent-Friendly': 'true',
}

function parseLimit(value: string | null) {
  const parsed = Number(value || 5)
  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : 5, 1), 10)
}

function receiptResponse(payload: Awaited<ReturnType<typeof resolveAgentSkill>>, format?: string | null) {
  if (!payload.install_receipt) {
    return NextResponse.json(
      {
        error: 'No install receipt generated',
        task: payload.task,
        policy_decision: payload.policy_decision,
      },
      { status: 404, headers: RECEIPT_CACHE_HEADERS }
    )
  }

  if (format === 'text') {
    return new NextResponse(formatAgentInstallReceiptText(payload.install_receipt), {
      headers: {
        ...RECEIPT_CACHE_HEADERS,
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }

  return NextResponse.json(
    {
      receipt: payload.install_receipt,
      policy_decision: payload.policy_decision,
      selected: payload.recommendation?.best_skill || null,
      feedback: payload.feedback,
      meta: {
        endpoint: '/api/agent/receipt',
        api_version: '1.0',
        resolve_endpoint: '/api/agent/resolve',
        generated_at: payload.meta.generated_at,
      },
    },
    { headers: RECEIPT_CACHE_HEADERS }
  )
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const task = searchParams.get('task') || ''
  const format = searchParams.get('format') || 'json'

  if (!task) {
    return NextResponse.json(
      {
        error: 'Missing required parameter: task',
        usage: 'GET /api/agent/receipt?task=review+pull+requests&agent=codex&max_risk=medium&format=text',
      },
      { status: 400 }
    )
  }

  try {
    const payload = await resolveAgentSkill({
      task,
      agent: searchParams.get('agent') || 'auto',
      limit: parseLimit(searchParams.get('limit')),
      constraints: {
        max_risk: searchParams.get('max_risk') || 'medium',
        needs_install_command: searchParams.get('needs_install_command') !== 'false',
        min_stars: Number(searchParams.get('min_stars') || 0),
      },
      live: searchParams.get('live') === 'true',
    })

    return receiptResponse(payload, format)
  } catch (error) {
    console.error('Agent receipt API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate install receipt' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AgentResolveInput & { format?: string }
    const payload = await resolveAgentSkill(body)
    return receiptResponse(payload, body.format)
  } catch (error) {
    console.error('Agent receipt API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate install receipt' },
      { status: 500 }
    )
  }
}
