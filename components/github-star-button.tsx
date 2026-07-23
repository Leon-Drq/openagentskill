'use client'

import { useEffect, useState } from 'react'
import { Github } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GitHubRepoSummary {
  repo?: string
  url?: string
  stars_label?: string
}

interface GitHubStarButtonProps {
  className?: string
  fullWidth?: boolean
  compact?: boolean
}

const REPO_CACHE_KEY = 'openagentskill.github-repo-summary.v1'
const FALLBACK_REPO: Required<GitHubRepoSummary> = {
  repo: 'Leon-Drq/openagentskill',
  url: 'https://github.com/Leon-Drq/openagentskill',
  stars_label: '200+',
}

function readCachedRepo(): GitHubRepoSummary | null {
  try {
    const value = window.sessionStorage.getItem(REPO_CACHE_KEY)
    if (!value) return null
    const parsed = JSON.parse(value) as GitHubRepoSummary
    return parsed.repo && parsed.url && parsed.stars_label ? parsed : null
  } catch {
    return null
  }
}

function cacheRepo(repo: GitHubRepoSummary) {
  try {
    window.sessionStorage.setItem(REPO_CACHE_KEY, JSON.stringify(repo))
  } catch {
    // Storage can be unavailable in private browsing; the live response still works.
  }
}

export function GitHubStarButton({ className, fullWidth, compact }: GitHubStarButtonProps) {
  // Keep the server and initial browser render identical. Cached data is applied
  // after hydration so the header never creates a React hydration mismatch.
  const [repo, setRepo] = useState<GitHubRepoSummary>(FALLBACK_REPO)

  useEffect(() => {
    let mounted = true
    const cached = readCachedRepo()
    if (cached) {
      const timer = window.setTimeout(() => {
        if (mounted) setRepo({ ...FALLBACK_REPO, ...cached })
      }, 0)

      return () => {
        mounted = false
        window.clearTimeout(timer)
      }
    }

    fetch('/api/github/repo')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: GitHubRepoSummary | null) => {
        if (!mounted || !data) return
        const next = { ...FALLBACK_REPO, ...data }
        cacheRepo(next)
        setRepo(next)
      })
      .catch(() => {
        // Keep the static fallback. The button should never disappear.
      })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <a
      href={repo.url || 'https://github.com/Leon-Drq/openagentskill'}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex h-9 shrink-0 items-stretch overflow-hidden rounded-[8px] bg-[#006b4f] text-sm font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-opacity hover:opacity-90',
        fullWidth && 'w-full justify-center',
        className
      )}
      aria-label={`Star ${repo.repo || 'OpenAgentSkill'} on GitHub, ${repo.stars_label || '0'} stars`}
    >
      <span className={cn('flex items-center gap-2', compact ? 'px-2.5' : 'px-3')}>
        <Github className="h-4 w-4" aria-hidden="true" />
        <span className={compact ? 'sr-only sm:not-sr-only' : undefined}>Star</span>
      </span>
      <span className="flex min-w-8 items-center justify-center border-l border-white/15 bg-[#075f47] px-2 font-mono text-[11px]">
        {repo.stars_label || '0'}
      </span>
    </a>
  )
}
