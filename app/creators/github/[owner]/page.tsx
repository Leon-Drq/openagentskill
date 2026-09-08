import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketingPageShell } from '@/components/marketing-page'
import { GitHubOwnerAvatar } from '@/components/github-owner-avatar'
import { CreatorMethodology } from '@/components/creator-methodology'
import { getCreatorDirectory } from '@/lib/creator-directory-data'
import { FEATURED_CREATORS, creatorHref } from '@/lib/creator-directory'
import { getCreatorWorks } from '@/lib/creator-gallery'
import { getShowcaseImageSrc, localizeShowcase } from '@/lib/showcase'
import { creatorCopy, type CreatorMessage } from '@/lib/i18n/creator-copy'
import { I18nProvider } from '@/lib/i18n/context'
import { getLocaleFromSearchParam } from '@/lib/i18n/config'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'

type Props = {
  params: Promise<{ owner: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}
const BASE = 'https://www.openagentskill.com'
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { owner } = await params,
    p = await searchParams,
    c = FEATURED_CREATORS.find(
      (e) => e.owner.toLowerCase() === owner.toLowerCase(),
    )
  if (!c)
    return {
      title: 'Creator not found',
      robots: { index: false, follow: false },
    }
  const locale = getLocaleFromSearchParam(p.lang) || 'en',
    title = `${c.name} — Skill Creators`
  const description = `${c.repositories.map((r) => r.fullName).join(', ')}. ${creatorCopy(locale, 'Discover creators, their skills, and their work.')}`
  return {
    title,
    description,
    alternates: { canonical: BASE + creatorHref(c.owner) },
    robots: {
      index: !Object.values(p).some(Boolean) && owner === owner.toLowerCase(),
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: BASE + creatorHref(c.owner),
      type: 'website',
    },
  }
}
export default async function FeaturedCreatorPage({
  params,
  searchParams,
}: Props) {
  const { owner } = await params,
    p = await searchParams,
    locale = getLocaleFromSearchParam(p.lang) || 'en'
  if (
    !FEATURED_CREATORS.some(
      (c) => c.owner.toLowerCase() === owner.toLowerCase(),
    )
  )
    notFound()
  const data = await getCreatorDirectory(),
    entry = data.entries.find(
      (c) => c.owner.toLowerCase() === owner.toLowerCase(),
    )!
  const works = getCreatorWorks(entry.owner),
    t = (k: CreatorMessage) => creatorCopy(locale, k),
    href = (s: string) => getLocalizedNavigationHref(s, locale)
  const date = (s: string) =>
    new Date(s).toLocaleDateString(locale, { timeZone: 'UTC' })
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: BASE + creatorHref(entry.owner),
    inLanguage: locale,
    dateModified: entry.checkedAt,
    mainEntity: {
      '@type': entry.kind,
      name: entry.name,
      url: entry.githubUrl,
      sameAs: [entry.githubUrl],
      description: entry.repositories.map((r) => r.fullName).join(', '),
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
          <Link href={href('/creators')} className="text-sm text-[#006b4f]">
            ← {t('Skill creators')}
          </Link>
          <header className="mt-8 grid gap-6 border-b border-border pb-8 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="flex items-center gap-3">
                <GitHubOwnerAvatar
                  owner={entry.owner}
                  linked={false}
                  size="lg"
                />
                <span className="text-sm text-secondary">
                  {t(entry.kind === 'Organization' ? 'Team' : 'Individual')} ·{' '}
                  {t(entry.area as CreatorMessage)}
                </span>
              </div>
              <h1 className="mt-5 break-words font-display text-4xl sm:text-6xl">
                {entry.name}
              </h1>
              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                <span className="bg-[#006b4f]/10 px-3 py-2 text-[#006b4f]">
                  {t('Editor selected')}
                </span>
                <span className="border border-border px-3 py-2">
                  {entry.claimedProfile ? t('Claimed') : t('Listed')}
                </span>
                <a
                  className="px-3 py-2 underline underline-offset-4"
                  href={entry.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub @{entry.owner} ↗
                </a>
              </div>
            </div>
            <Link
              href={href('/creator')}
              className="w-fit bg-foreground px-5 py-3 text-sm font-semibold text-background"
            >
              {t('Claim your profile')}
            </Link>
          </header>
          <p className="mt-5 max-w-4xl text-sm leading-6 text-secondary">
            {t(
              'Public GitHub attribution is not account verification, author endorsement, or a safety audit.',
            )}
          </p>
          {entry.claimedProfile && (
            <p className="mt-3 text-sm">
              <Link
                className="underline"
                href={href(
                  `/creators/${encodeURIComponent(entry.claimedProfile)}`,
                )}
              >
                {t('Claimed account')} ↗
              </Link>{' '}
              ·{' '}
              {t(
                'Ownership applies only to the linked, approved claims, not every repository shown.',
              )}
            </p>
          )}
          {(!data.registryAvailable || !data.ownershipAvailable) && (
            <p role="status" className="mt-5 border border-border p-4 text-sm">
              {t(
                'Registry temporarily unavailable. Source projects remain browseable; listing and ownership status are not inferred.',
              )}
            </p>
          )}
          <dl className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-3">
            {[
              [
                t('Related repository stars'),
                entry.stars.toLocaleString(locale),
              ],
              [t('Repositories'), entry.repositories.length],
              [
                t('Skill listings'),
                data.registryAvailable ? entry.skills.length : '—',
              ],
            ].map(([label, value]) => (
              <div key={label} className="bg-background p-5">
                <dt className="text-xs text-secondary">{label}</dt>
                <dd className="mt-3 font-mono text-2xl">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-secondary">
            {creatorCopy(locale, 'Data as of {date}', {
              date: date(entry.statsAsOf),
            })}{' '}
            ·{' '}
            {t(
              'Stars count each selected repository once, not every skill or unrelated project.',
            )}
          </p>
          <section className="mt-12">
            <h2 className="font-display text-3xl">
              {t('Representative projects')}
            </h2>
            <div className="mt-5 divide-y divide-border border-y border-border">
              {entry.repositories.map((repo) => (
                <article
                  key={repo.fullName}
                  className="grid gap-4 py-6 sm:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <h3 className="break-all font-semibold">
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#006b4f]"
                      >
                        {repo.fullName} ↗
                      </a>
                    </h3>
                    <p className="mt-2 font-mono text-xs text-secondary">
                      {creatorCopy(locale, 'Updated {date}', {
                        date: date(repo.pushedAt),
                      })}{' '}
                      · ★ {repo.stars.toLocaleString(locale)}
                    </p>
                  </div>
                  <a
                    href={`${repo.url}/blob/${repo.revision}/${repo.skillPath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-start border border-border px-4 py-2 text-xs"
                  >
                    {t('Read skill source')} ↗
                  </a>
                </article>
              ))}
            </div>
          </section>
          {entry.skills.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-3xl">{t('Skill listings')}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {entry.skills.map((skill) => (
                  <Link
                    key={skill.slug}
                    href={href(`/skills/${skill.slug}`)}
                    className="flex min-w-0 items-center justify-between gap-3 border border-border p-4 text-sm hover:border-[#006b4f]"
                  >
                    <span className="break-words">{skill.name}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          <section className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-3xl">
                {t('Work made with these skills')}
              </h2>
              <Link className="text-sm text-[#006b4f]" href={href('/showcase')}>
                {t('Browse gallery')} →
              </Link>
            </div>
            {works.length > 0 ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {works.slice(0, 6).map((work) => (
                  <Link
                    key={work.slug}
                    href={href(`/showcase/${work.slug}`)}
                    className="group"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden border border-border bg-muted">
                      <Image
                        src={getShowcaseImageSrc(work.media[0].src, 'card')}
                        fill
                        sizes="(max-width: 640px) 90vw, 360px"
                        alt={localizeShowcase(work.media[0].alt, locale)}
                        className="object-cover object-top"
                      />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold group-hover:text-[#006b4f]">
                      {localizeShowcase(work.title, locale)} →
                    </h3>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-5 border border-dashed border-border p-8 text-secondary">
                {t('No gallery preview yet')}
              </p>
            )}
          </section>
          <CreatorMethodology locale={locale} />
        </div>
      </MarketingPageShell>
    </I18nProvider>
  )
}
