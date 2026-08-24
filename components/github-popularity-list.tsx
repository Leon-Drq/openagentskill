import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { GitHubOwnerAvatar } from '@/components/github-owner-avatar'
import { getGitHubOwner } from '@/lib/github-owner'
import { formatCompactNumber } from '@/lib/quality'

export interface GitHubPopularityItem {
  rank: number
  slug: string
  name: string
  description: string
  githubStars: number
  githubRepo?: string | null
  githubOwner?: string | null
  authorName?: string | null
  badge?: string | null
  reason?: string | null
  category?: string | null
}

export function GitHubPopularityList({
  items,
  compact = false,
}: {
  items: GitHubPopularityItem[]
  compact?: boolean
}) {
  return (
    <ol className="overflow-hidden rounded-[10px] border border-border bg-background">
      {items.map((item) => {
        const owner = item.githubOwner || getGitHubOwner({ github_repo: item.githubRepo })
        const ownerLabel = owner || item.authorName || 'GitHub creator'

        return (
          <li
            key={item.slug}
            className="grid gap-4 border-t border-border px-4 py-5 first:border-t-0 sm:grid-cols-[44px_48px_minmax(0,1fr)_auto] sm:items-center sm:px-5"
          >
            <span
              className={`grid h-9 w-9 place-items-center rounded-full font-mono text-xs font-semibold tabular-nums ${
                item.rank <= 3 ? 'bg-[#006b4f] text-white' : 'border border-border text-secondary'
              }`}
            >
              {item.rank}
            </span>

            <GitHubOwnerAvatar owner={owner} label={item.authorName || ownerLabel} size="lg" />

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link href={`/skills/${item.slug}`} className="min-w-0">
                  <h3 className="truncate text-base font-semibold leading-tight transition-colors hover:text-[#006b4f] sm:text-lg">
                    {item.name}
                  </h3>
                </Link>
                <span className="font-mono text-[11px] text-secondary">@{ownerLabel}</span>
                {item.category ? (
                  <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-secondary">
                    {item.category}
                  </span>
                ) : null}
              </div>
              {!compact ? (
                <p className="mt-1 line-clamp-1 text-sm leading-6 text-secondary">
                  {item.reason || item.description}
                </p>
              ) : null}
            </div>

            <div className="col-span-2 flex items-center justify-between gap-4 pl-[60px] sm:col-span-1 sm:pl-0">
              <div className="text-right">
                <div className="font-mono text-lg font-semibold tabular-nums">
                  {formatCompactNumber(item.githubStars || 0)}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-secondary">GitHub stars</div>
              </div>
              <Link
                href={`/skills/${item.slug}`}
                aria-label={`Open ${item.name}`}
                className="grid h-9 w-9 place-items-center rounded-full border border-border text-secondary transition-colors hover:border-[#006b4f] hover:text-[#006b4f]"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
