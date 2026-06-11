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
}

export function GitHubStarButton({ className, fullWidth }: GitHubStarButtonProps) {
  const [repo, setRepo] = useState<GitHubRepoSummary>({
    repo: 'Leon-Drq/openagentskill',
    url: 'https://github.com/Leon-Drq/openagentskill',
    stars_label: '0',
  })

  useEffect(() => {
    let mounted = true

    fetch('/api/github/repo')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: GitHubRepoSummary | null) => {
        if (!mounted || !data) return
        setRepo((current) => ({
          repo: data.repo || current.repo,
          url: data.url || current.url,
          stars_label: data.stars_label || current.stars_label,
        }))
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
      <span className="flex items-center gap-2 px-3">
        <Github className="h-4 w-4" aria-hidden="true" />
        <span>Star</span>
      </span>
      <span className="flex min-w-8 items-center justify-center border-l border-white/15 bg-[#075f47] px-2 font-mono text-[11px]">
        {repo.stars_label || '0'}
      </span>
    </a>
  )
}
