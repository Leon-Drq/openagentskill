import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingPageShell } from '@/components/marketing-page'
import { CreatorDirectoryCard } from '@/components/creator-directory-card'
import { CreatorDirectoryFilters } from '@/components/creator-directory-filters'
import { CreatorMethodology } from '@/components/creator-methodology'
import { getCreatorDirectory } from '@/lib/creator-directory-data'
import {
  CREATOR_AREAS,
  selectCreators,
  creatorHref,
  type CreatorSort,
} from '@/lib/creator-directory'
import { creatorCopy, type CreatorMessage } from '@/lib/i18n/creator-copy'
import { I18nProvider } from '@/lib/i18n/context'
import { getLocaleFromSearchParam } from '@/lib/i18n/config'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}
const BASE = 'https://www.openagentskill.com/creators'
export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const p = await searchParams,
    locale = getLocaleFromSearchParam(p.lang) || 'en'
  const title = creatorCopy(locale, 'Featured creators'),
    description = creatorCopy(
      locale,
      'Explore their skills, see the work, and start creating.',
    )
  return {
    title,
    description,
    alternates: { canonical: BASE },
    robots: { index: !Object.values(p).some(Boolean), follow: true },
    openGraph: { title, description, url: BASE },
  }
}
export default async function CreatorsPage({ searchParams }: Props) {
  const params = await searchParams,
    locale = getLocaleFromSearchParam(params.lang) || 'en'
  const scalar = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value) || ''
  const query = scalar(params.q).slice(0, 100),
    area = CREATOR_AREAS.find((a) => a === scalar(params.area)) || ''
  const sort: CreatorSort =
    scalar(params.sort) === 'recent'
      ? 'recent'
      : scalar(params.sort) === 'editorial'
        ? 'editorial'
        : 'stars'
  const data = await getCreatorDirectory(),
    entries = selectCreators(data.entries, query, area, sort)
  const t = (k: CreatorMessage) => creatorCopy(locale, k),
    href = (s: string) => getLocalizedNavigationHref(s, locale)
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('Featured creators'),
    url: BASE,
    inLanguage: locale,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: entries.length,
      itemListElement: entries.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        url: 'https://www.openagentskill.com' + creatorHref(c.owner),
      })),
    },
  }
  return (
    <I18nProvider initialLocale={locale}>
      <MarketingPageShell>
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
            }}
          />
          <header className="mb-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#006b4f]">
                {t('Featured creators')}
              </p>
              <h1 className="mt-5 max-w-3xl font-display text-4xl leading-[1.06] text-balance sm:text-6xl">
                {t('Find the people behind your next project.')}
              </h1>
              <p className="mt-5 text-base leading-7 text-secondary">
                {t('Explore their skills, see the work, and start creating.')}
              </p>
            </div>
            <Link
              href={href('/creator')}
              className="w-fit bg-foreground px-5 py-3 text-sm font-semibold text-background"
            >
              {t('Claim your profile')}
            </Link>
          </header>
          <CreatorDirectoryFilters
            locale={locale}
            query={query}
            area={area}
            sort={sort}
          />
          <div className="my-5 flex flex-wrap justify-between gap-3 text-xs text-secondary">
            <p>
              {t('Featured creators')} · {entries.length.toLocaleString(locale)}
            </p>
            <a href="#methodology" className="underline underline-offset-4">
              {t('Sources and methodology')}
            </a>
          </div>
          <p className="mb-6 max-w-4xl text-xs leading-6 text-secondary">
            {t(
              'Public GitHub attribution is not account verification, author endorsement, or a safety audit.',
            )}
          </p>
          {(!data.registryAvailable || !data.ownershipAvailable) && (
            <p role="status" className="mb-6 border border-border p-4 text-sm">
              {t(
                'Registry temporarily unavailable. Source projects remain browseable; listing and ownership status are not inferred.',
              )}
            </p>
          )}
          {entries.length ? (
            <div className="grid items-stretch gap-5 md:grid-cols-2">
              {entries.map((entry) => (
                <CreatorDirectoryCard
                  key={entry.owner}
                  entry={entry}
                  locale={locale}
                  registryAvailable={data.registryAvailable}
                  ownershipAvailable={data.ownershipAvailable}
                />
              ))}
            </div>
          ) : (
            <div className="border border-border p-10">
              <h2 className="text-xl">{t('No matching creators')}</h2>
              <Link
                className="mt-4 inline-block underline"
                href={href('/creators')}
              >
                {t('Clear filters')}
              </Link>
            </div>
          )}
          {data.profiles.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-3xl">{t('Claimed profiles')}</h2>
              <div className="mt-4 flex flex-wrap gap-4">
                {data.profiles.map((p) => (
                  <Link
                    key={p.id}
                    className="border border-border px-4 py-3"
                    href={href(`/creators/${encodeURIComponent(p.username!)}`)}
                  >
                    @{p.username}
                  </Link>
                ))}
              </div>
            </section>
          )}
          <CreatorMethodology locale={locale} />
        </div>
      </MarketingPageShell>
    </I18nProvider>
  )
}
