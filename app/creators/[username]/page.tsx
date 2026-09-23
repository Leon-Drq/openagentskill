import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { BadgeCheck, ExternalLink, GitCommitHorizontal, ShieldCheck } from 'lucide-react'
import { createPublicClient } from '@/lib/supabase/public'
import { MarketingPageShell } from '@/components/marketing-page'
import { PUBLIC_SKILL_FILTER } from '@/lib/skills/publication'
import { repositoryStars, publicWebsite, serializeCreatorSchema } from '@/lib/creator-profile'
import { CreatorProfileShare } from '@/components/creator-profile-share'
import { ShowcaseCard } from '@/components/showcase-card'
import { SHOWCASE_CASES } from '@/lib/showcase'
import { getShowcaseCardData } from '@/lib/showcase-shared'
import { I18nProvider } from '@/lib/i18n/context'
import { getLocaleFromSearchParam } from '@/lib/i18n/config'
import { studioCopy, type StudioKey } from '@/lib/i18n/creator-studio-copy'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { FEATURED_CREATORS } from '@/lib/creator-directory'

type Props = { params: Promise<{ username: string }>; searchParams: Promise<{ lang?: string }> }
const SITE_URL = 'https://www.openagentskill.com'

const loadCreator = cache(async (username: string) => {
  const supabase = createPublicClient({ requestTimeoutMs: 7_000 })
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,username,display_name,bio,avatar_url,website,github_username,github_verified_at,x_username,x_verified_at,updated_at')
    .eq('username', username.toLowerCase())
    .maybeSingle()
  if (profileError) throw new Error('Creator profile temporarily unavailable')
  if (!profile) return null

  const { data: claims, error: claimsError } = await supabase
    .from('skill_claims')
    .select('skill_slug,verification_tier,verification_method,verified_at')
    .eq('user_id', profile.id)
    .eq('status', 'approved')
  if (claimsError) throw new Error('Creator ownership temporarily unavailable')
  const slugs = (claims || []).map((claim) => claim.skill_slug)
  const [{ data: skills, error: skillsError }, { data: events }, { data: outcomes }] = await Promise.all([
    slugs.length
      ? supabase.from('skills').select('slug,name,description,category,github_repo,repository,github_stars,version,license,license_status,last_synced_at,source_commit_sha').in('slug', slugs).or(PUBLIC_SKILL_FILTER).order('github_stars', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    slugs.length
      ? supabase.from('skill_event_stats').select('skill_slug,views,install_starts,install_successes').in('skill_slug', slugs)
      : Promise.resolve({ data: [] }),
    slugs.length
      ? supabase.from('agent_outcome_stats').select('skill_slug,verified_installs,successful_outcomes').in('skill_slug', slugs)
      : Promise.resolve({ data: [] }),
  ])
  if (skillsError) throw new Error('Creator skills temporarily unavailable')
  return { profile, claims: claims || [], skills: skills || [], events: events || [], outcomes: outcomes || [] }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const creator = await loadCreator(username)
  if (!creator) return { title: 'Creator not found', robots: { index: false, follow: false } }
  const name = creator.profile.display_name || creator.profile.username
  const description = creator.profile.bio || `Explore ${creator.skills.length} claimed Agent Skills by ${name}, their work, and source information.`
  const canonical = `${SITE_URL}/creators/${creator.profile.username}`
  return {
    title: `${name} — Agent Skill Creator`,
    description,
    alternates: { canonical },
    robots: { index: creator.skills.length > 0, follow: true },
    openGraph: { title: `${name} — Agent Skill Creator`, description, url: canonical, type: 'profile' },
  }
}

function compact(value: unknown) {
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0))
}

export default async function CreatorPage({ params, searchParams }: Props) {
  const { username } = await params
  const creator = await loadCreator(username)
  if (!creator) notFound()
  const { profile, claims, skills, events, outcomes } = creator
  const locale = getLocaleFromSearchParam((await searchParams).lang) || 'en'
  const t = (key: StudioKey) => studioCopy(locale, key)
  const href = (path: string) => getLocalizedNavigationHref(path, locale)
  const website = publicWebsite(profile.website)
  const skillSlugs = new Set(skills.map(skill => skill.slug))
  const works = SHOWCASE_CASES.filter(item => skillSlugs.has(item.skillSlug))
  const sourceOwner = profile.github_verified_at && FEATURED_CREATORS.find(item => item.owner.toLowerCase() === profile.github_username?.toLowerCase())
  const stars = repositoryStars(skills)
  const verifiedInstalls = outcomes.reduce((sum, row) => sum + Number(row.verified_installs || 0), 0)
  const name = profile.display_name || profile.username
  const claimMap = new Map(claims.map((claim) => [claim.skill_slug, claim]))
  const eventMap = new Map(events.map((event) => [event.skill_slug, event]))
  const outcomeMap = new Map(outcomes.map((outcome) => [outcome.skill_slug, outcome]))
  const isOfficial = claims.some((claim) => claim.verification_tier === 'official')
  const sameAs = [
    website,
    profile.github_verified_at && profile.github_username ? `https://github.com/${profile.github_username}` : null,
    profile.x_verified_at && profile.x_username ? `https://x.com/${profile.x_username}` : null,
  ].filter(Boolean)
  const creatorLd = {
    '@type': 'Person',
    '@id': `${SITE_URL}/creators/${profile.username}#creator`,
    name,
    url: `${SITE_URL}/creators/${profile.username}`,
    image: profile.avatar_url || undefined,
    sameAs,
    description: profile.bio || undefined,
    knowsAbout: ['AI agents', 'Agent Skills', ...Array.from(new Set(skills.map((skill) => skill.category)))],
  }
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${SITE_URL}/creators/${profile.username}#profile`,
    url: `${SITE_URL}/creators/${profile.username}`,
    dateModified: profile.updated_at || undefined,
    mainEntity: creatorLd,
    hasPart: skills.slice(0, 20).map((skill) => ({
      '@type': 'SoftwareSourceCode',
      name: skill.name,
      url: `${SITE_URL}/skills/${skill.slug}`,
      author: { '@id': creatorLd['@id'] },
    })),
  }
  const listLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Agent Skills by ${name}`,
    numberOfItems: skills.length,
    itemListElement: skills.map((skill, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/skills/${skill.slug}`,
      name: skill.name,
    })),
  }

  return <I18nProvider initialLocale={locale}><MarketingPageShell><div className="mx-auto min-h-screen max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeCreatorSchema(jsonLd) }} />
    {skills.length ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeCreatorSchema(listLd) }} /> : null}
    <nav className="mb-12 text-sm text-secondary"><Link href={href('/creators')}>← Skill Creators</Link></nav>
    <header className="grid gap-8 border-b border-border pb-12 sm:grid-cols-[auto_1fr] sm:items-start">
      {profile.avatar_url ? <Image src={profile.avatar_url} alt="" width={96} height={96} className="size-24 rounded-full border border-border object-cover" /> : <div className="grid size-24 place-items-center rounded-full bg-[#006b4f]/10 font-display text-4xl text-[#006b4f]">{name.slice(0, 1).toUpperCase()}</div>}
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-secondary">
          {skills.length > 0 && <BadgeCheck className="size-4 text-emerald-700" />} {isOfficial ? t('official') : skills.length ? t('ownership') : t('profile')}
        </p>
        <h1 className="mt-3 break-words font-display text-5xl font-normal tracking-tight sm:text-7xl">{name}</h1>
        {profile.bio ? <p className="mt-4 max-w-2xl whitespace-pre-wrap break-words text-lg leading-7 text-secondary">{profile.bio}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          {website ? <a className="inline-flex items-center gap-2 border border-border px-3 py-2 hover:border-foreground" href={website} rel="me ugc nofollow">{t('website')} <ExternalLink className="size-3" /></a> : null}
          {profile.github_username ? <a className="inline-flex items-center gap-2 border border-border px-3 py-2 hover:border-foreground" href={`https://github.com/${profile.github_username}`} rel={profile.github_verified_at ? 'me' : undefined}>GitHub @{profile.github_username}{profile.github_verified_at ? <BadgeCheck className="size-3 text-emerald-700" /> : null}</a> : null}
          {profile.x_username ? <a className="border border-border px-3 py-2 hover:border-foreground" href={`https://x.com/${profile.x_username}`}>X @{profile.x_username}{profile.x_verified_at ? ' · verified' : ''}</a> : null}
        </div>
        <div className="mt-6"><CreatorProfileShare username={profile.username} locale={locale} /></div>
        {skills.length > 0 && <p className="mt-4 text-xs leading-5 text-secondary">{t('evidence')}</p>}
        {sourceOwner && <Link className="mt-3 inline-block text-xs underline underline-offset-4" href={href(`/creators/github/${sourceOwner.owner.toLowerCase()}`)}>GitHub source profile ↗</Link>}
      </div>
    </header>

    {skills.length > 0 && <section className="flex flex-wrap gap-x-12 gap-y-5 border-b border-border py-7" aria-label="Creator proof">
      <div><span className="font-display text-3xl">{skills.length}</span><span className="ml-3 text-sm text-secondary">{t('claimed')}</span></div>
      {stars > 0 && <div><span className="font-display text-3xl">{compact(stars)}</span><span className="ml-3 text-sm text-secondary">{t('stars')}</span></div>}
      {verifiedInstalls > 0 && <div><span className="font-display text-3xl">{compact(verifiedInstalls)}</span><span className="ml-3 text-sm text-secondary">{t('installs')}</span></div>}
    </section>}
    {skills.length > 0 && <section className="py-12">
      <h2 className="font-display text-3xl">{t('popular')}</h2><p className="mt-2 text-sm text-secondary">{t('popularNote')}</p>
      <div className="mt-7 grid gap-6 md:grid-cols-3">
        {skills.slice(0, 3).map(skill => <Link key={skill.slug} href={href(`/skills/${skill.slug}`)} className="group min-w-0 border-t-2 border-[#006b4f] bg-white/60 p-6 focus-visible:outline-2 focus-visible:outline-offset-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-secondary">{skill.category}</p>
          <h3 className="mt-5 break-words font-display text-2xl group-hover:text-[#006b4f]">{skill.name} ↗</h3>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-secondary">{skill.description}</p>
        </Link>)}
      </div>
    </section>}
    {works.length > 0 && <section className="border-t border-border py-12">
      <h2 className="font-display text-3xl">{t('gallery')}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-secondary">{t('galleryNote')}</p>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{works.slice(0, 6).map(item => <ShowcaseCard key={item.slug} item={getShowcaseCardData(item)} />)}</div>
    </section>}

    <section className="mt-12">
      <div className="flex items-end justify-between gap-4">
        <div><p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">{t('source')}</p><h2 className="mt-2 font-display text-3xl">{t('allSkills')} ({skills.length})</h2></div>
        <Link href={href('/creators')} className="text-sm underline underline-offset-4">{t('allCreators')}</Link>
      </div>
      {skills.length ? <div className="mt-6 divide-y divide-border border border-border">
        {skills.map((skill) => {
          const claim = claimMap.get(skill.slug)
          const event = eventMap.get(skill.slug)
          const outcome = outcomeMap.get(skill.slug)
          return <Link key={skill.slug} href={`/skills/${skill.slug}`} className="grid gap-5 p-5 transition-colors hover:bg-muted/40 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-secondary">{skill.category} · {claim?.verification_tier || 'maintainer'} · ownership confirmed</p>
              <h3 className="mt-2 font-display text-2xl">{skill.name}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-secondary">{skill.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-secondary">
                <span className="inline-flex items-center gap-1 border border-border px-2 py-1"><GitCommitHorizontal className="size-3" /> {skill.source_commit_sha?.slice(0, 7) || 'sync pending'}</span>
                <span className="inline-flex items-center gap-1 border border-border px-2 py-1"><ShieldCheck className="size-3" /> {skill.license || 'Unknown'} · {skill.license_status || 'unknown'}</span>
                <span className="border border-border px-2 py-1">v{skill.version || 'not provided'}</span>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-5 text-right text-xs">
              <div><dt className="text-secondary">Stars</dt><dd className="mt-1 font-mono text-sm">{compact(skill.github_stars)}</dd></div>
              {Number(event?.install_starts) > 0 && <div><dt className="text-secondary">Starts</dt><dd className="mt-1 font-mono text-sm">{compact(event?.install_starts)}</dd></div>}
              {Number(outcome?.verified_installs) > 0 && <div><dt className="text-secondary">Installs</dt><dd className="mt-1 font-mono text-sm">{compact(outcome?.verified_installs)}</dd></div>}
            </dl>
          </Link>
        })}
      </div> : <div className="mt-6 border border-border p-8 text-sm text-secondary">This profile has no verified Skill ownership yet and is not eligible for search indexing.</div>}
    </section>
  </div></MarketingPageShell></I18nProvider>
}
