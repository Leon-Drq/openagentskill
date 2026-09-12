import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Code2 } from 'lucide-react'
import { GitHubOwnerAvatar } from '@/components/github-owner-avatar'
import { creatorHref, type DirectoryCreator } from '@/lib/creator-directory'
import { getCreatorWorks } from '@/lib/creator-gallery'
import { getShowcaseImageSrc, localizeShowcase } from '@/lib/showcase-shared'
import type { Locale } from '@/lib/i18n/config'
import { creatorCopy, type CreatorMessage } from '@/lib/i18n/creator-copy'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'

export function CreatorDirectoryCard({
  entry,
  locale,
  compact = false,
  registryAvailable = true,
  ownershipAvailable = true,
}: {
  entry: DirectoryCreator
  locale: Locale
  compact?: boolean
  registryAvailable?: boolean
  ownershipAvailable?: boolean
}) {
  const t = (key: CreatorMessage) => creatorCopy(locale, key)
  const href = getLocalizedNavigationHref(creatorHref(entry.owner), locale)
  const work = getCreatorWorks(entry.owner)[0]
  const number = (n: number) =>
    Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n)
  return (
    <article
      className="group flex min-w-0 flex-col border border-border bg-background"
      data-creator={entry.owner.toLowerCase()}
    >
      <div className={compact ? 'p-5' : 'p-5 sm:p-6'}>
        <div className="flex items-start gap-3">
          <GitHubOwnerAvatar
            owner={entry.owner}
            label={entry.name}
            linked={false}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-lg font-semibold">
              <Link
                href={href}
                className="hover:text-[#006b4f] focus-visible:outline-2"
              >
                {entry.name}
              </Link>
            </h3>
            <a
              href={entry.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-xs text-secondary hover:underline"
            >
              @{entry.owner} ↗
            </a>
          </div>
          <span className="shrink-0 border border-border px-2 py-1 text-[10px]">
            {t(entry.kind === 'Organization' ? 'Team' : 'Individual')}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          <span className="bg-[#006b4f]/10 px-2 py-1 text-[#006b4f]">
            {t('Editor selected')}
          </span>
          <span className="border border-border px-2 py-1">
            {ownershipAvailable && entry.claimedProfile
              ? t('Claimed')
              : t('Listed')}
          </span>
          <span className="px-1 py-1 text-secondary">
            {t(entry.area as CreatorMessage)}
          </span>
        </div>
        {!compact && (
          <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-border py-4 text-xs">
            <div>
              <dt className="text-secondary">
                {t('Related repository stars')}
              </dt>
              <dd className="mt-2 font-mono text-base">
                {number(entry.stars)}
              </dd>
            </div>
            <div>
              <dt className="text-secondary">{t('Repositories')}</dt>
              <dd className="mt-2 font-mono text-base">
                {entry.repositories.length}
              </dd>
            </div>
            <div>
              <dt className="text-secondary">{t('Skill listings')}</dt>
              <dd className="mt-2 font-mono text-base">
                {registryAvailable ? entry.skills.length : '—'}
              </dd>
            </div>
          </dl>
        )}
        <div className="mt-4 space-y-2">
          {entry.repositories.slice(0, compact ? 1 : 3).map((repo) => (
            <a
              key={repo.fullName}
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-10 items-center justify-between gap-3 border border-border px-3 py-2 text-sm hover:border-[#006b4f]"
            >
              <span className="min-w-0 break-all font-medium">
                {repo.fullName.split('/')[1]}
              </span>
              <span className="shrink-0 font-mono text-xs text-secondary">
                ★ {number(repo.stars)}
              </span>
            </a>
          ))}
        </div>
        {!compact && entry.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {entry.skills.slice(0, 3).map((skill) => (
              <Link
                key={skill.slug}
                href={getLocalizedNavigationHref(
                  `/skills/${skill.slug}`,
                  locale,
                )}
                className="max-w-full break-words border-b border-border py-1 text-xs text-[#006b4f] hover:underline"
              >
                {skill.name} →
              </Link>
            ))}
          </div>
        )}
        <p className="mt-3 text-[10px] text-secondary">
          {creatorCopy(locale, 'Data as of {date}', {
            date: new Date(entry.statsAsOf).toLocaleDateString(locale, {
              timeZone: 'UTC',
            }),
          })}
        </p>
      </div>
      <div className="mt-auto px-5 pb-5 sm:px-6">
        {work ? (
          <Link
            href={getLocalizedNavigationHref(`/showcase/${work.slug}`, locale)}
            className="relative block aspect-[16/7] overflow-hidden border border-border bg-muted"
            aria-label={localizeShowcase(work.title, locale)}
          >
            <Image
              src={getShowcaseImageSrc(work.media[0].src, 'card')}
              alt={localizeShowcase(work.media[0].alt, locale)}
              fill
              sizes={
                compact
                  ? '(max-width: 640px) 90vw, 360px'
                  : '(max-width: 640px) 90vw, 540px'
              }
              className="object-cover object-top transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.02]"
            />
          </Link>
        ) : (
          <div className="flex aspect-[16/7] flex-col justify-center gap-2 border border-dashed border-border px-5 text-secondary">
            <Code2 className="size-5" aria-hidden="true" />
            <p className="text-sm">{t('No gallery preview yet')}</p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <Link
            href={href}
            className="inline-flex min-h-10 items-center gap-2 font-semibold text-[#006b4f]"
          >
            {t('View profile')}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
          {!compact && (
            <Link
              href={getLocalizedNavigationHref('/creator', locale)}
              className="text-secondary underline underline-offset-4"
            >
              {t('Claim your profile')}
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
