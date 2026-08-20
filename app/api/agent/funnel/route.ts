import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'

function number(value: unknown) { return Number(value || 0) }

export async function GET(request: NextRequest) {
  const skillSlug = request.nextUrl.searchParams.get('skill_slug')
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 100), 1), 500)
  const supabase = createPublicClient()
  let eventsQuery = supabase.from('skill_event_stats').select('*').limit(limit)
  let outcomesQuery = supabase.from('agent_outcome_stats').select('*').limit(limit)
  if (skillSlug) {
    eventsQuery = eventsQuery.eq('skill_slug', skillSlug)
    outcomesQuery = outcomesQuery.eq('skill_slug', skillSlug)
  }
  const [{ data: events, error: eventError }, { data: outcomes, error: outcomeError }] = await Promise.all([eventsQuery, outcomesQuery])
  if (eventError || outcomeError) return NextResponse.json({ error: 'Failed to read aggregate funnel' }, { status: 503 })
  const outcomeMap = new Map((outcomes || []).map((row) => [row.skill_slug, row]))
  const slugs = new Set([...(events || []).map((row) => row.skill_slug), ...(outcomes || []).map((row) => row.skill_slug)])
  const skills = [...slugs].map((slug) => {
    const event = (events || []).find((row) => row.skill_slug === slug)
    const outcome = outcomeMap.get(slug)
    const views = number(event?.views)
    const installStarts = number(event?.install_starts) || number(event?.install_copies)
    const verifiedInstalls = number(outcome?.verified_installs) || number(event?.install_successes)
    const agentCalls = number(outcome?.total_outcomes) || number(event?.agent_calls)
    const successes = number(outcome?.successful_outcomes) || number(event?.outcome_successes)
    return {
      skill_slug: slug,
      funnel: { views, resolve_requests: number(event?.resolve_requests), install_copies: number(event?.install_copies), install_starts: installStarts, verified_installs: verifiedInstalls, agent_calls: agentCalls, successful_outcomes: successes },
      rates: { view_to_install_start: views ? Math.round(installStarts / views * 10_000) / 100 : null, install_to_verified: installStarts ? Math.round(verifiedInstalls / installStarts * 10_000) / 100 : null, agent_success: agentCalls ? Math.round(successes / agentCalls * 10_000) / 100 : null },
      definitions: { install_start: 'Unverified intent, such as a web handoff or CLI start.', verified_install: 'A successful agent outcome with install_used=true.', successful_outcome: 'A real result reported through the idempotent outcome contract.' },
    }
  }).sort((a, b) => b.funnel.views - a.funnel.views)
  return NextResponse.json({ skill_slug: skillSlug, skills, meta: { privacy: 'aggregate_only', verified_metrics_are_not_derived_from_page_clicks: true, generated_at: new Date().toISOString() } }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
}
