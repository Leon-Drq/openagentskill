import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { isAutomationAuthorized } from '@/lib/security/route-auth'

export const maxDuration = 300

function isAuthorized(request: NextRequest): boolean {
  return isAutomationAuthorized(request)
}

/**
 * Fetches live star counts from GitHub API for all skills that have a github_repo.
 * Updates the database if the count changed.
 * Called by Vercel Cron daily at 03:00 UTC.
 */
async function refreshAllStars(): Promise<{ updated: number; unchanged: number; errors: number }> {
  const serverSecret = process.env.INDEXER_SECRET
  if (!serverSecret) {
    throw new Error('Missing INDEXER_SECRET for controlled star refresh writes.')
  }

  const supabase = createPublicClient()

  // Fetch all skills with a GitHub repo
  const { data: skills, error } = await supabase
    .from('skills')
    .select('slug, github_repo, github_stars')
    .eq('ai_review_approved', true)
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
        const newForks: number | null = data.forks_count ?? null
        const language: string | null = data.language ?? null
        const pushedAt: string | null = data.pushed_at ?? null

        if (newStars !== skill.github_stars) {
          const { error: updateError } = await supabase.rpc('update_skill_github_metadata', {
            p_server_secret: serverSecret,
            p_slug: skill.slug,
            p_github_stars: newStars,
            p_github_forks: newForks,
            p_github_language: language,
            p_github_last_pushed_at: pushedAt,
          })

          if (updateError) {
            throw new Error(updateError.message)
          }

          console.log(`[refresh-stars] ${skill.slug}: ${skill.github_stars} -> ${newStars}`)
          updated++
        } else {
          const { error: updateError } = await supabase.rpc('update_skill_github_metadata', {
            p_server_secret: serverSecret,
            p_slug: skill.slug,
            p_github_stars: newStars,
            p_github_forks: newForks,
            p_github_language: language,
            p_github_last_pushed_at: pushedAt,
          })
          if (updateError) {
            throw new Error(updateError.message)
          }
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
