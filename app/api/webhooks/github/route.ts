import { after, NextRequest, NextResponse } from 'next/server'
import { syncRepositorySkills } from '@/lib/indexer/repository-skill-sync'
import { AUTOMATIC_DISCOVERY_MIN_STARS } from '@/lib/indexer/intake-policy'
import {
  pushTouchesAgentSkill,
  verifyGitHubWebhookSignature,
} from '@/lib/github/webhook'

export const runtime = 'nodejs'
export const maxDuration = 300

function repositoryFullName(payload: Record<string, unknown>) {
  const repository = payload.repository
  if (!repository || typeof repository !== 'object') return null
  const fullName = (repository as Record<string, unknown>).full_name
  return typeof fullName === 'string' && /^[^/\s]+\/[^/\s]+$/.test(fullName) ? fullName : null
}

export async function POST(request: NextRequest) {
  const secret = (process.env.GITHUB_WEBHOOK_SECRET || '').trim()
  if (!secret) {
    return NextResponse.json({ error: 'GitHub source webhook is not configured.' }, { status: 503 })
  }

  const rawPayload = await request.text()
  if (!verifyGitHubWebhookSignature(rawPayload, request.headers.get('x-hub-signature-256'), secret)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 })
  }

  const event = request.headers.get('x-github-event') || 'unknown'
  const delivery = request.headers.get('x-github-delivery') || 'unknown'
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawPayload) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 })
  }

  if (event === 'ping') {
    return NextResponse.json({ ok: true, event, delivery })
  }
  if (event !== 'push') {
    return NextResponse.json({ ok: true, event, delivery, ignored: 'unsupported-event' }, { status: 202 })
  }

  const repository = repositoryFullName(payload)
  if (!repository) {
    return NextResponse.json({ error: 'Webhook repository is missing or invalid.' }, { status: 400 })
  }
  if (!pushTouchesAgentSkill(payload)) {
    return NextResponse.json({ ok: true, event, delivery, repository, ignored: 'no-skill-source-change' }, { status: 202 })
  }

  after(async () => {
    try {
      const result = await syncRepositorySkills({
        reference: `https://github.com/${repository}`,
        discoverySource: 'github-push-webhook',
        discoveryMetadata: { delivery, event },
        refreshExisting: true,
        minimumStarsForNew: AUTOMATIC_DISCOVERY_MIN_STARS,
        maxSkills: 20,
      })
      console.info('[github-source-webhook] sync completed', {
        delivery,
        repository,
        created: result.created,
        updated: result.updated,
        rejected: result.rejected,
        errors: result.errors,
      })
    } catch (error) {
      console.error('[github-source-webhook] sync failed', {
        delivery,
        repository,
        error: error instanceof Error ? error.message : 'Unknown source sync error',
      })
    }
  })

  return NextResponse.json({ ok: true, event, delivery, repository, queued: true }, { status: 202 })
}
