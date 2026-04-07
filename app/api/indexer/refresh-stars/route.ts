import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/public'

export const maxDuration = 300

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const indexerSecret = process.env.INDEXER_SECRET
  if (!cronSecret && !indexerSecret) return true
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')
  return (!!cronSecret && token === cronSecret) || (!!indexerSecret && token === indexerSecret)
}

/**
 * Fetches live star counts from GitHub API for all skills that have a github_repo.
 * Updates the database if the count changed.
 * Called by Vercel Cron daily at 03:00 UTC.
 */
async function refreshAllStars(): Promise<{ updated: number; unchanged: number; errors: number }> {
  const supabase = createServiceClient()

  // Fetch all skills with a GitHub repo
  const { data: skills, error } = await supabase
    .from('skills')
    .select('id, slug, github_repo, github_stars')
    .not('github_repo', 'is', null)

  if (error) throw new Error(`Failed to fetch skills: ${error.message}`)
  if (!skills?.length) return { updated: 0, unchanged: 0, errors: 0 }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  }

  let updated = 0, unchanged = 0, errors = 0

  // Process in batches of 5 to respect rate limits
  for (let i = 0; i < skills.length; i += 5) {
    const batch = skills.slice(i, i + 5)

    await Promise.all(batch.map(async (skill) => {
      try {
        // github_repo can be "owner/repo" or full URL
        const repoPath = skill.github_repo
          .replace('https://github.com/', '')
          .replace(/\.git$/, '')
          .split('/')
          .slice(0, 2)
          .join('/')

        const res = await fetch(`https://api.github.com/repos/${repoPath}`, { headers })
        if (!res.ok) {
          console.log(`[refresh-stars] GitHub fetch failed for ${repoPath}: ${res.status}`)
          errors++
          return
        }

        const data = await res.json()
        const newStars: number = data.stargazers_count ?? 0

        if (newStars !== skill.github_stars) {
          await supabase
            .from('skills')
            .update({ github_stars: newStars, last_synced_at: new Date().toISOString() })
            .eq('id', skill.id)
          console.log(`[refresh-stars] ${skill.slug}: ${skill.github_stars} → ${newStars}`)
          updated++
        } else {
          unchanged++
        }
      } catch (err: any) {
        console.error(`[refresh-stars] Error for ${skill.slug}:`, err.message)
        errors++
      }
    }))

    // Avoid GitHub rate limiting (secondary rate limit: 5000 req/hr authenticated)
    if (i + 5 < skills.length) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  return { updated, unchanged, errors }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return POST(request)
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[refresh-stars] Starting star refresh for all skills...')
    const summary = await refreshAllStars()
    console.log('[refresh-stars] Complete:', summary)
    return NextResponse.json({ success: true, summary })
  } catch (error: any) {
    console.error('[refresh-stars] Fatal error:', error)
    return NextResponse.json({ error: 'Refresh failed', details: error.message }, { status: 500 })
  }
}
