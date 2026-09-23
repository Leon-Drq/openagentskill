import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, Circle, ExternalLink, GitCommitHorizontal, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CreatorIdentityConnections } from '@/components/creator-identity-connections'
import { CreatorBatchClaim } from '@/components/creator-batch-claim'
import { CreatorActivationTracker } from '@/components/creator-activation-tracker'
import { MarketingPageShell } from '@/components/marketing-page'
import type { Metadata } from 'next'
import { CreatorProfileEditor } from '@/components/creator-profile-editor'
import { CreatorProfileShare } from '@/components/creator-profile-share'
import { creatorDateWindow, readCreatorDailyPages } from '@/lib/creator-profile'
import { studioCopy, type StudioKey } from '@/lib/i18n/creator-studio-copy'
import { getLocaleFromSearchParam } from '@/lib/i18n/config'
import { I18nProvider } from '@/lib/i18n/context'
import { SHOWCASE_CASES } from '@/lib/showcase'
import { getShowcaseCardData } from '@/lib/showcase-shared'
import { ShowcaseCard } from '@/components/showcase-card'
import { updateCreatorProfile } from './actions'

export const metadata: Metadata = { title: 'Creator Center', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

function metric(value: unknown) {
  return Number(value || 0).toLocaleString('en-US')
}

function shortSha(value: string | null | undefined) {
  return value ? value.slice(0, 7) : 'not tracked'
}

function dateLabel(value: string | null | undefined) {
  if (!value) return 'Not synced yet'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export default async function CreatorDashboard({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; connected?: string; error?: string; tab?: string; lang?: string }>
}) {
  const params = await searchParams
  const locale = getLocaleFromSearchParam(params.lang) || 'en'
  const t = (key: StudioKey) => studioCopy(locale, key)
  const tabs = ['overview', 'profile', 'skills', 'works', 'analytics'] as const
  const tab = tabs.find(value => value === params.tab) || 'overview'
  const tabHref = (value: string) => `/creator?tab=${value}&lang=${locale}`
  const dateWindow = creatorDateWindow()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(tabHref(tab))}`)

  const [{ data: profile }, { data: claims }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('skill_claims')
      .select('id,skill_slug,status,github_username,x_username,verification_method,verification_tier,verified_at,challenge_expires_at,created_at,updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
  ])

  const verifiedGitHubUsername = profile?.github_verified_at && profile?.github_username
    ? String(profile.github_username).toLowerCase()
    : null
  const { count: matchingGitHubSkillCount } = verifiedGitHubUsername
    ? await supabase
        .from('skills')
        .select('slug', { count: 'exact', head: true })
        .or('ai_review_approved.eq.true,listing_status.in.(owner_published,static_checked)')
        .ilike('github_repo', `${verifiedGitHubUsername}/%`)
    : { count: 0 }

  const approvedSlugs = (claims || []).filter((claim) => claim.status === 'approved').map((claim) => claim.skill_slug)
  const [{ data: skills }, { data: events }, { data: outcomes }, { data: dailyEvents }, { data: versions }] = await Promise.all([
    approvedSlugs.length
      ? supabase.from('skills').select('slug,name,category,repository,github_repo,version,license,license_source,license_status,source_commit_sha,source_sync_status,last_synced_at').in('slug', approvedSlugs)
      : Promise.resolve({ data: [] }),
    approvedSlugs.length
      ? supabase.from('skill_event_stats').select('*').in('skill_slug', approvedSlugs)
      : Promise.resolve({ data: [] }),
    approvedSlugs.length
      ? supabase.from('agent_outcome_stats').select('*').in('skill_slug', approvedSlugs)
      : Promise.resolve({ data: [] }),
    approvedSlugs.length
      ? readCreatorDailyPages(offset => supabase.from('skill_events_daily').select('skill_slug,event_date,views,install_starts,install_successes,outcome_successes').in('skill_slug', approvedSlugs).gte('event_date', dateWindow.start).lte('event_date', dateWindow.end).order('event_date', { ascending: false }).order('skill_slug').range(offset, offset + 999))
      : Promise.resolve({ data: [] }),
    approvedSlugs.length
      ? supabase.from('skill_versions').select('skill_slug,source_content_hash,detected_at').in('skill_slug', approvedSlugs).order('detected_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const eventMap = new Map((events || []).map((row) => [row.skill_slug, row]))
  const outcomeMap = new Map((outcomes || []).map((row) => [row.skill_slug, row]))
  const versionCounts = new Map<string, number>()
  for (const row of versions || []) versionCounts.set(row.skill_slug, (versionCounts.get(row.skill_slug) || 0) + 1)
  const approvedMatchingGitHubCount = verifiedGitHubUsername
    ? (skills || []).filter((skill) => String(skill.github_repo || '').toLowerCase().startsWith(`${verifiedGitHubUsername}/`)).length
    : 0
  const totals = (skills || []).reduce(
    (sum, skill) => {
      const event = eventMap.get(skill.slug)
      const outcome = outcomeMap.get(skill.slug)
      sum.views += Number(event?.views || 0)
      sum.installStarts += Number(event?.install_starts ?? 0)
      sum.verifiedInstalls += Number(outcome?.verified_installs ?? 0)
      sum.successes += Number(outcome?.successful_outcomes ?? 0)
      return sum
    },
    { views: 0, installStarts: 0, verifiedInstalls: 0, successes: 0 }
  )
  const last30 = (dailyEvents || []).reduce((sum, row) => ({
    views: sum.views + Number(row.views || 0),
    starts: sum.starts + Number(row.install_starts || 0),
    installs: sum.installs + Number(row.install_successes || 0),
    outcomes: sum.outcomes + Number(row.outcome_successes || 0),
  }), { views: 0, starts: 0, installs: 0, outcomes: 0 })
  const username = profile?.username || verifiedGitHubUsername || ''
  const works = SHOWCASE_CASES.filter(item => approvedSlugs.includes(item.skillSlug))
  const dailyUnavailable = dailyEvents === null
  const analyticsAvailable = events !== null && outcomes !== null
  const hasVerifiedClaim = approvedSlugs.length > 0
  const steps = [
    { label: 'Account', detail: user.email || 'Signed in', done: true },
    { label: 'Identity', detail: profile?.github_verified_at ? 'GitHub OAuth verified' : 'Repository proof available', done: Boolean(profile?.github_verified_at) },
    { label: 'Ownership', detail: hasVerifiedClaim ? `${approvedSlugs.length} verified skill${approvedSlugs.length === 1 ? '' : 's'}` : 'Claim your first listing', done: hasVerifiedClaim },
    { label: 'Outcomes', detail: totals.verifiedInstalls ? `${metric(totals.verifiedInstalls)} verified installs` : 'Waiting for first receipt', done: totals.verifiedInstalls > 0 },
  ]

  return (
    <I18nProvider initialLocale={locale}><MarketingPageShell><div className="mx-auto min-h-screen max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
      <CreatorActivationTracker
        githubConnected={params.connected === 'github'}
        profilePublished={params.saved === '1'}
      />
      <header className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">OpenAgentSkill / Creators</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[0.98] sm:text-6xl">{t('center')}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-secondary">{t('intro')}</p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link href="/submit" className="bg-foreground px-4 py-3 text-sm font-semibold text-background">Add a skill</Link>
          {profile?.username ? <Link className="inline-flex items-center gap-2 border border-border px-4 py-3 text-sm hover:border-foreground" href={`/creators/${profile.username}`}>Public profile <ExternalLink className="size-3.5" /></Link> : null}
        </div>
      </header>

      <nav aria-label={t('center')} className="my-8 flex flex-wrap gap-2 border-b border-border pb-4">
        {tabs.map(value => <Link key={value} href={tabHref(value)} aria-current={tab === value ? 'page' : undefined} className={`min-h-11 px-4 py-3 text-sm ${tab === value ? 'bg-[#006b4f] text-white' : 'hover:bg-muted'}`}>{t(value === 'profile' ? 'edit' : value)}</Link>)}
      </nav>
      {params.saved ? <p role="status" className="mt-6 border border-emerald-600/40 bg-emerald-500/5 p-3 text-sm">Creator profile saved.</p> : null}
      {params.connected === 'github' ? <p className="mt-6 border border-emerald-600/40 bg-emerald-500/5 p-3 text-sm">GitHub identity connected and verified.</p> : null}
      {params.error ? <p role="alert" className="mt-6 border border-red-600/40 bg-red-500/5 p-3 text-sm">{params.error === 'handle-taken' ? 'That profile handle is already in use. Choose another.' : params.error === 'handle-locked' ? t('stable') : 'Could not save. Check the fields and connection, then try again.'}</p> : null}

      {tab === 'overview' && <section className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4" aria-label="Ownership progress">
        {steps.map((step, index) => (
          <div key={step.label} className="bg-background p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary">0{index + 1}</span>
              {step.done ? <CheckCircle2 className="size-4 text-emerald-700" /> : <Circle className="size-4 text-secondary" />}
            </div>
            <p className="mt-6 font-semibold">{step.label}</p>
            <p className="mt-1 text-xs text-secondary">{step.detail}</p>
          </div>
        ))}
      </section>}

      {(tab === 'overview' || tab === 'analytics') && <section className="mt-10 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4" aria-label="Creator analytics">
        {[
          ['Views', totals.views, dailyUnavailable ? '30-day total temporarily unavailable' : `${metric(last30.views)} in 30 UTC dates`],
          ['Install starts', totals.installStarts, dailyUnavailable ? '30-day total temporarily unavailable' : `${metric(last30.starts)} in 30 UTC dates`],
          ['Verified installs', totals.verifiedInstalls, 'Receipt-confirmed · all time'],
          ['Successful outcomes', totals.successes, 'Reported successful outcomes · all time'],
        ].map(([label, value, note]) => (
          <div key={String(label)} className="bg-background p-5">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-secondary">{label}</p>
            <p className="mt-3 font-display text-3xl">{analyticsAvailable ? metric(value) : '—'}</p>
            <p className="mt-2 text-xs text-secondary">{analyticsAvailable ? note : 'Analytics temporarily unavailable'}</p>
          </div>
        ))}
      </section>}

      {(tab === 'overview' || tab === 'skills') && <section className="mt-10 grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-8">
          {verifiedGitHubUsername ? (
            <CreatorBatchClaim
              githubUsername={verifiedGitHubUsername}
              availableCount={Math.max(0, Number(matchingGitHubSkillCount || 0) - approvedMatchingGitHubCount)}
            />
          ) : null}
          <CreatorIdentityConnections
            githubUsername={profile?.github_username}
            githubVerifiedAt={profile?.github_verified_at}
            xUsername={profile?.x_username}
            githubOAuthEnabled={process.env.NEXT_PUBLIC_GITHUB_OAUTH_ENABLED === 'true'}
            githubAppInstallUrl={process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL || null}
          />

        </div>

        <section className="border border-border" aria-labelledby="claimed-skills-heading">
          <div className="flex items-center justify-between border-b border-border p-6">
            <div><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-secondary">Provenance ledger</p><h2 id="claimed-skills-heading" className="mt-2 font-display text-2xl">Claimed skills</h2></div>
            <Link href="/skills" className="text-sm underline underline-offset-4">Find listing</Link>
          </div>
          {(claims || []).length ? (
            <div className="divide-y divide-border">
              {(claims || []).map((claim) => {
                const skill = (skills || []).find((item) => item.slug === claim.skill_slug)
                const event = eventMap.get(claim.skill_slug)
                const outcome = outcomeMap.get(claim.skill_slug)
                return <article key={claim.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={`/skills/${claim.skill_slug}`} className="font-semibold hover:underline">{skill?.name || claim.skill_slug}</Link>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-secondary">{claim.verification_tier || 'maintainer'} · {claim.verification_method?.replaceAll('_', ' ')}</p>
                    </div>
                    <span className={`border px-2.5 py-1 font-mono text-[10px] uppercase ${claim.status === 'approved' ? 'border-emerald-700/40 text-emerald-700' : 'border-border text-secondary'}`}>{claim.status}</span>
                  </div>
                  {claim.status === 'approved' && skill ? <>
                    <div className="mt-4 grid grid-cols-4 gap-3 border-y border-border py-3 text-xs text-secondary">
                      <span>Views <b className="block text-base text-foreground">{metric(event?.views)}</b></span>
                      <span>Starts <b className="block text-base text-foreground">{metric(event?.install_starts)}</b></span>
                      <span>Installs <b className="block text-base text-foreground">{metric(outcome?.verified_installs)}</b></span>
                      <span>Success <b className="block text-base text-foreground">{metric(outcome?.successful_outcomes)}</b></span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="border border-border p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold"><GitCommitHorizontal className="size-3.5" /> Source sync</p>
                        <p className="mt-2 font-mono text-xs">{shortSha(skill.source_commit_sha)} · {versionCounts.get(skill.slug) || 0} snapshot{versionCounts.get(skill.slug) === 1 ? '' : 's'}</p>
                        <p className="mt-1 text-[11px] text-secondary">{dateLabel(skill.last_synced_at)} · {skill.source_sync_status || 'untracked'}</p>
                      </div>
                      <div className="border border-border p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="size-3.5" /> License evidence</p>
                        <p className="mt-2 font-mono text-xs">{skill.license || 'Unknown'}</p>
                        <p className="mt-1 text-[11px] text-secondary">{skill.license_status || 'unknown'} · {(skill.license_source || 'unknown').replaceAll('_', ' ')}</p>
                      </div>
                    </div>
                  </> : <p className="mt-3 text-sm leading-6 text-secondary">Open the Skill page to generate or refresh the repository verification challenge. Approval is automatic after the file is detected.</p>}
                </article>
              })}
            </div>
          ) : <div className="p-8 text-sm leading-6 text-secondary">No ownership claims yet. Open one of your Skill pages and choose “Claim this skill” to generate a verifiable repository challenge.</div>}
        </section>
      </section>}
      {tab === 'profile' && <section className="mt-10">
        <h2 className="mb-6 font-display text-3xl">{t('edit')}</h2>
        <CreatorProfileEditor locale={locale} action={updateCreatorProfile} handleLocked={Boolean(profile?.username)} githubVerified={Boolean(profile?.github_verified_at)} xVerified={Boolean(profile?.x_verified_at)}
          initial={{ username, display_name: profile?.display_name || '', bio: profile?.bio || '', website: profile?.website || '', github_username: profile?.github_username || '', x_username: profile?.x_username || '' }} />
      </section>}
      {tab === 'overview' && <section className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t border-border py-8">
        <div><h2 className="font-display text-2xl">{t('profile')}</h2><p className="mt-2 text-sm text-secondary">{t('privacy')}</p></div>
        <Link href={tabHref('profile')} className="border border-border px-4 py-3 text-sm">{t('edit')}</Link>
        {profile?.username && <CreatorProfileShare username={profile.username} locale={locale} />}
      </section>}
      {tab === 'works' && <section className="mt-10">
        <h2 className="font-display text-3xl">{t('gallery')}</h2><p className="mt-3 text-sm text-secondary">{t('galleryNote')}</p>
        {works.length ? <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{works.slice(0, 12).map(item => <ShowcaseCard key={item.slug} item={getShowcaseCardData(item)} />)}</div> : <p className="my-8 border border-border p-6 text-secondary">{t('emptyWorks')}</p>}
        <Link href="/contact" className="mt-6 inline-block border border-border px-4 py-3 text-sm">Submit a Gallery example →</Link>
      </section>}
      {tab === 'analytics' && <p className="mt-6 max-w-3xl text-sm leading-7 text-secondary">Views and install starts are recorded events, not unique people. Confirmed installs and outcomes are separate receipt/report totals, not a conversion funnel. The 30-day window uses UTC dates ({dateWindow.start}–{dateWindow.end}). Missing analytics are not evidence of unsuccessful usage.</p>}
    </div></MarketingPageShell></I18nProvider>
  )
}
