'use client'
import Link from 'next/link'
import { CreatorDirectoryCard } from '@/components/creator-directory-card'
import { buildCreatorDirectory } from '@/lib/creator-directory'
import { useI18n } from '@/lib/i18n/context'
import { creatorCopy } from '@/lib/i18n/creator-copy'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'

// No extra database/GitHub round trip on the homepage. These are dated public
// editorial sources, never a claim of live ownership or install verification.
const selected = buildCreatorDirectory().filter((c) =>
  [
    'yanliudesign',
    'leonxlnx',
    'op7418',
    'jimliu',
    'zarazhangrui',
    'alisa0808',
  ].includes(c.owner.toLowerCase()),
)
export function HomeCreators() {
  const { locale } = useI18n()
  return (
    <section
      aria-labelledby="home-creators-heading"
      className="border-t border-border bg-background"
    >
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h2
              id="home-creators-heading"
              className="font-display text-3xl sm:text-4xl"
            >
              Skill <em className="font-normal text-[#006b4f]">Creators</em>
            </h2>
            <p className="mt-3 text-sm text-secondary">
              {creatorCopy(
                locale,
                'Discover creators, their skills, and their work.',
              )}
            </p>
          </div>
          <Link
            href={getLocalizedNavigationHref('/creators', locale)}
            className="text-sm font-semibold text-[#006b4f]"
          >
            {creatorCopy(locale, 'View all creators')} →
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {selected.map((entry) => (
            <CreatorDirectoryCard
              key={entry.owner}
              entry={entry}
              locale={locale}
              compact
              registryAvailable={false}
              ownershipAvailable={false}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
