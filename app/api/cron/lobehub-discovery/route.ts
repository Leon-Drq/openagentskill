import { NextRequest, NextResponse } from 'next/server'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { discoverLobeHubSources } from '@/lib/indexer/lobehub-discovery'
import { enqueueRepositoryCandidates } from '@/lib/indexer/candidate-intake'
import { recordIndexerRun } from '@/lib/indexer/run-log'
export const runtime = 'nodejs'
export const maxDuration = 120
async function run(request: NextRequest) {
  if (!isAutomationAuthorized(request, ['CRON_SECRET','INDEXER_SECRET','INDEXER_TRIGGER_SECRET'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (process.env.CANDIDATE_PIPELINE_DISABLED === 'true') return NextResponse.json({ skipped: true })
  const startedAt = new Date().toISOString()
  try {
    const discovery = await discoverLobeHubSources(5)
    const intake = await enqueueRepositoryCandidates(discovery.candidates, 'lobehub-public-directory')
    await recordIndexerRun({ mode: 'lobehub-discovery', status: 'completed', started_at: startedAt, candidates_found: discovery.candidates.length, imported: intake.inserted, skipped_existing: intake.duplicates, errors: discovery.errors.length, metadata: { stage: 'discovery', sources_found: discovery.sourcesFound, errors: discovery.errors } })
    return NextResponse.json({ success: true, intake, sourcesFound: discovery.sourcesFound, errors: discovery.errors })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Discovery unavailable'
    await recordIndexerRun({ mode: 'lobehub-discovery', status: 'failed', started_at: startedAt, errors: 1, metadata: { stage: 'discovery', error: message } })
    return NextResponse.json({ success: false, error: message }, { status: 502 })
  }
}
export const GET = run
export const POST = run
