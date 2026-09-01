import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { BadgeCheck, ExternalLink, GitCommitHorizontal, ShieldCheck } from 'lucide-react'
import { createPublicClient } from '@/lib/supabase/public'
import { MarketingPageShell } from '@/components/marketing-page'

type Props = { params: Promise<{ username: string }> }
const SITE_URL = 'https://www.openagentskill.com'

const loadCreator = cache(async (username: string) => {
  const supabase = createPublicClient({ requestTimeoutMs: 7_000 })
  const { data: profile } = await supabase
    .from('profiles')
    .select('id,username,display_name,bio,avatar_url,website,github_username,github_verified_at,x_username,x_verified_at,updated_at')
    .eq('username', username.toLowerCase())
    .maybeSingle()
  if (!profile) return null

  const { data: claims } = await supabase
    .from('skill_claims')
    .select('skill_slug,verification_tier,verification_method,verified_at')
    .eq('user_id', profile.id)
    .eq('status', 'approved')
  const slugs = (claims || []).map((claim) => claim.skill_slug)
  const [{ data: skills }, { data: events }, { data: outcomes }] = await Promise.all([
    slugs.length
      ? supabase.from('skills').select('slug,name,description,category,github_stars,version,license,license_status,last_synced_at,source_commit_sha').in('slug', slugs).order('github_stars', { ascending: false })
      : Promise.resolve({ data: [] }),
    slugs.length
      ? supabase.from('skill_event_stats').select('skill_slug,views,install_starts,install_successes').in('skill_slug', slugs)
      : Promise.resolve({ data: [] }),
    slugs.length
      ? supabase.from('agent_outcome_stats').select('skill_slug,verified_installs,successful_outcomes').in('skill_slug', slugs)
      : Promise.resolve({ data: [] }),
  ])
  return { profile, claims: claims || [], skills: skills || [], events: events || [], outcomes: outcomes || [] }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const creator = await loadCreator(username)
  if (!creator) return { title: 'Creator not found', robots: { index: false, follow: false } }
  const name = creator.profile.display_name || creator.profile.username
  const description = creator.profile.bio || `${creator.skills.length} verified open-source Agent Skills by ${name}, with source, license, and install evidence.`
  const canonical = `${SITE_URL}/creators/${creator.profile.username}`
  return {
    title: `${name} — Verified Agent Skill Creator`,
    description,
    alternates: { canonical },
    robots: { index: creator.skills.length > 0, follow: true },
    openGraph: { title: `${name} — Agent Skill Creator`, description, url: canonical, type: 'profile' },
  }
}

function compact(value: unknown) {
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0))
}

export default async function CreatorPage({ params }: Props) {
  const { username } = await params
  const creator = await loadCreator(username)
  if (!creator) notFound()
  const { profile, claims, skills, events, outcomes } = creator
  const name = profile.display_name || profile.username
  const claimMap = new Map(claims.map((claim) => [claim.skill_slug, claim]))
  const eventMap = new Map(events.map((event) => [event.skill_slug, event]))
  const outcomeMap = new Map(outcomes.map((outcome) => [outcome.skill_slug, outcome]))
  const isOfficial = claims.some((claim) => claim.verification_tier === 'official')
  const sameAs = [
    profile.website,
    profile.github_verified_at && profile.github_username ? `https://github.com/${profile.github_username}` : null,
    profile.x_verified_at && profile.x_username ? `https://x.com/${profile.x_username}` : null,
  ].filter(Boolean)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_URL}/creators/${profile.username}#creator`,
    name,
    url: `${SITE_URL}/creators/${profile.username}`,
    image: profile.avatar_url || undefined,
    sameAs,
    description: profile.bio || undefined,
    knowsAbout: ['AI agents', 'Agent Skills', ...Array.from(new Set(skills.map((skill) => skill.category)))],
    mainEntityOfPage: `${SITE_URL}/creators/${profile.username}`,
  }
  const listLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Verified Agent Skills by ${name}`,
    numberOfItems: skills.length,
    itemListElement: skills.map((skill, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/skills/${skill.slug}`,
      name: skill.name,
    })),
  }

  return <MarketingPageShell><div className="mx-auto min-h-screen max-w-5xl px-5 py-12 sm:px-6 sm:py-16">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    {skills.length ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }} /> : null}
    <header className="grid gap-8 border-b border-border pb-10 sm:grid-cols-[auto_1fr] sm:items-start">
      {profile.avatar_url ? <Image src={profile.avatar_url} alt="" width={96} height={96} className="size-24 border border-border object-cover" /> : <div className="grid size-24 place-items-center border border-border font-display text-3xl">{name.slice(0, 1).toUpperCase()}</div>}
      <div>
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-secondary">
          <BadgeCheck className="size-4 text-emerald-700" /> {isOfficial ? 'Official publisher' : skills.length ? 'Verified maintainer' : 'Creator profile'}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold sm:text-6xl">{name}</h1>
        {profile.bio ? <p className="mt-4 max-w-2xl text-lg leading-7 text-secondary">{profile.bio}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          {profile.website ? <a className="inline-flex items-center gap-2 border border-border px-3 py-2 hover:border-foreground" href={profile.website} rel="me">Website <ExternalLink className="size-3" /></a> : null}
          {profile.github_username ? <a className="inline-flex items-center gap-2 border border-border px-3 py-2 hover:border-foreground" href={`https://github.com/${profile.github_username}`} rel={profile.github_verified_at ? 'me' : undefined}>GitHub @{profile.github_username}{profile.github_verified_at ? <BadgeCheck className="size-3 text-emerald-700" /> : null}</a> : null}
          {profile.x_username ? <a className="border border-border px-3 py-2 hover:border-foreground" href={`https://x.com/${profile.x_username}`}>X @{profile.x_username}{profile.x_verified_at ? ' · verified' : ''}</a> : null}
        </div>
      </div>
    </header>

    <section className="mt-10 grid gap-px border border-border bg-border sm:grid-cols-3" aria-label="Creator proof">
      <div className="bg-background p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary">Verified ownership</p><p className="mt-3 font-display text-3xl">{skills.length}</p></div>
      <div className="bg-background p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary">GitHub adoption</p><p className="mt-3 font-display text-3xl">{compact(skills.reduce((sum, skill) => sum + Number(skill.github_stars || 0), 0))}</p></div>
      <div className="bg-background p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary">Verified installs</p><p className="mt-3 font-display text-3xl">{compact(outcomes.reduce((sum, row) => sum + Number(row.verified_installs || 0), 0))}</p></div>
    </section>

    <section className="mt-12">
      <div className="flex items-end justify-between gap-4">
        <div><p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Public provenance</p><h2 className="mt-2 font-display text-3xl">Verified skills ({skills.length})</h2></div>
        <Link href="/creators" className="text-sm underline underline-offset-4">All creators</Link>
      </div>
      {skills.length ? <div className="mt-6 divide-y divide-border border border-border">
        {skills.map((skill) => {
          const claim = claimMap.get(skill.slug)
          const event = eventMap.get(skill.slug)
          const outcome = outcomeMap.get(skill.slug)
          return <Link key={skill.slug} href={`/skills/${skill.slug}`} className="grid gap-5 p-5 transition-colors hover:bg-muted/40 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-secondary">{skill.category} · {claim?.verification_tier || 'maintainer'} verified</p>
              <h3 className="mt-2 font-display text-2xl">{skill.name}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-secondary">{skill.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-secondary">
                <span className="inline-flex items-center gap-1 border border-border px-2 py-1"><GitCommitHorizontal className="size-3" /> {skill.source_commit_sha?.slice(0, 7) || 'sync pending'}</span>
                <span className="inline-flex items-center gap-1 border border-border px-2 py-1"><ShieldCheck className="size-3" /> {skill.license || 'Unknown'} · {skill.license_status || 'unknown'}</span>
                <span className="border border-border px-2 py-1">v{skill.version || '1.0.0'}</span>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-5 text-right text-xs">
              <div><dt className="text-secondary">Stars</dt><dd className="mt-1 font-mono text-sm">{compact(skill.github_stars)}</dd></div>
              <div><dt className="text-secondary">Starts</dt><dd className="mt-1 font-mono text-sm">{compact(event?.install_starts)}</dd></div>
              <div><dt className="text-secondary">Installs</dt><dd className="mt-1 font-mono text-sm">{compact(outcome?.verified_installs)}</dd></div>
            </dl>
          </Link>
        })}
      </div> : <div className="mt-6 border border-border p-8 text-sm text-secondary">This profile has no verified Skill ownership yet and is not eligible for search indexing.</div>}
    </section>
  </div></MarketingPageShell>
}
