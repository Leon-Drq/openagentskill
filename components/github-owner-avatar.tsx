import { getGitHubAvatarUrl, getGitHubOwnerUrl } from '@/lib/github-owner'

const AVATAR_SIZES = {
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm',
} as const

export function GitHubOwnerAvatar({
  owner,
  label,
  size = 'md',
  showLabel = false,
  linked = true,
  className = '',
}: {
  owner: string | null | undefined
  label?: string | null
  size?: keyof typeof AVATAR_SIZES
  showLabel?: boolean
  linked?: boolean
  className?: string
}) {
  const normalizedOwner = (owner || '').trim()
  const displayLabel = (label || normalizedOwner || 'GitHub').trim()
  const avatar = (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-card font-mono font-semibold uppercase text-secondary ${AVATAR_SIZES[size]}`}
      aria-hidden="true"
    >
      <span>{displayLabel.slice(0, 1)}</span>
      {normalizedOwner ? (
        // GitHub serves a stable owner avatar or identicon from this URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getGitHubAvatarUrl(normalizedOwner, size === 'lg' ? 96 : 80)}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </span>
  )

  const contents = (
    <>
      {avatar}
      {showLabel ? (
        <span className="min-w-0 truncate font-mono text-xs text-secondary">
          @{normalizedOwner || displayLabel}
        </span>
      ) : null}
    </>
  )

  if (!normalizedOwner || !linked) {
    return <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>{contents}</span>
  }

  return (
    <a
      href={getGitHubOwnerUrl(normalizedOwner)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-w-0 items-center gap-2 transition-opacity hover:opacity-75 ${className}`}
      aria-label={`Open ${normalizedOwner} on GitHub`}
    >
      {contents}
    </a>
  )
}
