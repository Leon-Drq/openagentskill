import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function configured(name: string) {
  return Boolean((process.env[name] || '').trim())
}

export async function GET() {
  const measurementId = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '').trim()
  const checks = {
    ga4: /^G-[A-Z0-9]+$/i.test(measurementId),
    github_oauth: process.env.NEXT_PUBLIC_GITHUB_OAUTH_ENABLED === 'true',
    github_app_install: configured('NEXT_PUBLIC_GITHUB_APP_INSTALL_URL'),
    github_source_webhook: configured('GITHUB_WEBHOOK_SECRET'),
    source_sync_fallback: configured('CRON_SECRET') && configured('INDEXER_SECRET'),
    x_distribution: configured('X_CLIENT_ID') && configured('X_CLIENT_SECRET'),
  }
  const coreChecks = ['ga4', 'github_oauth', 'source_sync_fallback'] as const
  const coreMissing = coreChecks.filter((name) => !checks[name])
  const missing = Object.entries(checks).filter(([, ready]) => !ready).map(([name]) => name)

  return NextResponse.json({
    ready: coreMissing.length === 0,
    full_ready: missing.length === 0,
    checks,
    core_missing: coreMissing,
    missing,
    funnels: {
      creator: ['skill_claim_start', 'creator_github_connected', 'skill_claim_verified', 'creator_profile_published'],
      distribution: ['creator_badge_copy', 'creator_share_open', 'skill_share_copy'],
      outcome: ['skill_install_start', 'install_success', 'outcome_success'],
    },
  }, {
    headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600' },
  })
}
