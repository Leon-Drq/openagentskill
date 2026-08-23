import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { isAutomationAuthorized } from '@/lib/security/route-auth'
import { getStoredXConnection } from '@/lib/x/poster'
import { getCreatorOutreachStatus } from '@/lib/x/growth'
import { classifyXConnectionError } from '@/lib/x/health'

function hasEnv(name: string) {
  return Boolean((process.env[name] || '').trim())
}

function numberFromEnv(name: string, fallback: number) {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

async function getConnectionStatus() {
  const serverSecret = process.env.INDEXER_SECRET
  if (!serverSecret) {
    return {
      authorized: false,
      health: 'blocked',
      reason: 'Missing INDEXER_SECRET',
      reauthorizationRequired: false,
      action: 'Configure INDEXER_SECRET in the production environment.',
    }
  }

  try {
    const connection = await getStoredXConnection(createPublicClient(), serverSecret)
    return {
      authorized: Boolean(connection),
      health: connection ? 'ready' : 'disconnected',
      username: connection?.username || null,
      userIdPresent: Boolean(connection?.x_user_id),
      scopePresent: Boolean(connection?.scope),
      reason: connection ? undefined : 'No stored OAuth connection',
      reauthorizationRequired: !connection,
      action: connection ? undefined : 'Connect @openagentskill to enable automatic posting.',
      actionUrl: connection ? undefined : '/api/x/auth',
    }
  } catch (error) {
    const failure = classifyXConnectionError(error)
    return {
      authorized: false,
      health: 'blocked',
      ...failure,
    }
  }
}

export async function GET(request: NextRequest) {
  if (!isAutomationAuthorized(request, ['CRON_SECRET', 'INDEXER_SECRET', 'INDEXER_TRIGGER_SECRET'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connection = await getConnectionStatus()
  const skillRadarXMaxQueries = numberFromEnv('SKILL_RADAR_X_MAX_QUERIES', 1)
  const skillRadarXResultsPerQuery = numberFromEnv('SKILL_RADAR_X_RESULTS_PER_QUERY', 10)
  const skillRadarXScanIntervalHours = Math.min(
    Math.max(numberFromEnv('SKILL_RADAR_X_SCAN_INTERVAL_HOURS', 6), 1),
    24
  )
  const skillRadarXQueriesPerDay = Math.ceil(24 / skillRadarXScanIntervalHours) * skillRadarXMaxQueries

  const creatorOutreach = await getCreatorOutreachStatus().catch((error) => ({
    queued: 0,
    posting: 0,
    postedLast24Hours: 0,
    errorsLast24Hours: 0,
    dailyLimit: numberFromEnv('X_CREATOR_REPLY_DAILY_LIMIT', 2),
    error: error instanceof Error ? error.message : 'Unable to load creator outreach state',
  }))

  return NextResponse.json({
    success: true,
    environment: {
      INDEXER_SECRET: hasEnv('INDEXER_SECRET'),
      CRON_SECRET: hasEnv('CRON_SECRET'),
      INDEXER_TRIGGER_SECRET: hasEnv('INDEXER_TRIGGER_SECRET'),
      X_CLIENT_ID: hasEnv('X_CLIENT_ID'),
      X_CLIENT_SECRET: hasEnv('X_CLIENT_SECRET'),
      X_BEARER_TOKEN: hasEnv('X_BEARER_TOKEN') || hasEnv('X_API_BEARER_TOKEN') || hasEnv('TWITTER_BEARER_TOKEN'),
      GITHUB_TOKEN: hasEnv('GITHUB_TOKEN'),
    },
    xOAuth: connection,
    budget: {
      dailyAutoPostsTarget: '3-5',
      postDailyCron: '30 15,19,23 * * *',
      growthRunCron: '30 14 * * *',
      skillRadarCron: '35 * * * *',
      postQueueBuildLimit: 3,
      growthQueueLimit: numberFromEnv('X_DAILY_SCENARIO_POSTS', 3),
      metricsSyncLimit: numberFromEnv('X_METRICS_SYNC_LIMIT', 12),
      replySyncLimit: numberFromEnv('X_REPLY_SYNC_LIMIT', 8),
      skillRadarXMaxQueries,
      skillRadarXResultsPerQuery,
      skillRadarXScanIntervalHours,
      skillRadarXQueriesPerDay,
      skillRadarXEnabled: skillRadarXMaxQueries > 0 && hasEnv('X_BEARER_TOKEN'),
      creatorReplyDailyLimit: Math.min(Math.max(numberFromEnv('X_CREATOR_REPLY_DAILY_LIMIT', 2), 1), 2),
    },
    creatorOutreach,
    guardrails: {
      duplicateSkillPosts: 'blocked by queue and post history',
      creatorReplyDedupe: 'one reply per source launch post; maximum two per rolling 24 hours',
      creatorEmail: 'draft-only; never sent automatically',
      genericFoundationRepos: 'blocked before X queue/posting',
      minImportStars: 10,
      requireClearLicense: true,
      requireSkillLikeness: true,
    },
  })
}
