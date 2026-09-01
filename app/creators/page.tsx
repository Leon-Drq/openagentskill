import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { BadgeCheck } from 'lucide-react'
import { createPublicClient } from '@/lib/supabase/public'
import { MarketingPageShell } from '@/components/marketing-page'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Verified Agent Skill Creators',
  description: 'Discover verified open-source Agent Skill maintainers, their GitHub-backed listings, licenses, versions, and real install evidence.',
  alternates: { canonical: 'https://www.openagentskill.com/creators' },
  openGraph: {
    title: 'Verified Agent Skill Creators | OpenAgentSkill',
    description: 'GitHub-backed creator ownership and open-source Agent Skills with provenance.',
    url: 'https://www.openagentskill.com/creators',
  },
}

const loadCreators = unstable_cache(async () => {
  const supabase = createPublicClient({ requestTimeoutMs: 7_000 })
  const { data: claims } = await supabase
    .from('skill_claims')
    .select('user_id,skill_slug,verification_tier')
    .eq('status', 'approved')
    .limit(1000)
  if (!claims?.length) return []

  const userIds = Array.from(new Set(claims.map((claim) => claim.user_id)))
  const slugs = Array.from(new Set(claims.map((claim) => claim.skill_slug)))
  const [{ data: profiles }, { data: skills }, { data: outcomes }] = await Promise.all([
    supabase.from('profiles').select('id,username,display_name,bio,avatar_url,github_username,github_verified_at,x_username').in('id', userIds).not('username', 'is', null),
    supabase.from('skills').select('slug,name,github_stars').in('slug', slugs).eq('ai_review_approved', true),
    supabase.from('agent_outcome_stats').select('skill_slug,verified_installs').in('skill_slug', slugs),
  ])
  const skillMap = new Map((skills || []).map((skill) => [skill.slug, skill]))
  const outcomeMap = new Map((outcomes || []).map((row) => [row.skill_slug, row]))

  return (profiles || []).map((profile) => {
    const profileClaims = claims.filter((claim) => claim.user_id === profile.id)
    const profileSkills = profileClaims.map((claim) => skillMap.get(claim.skill_slug)).filter(Boolean)
    return {
      ...profile,
      skillCount: profileSkills.length,
      stars: profileSkills.reduce((sum, skill) => sum + Number(skill?.github_stars || 0), 0),
      verifiedInstalls: profileClaims.reduce((sum, claim) => sum + Number(outcomeMap.get(claim.skill_slug)?.verified_installs || 0), 0),
      official: profileClaims.some((claim) => claim.verification_tier === 'official'),
      topSkills: profileSkills.slice(0, 3).map((skill) => skill?.name).filter(Boolean),
    }
  }).filter((creator) => creator.skillCount > 0).sort((a, b) => b.stars - a.stars || b.verifiedInstalls - a.verifiedInstalls)
}, ['verified-creator-directory-v1'], { revalidate: 3600, tags: ['creator-directory'] })

function compact(value: number) {
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export default async function CreatorsPage() {
  const creators = await loadCreators()
  const totalSkills = creators.reduce((sum, creator) => sum + creator.skillCount, 0)

  return <MarketingPageShell><div className="mx-auto min-h-screen max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
    <header className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Creator registry · provenance verified</p>
        <h1 className="mt-4 max-w-4xl font-display text-5xl font-semibold leading-[0.96] sm:text-7xl">The people behind open-source Agent Skills.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-secondary">Every profile below controls at least one listed repository. Explore source-backed versions, license evidence, adoption, and verified install outcomes.</p>
      </div>
      <Link href="/creator" className="bg-foreground px-5 py-3 text-sm font-semibold text-background">Claim your skills</Link>
    </header>

    <section className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-3">
      <div className="bg-background p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary">Verified creators</p><p className="mt-3 font-display text-3xl">{creators.length.toLocaleString()}</p></div>
      <div className="bg-background p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary">Owned skills</p><p className="mt-3 font-display text-3xl">{totalSkills.toLocaleString()}</p></div>
      <div className="bg-background p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary">Proof standard</p><p className="mt-3 font-display text-3xl">GitHub</p></div>
    </section>

    <section className="mt-12" aria-labelledby="creator-list-heading">
      <div className="flex items-end justify-between gap-4"><h2 id="creator-list-heading" className="font-display text-3xl">Verified maintainers</h2><p className="font-mono text-xs text-secondary">Ranked by repository adoption</p></div>
      {creators.length ? <div className="mt-6 divide-y divide-border border border-border">
        {creators.map((creator, index) => <Link key={creator.id} href={`/creators/${creator.username}`} className="grid gap-5 p-5 transition-colors hover:bg-muted/40 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <span className="font-mono text-xs text-secondary">{String(index + 1).padStart(2, '0')}</span>
          <div className="flex min-w-0 items-center gap-4">
            {creator.avatar_url ? <Image src={creator.avatar_url} alt="" width={48} height={48} className="size-12 border border-border object-cover" /> : <div className="grid size-12 shrink-0 place-items-center border border-border font-display text-xl">{(creator.display_name || creator.username).slice(0, 1).toUpperCase()}</div>}
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate font-semibold">{creator.display_name || creator.username}<BadgeCheck className="size-4 shrink-0 text-emerald-700" /></p>
              <p className="mt-1 truncate text-xs text-secondary">{creator.topSkills.join(' · ') || creator.bio || `@${creator.github_username || creator.username}`}</p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-6 text-right text-xs">
            <div><dt className="text-secondary">Skills</dt><dd className="mt-1 font-mono text-sm">{creator.skillCount}</dd></div>
            <div><dt className="text-secondary">Stars</dt><dd className="mt-1 font-mono text-sm">{compact(creator.stars)}</dd></div>
            <div><dt className="text-secondary">Installs</dt><dd className="mt-1 font-mono text-sm">{compact(creator.verifiedInstalls)}</dd></div>
          </dl>
        </Link>)}
      </div> : <div className="mt-6 border border-border p-8 text-sm text-secondary">The verified creator registry is opening now. Claim the first repository-backed profile.</div>}
    </section>
  </div></MarketingPageShell>
}
