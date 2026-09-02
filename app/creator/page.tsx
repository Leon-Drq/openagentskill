import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, Circle, ExternalLink, GitCommitHorizontal, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CreatorIdentityConnections } from '@/components/creator-identity-connections'
import { CreatorActivationTracker } from '@/components/creator-activation-tracker'
import { MarketingPageShell } from '@/components/marketing-page'
import { updateCreatorProfile } from './actions'

export const dynamic = 'force-dynamic'

function metric(value: unknown) {
  return Number(value || 0).toLocaleString('en-US')
}

function percent(numerator: number, denominator: number) {
  return denominator > 0 ? `${Math.round((numerator / denominator) * 100)}%` : '—'
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
  searchParams: Promise<{ saved?: string; connected?: string; error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/creator')

  const [{ data: profile }, { data: claims }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('skill_claims')
      .select('id,skill_slug,status,github_username,x_username,verification_method,verification_tier,verified_at,challenge_expires_at,created_at,updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
  ])

  const approvedSlugs = (claims || []).filter((claim) => claim.status === 'approved').map((claim) => claim.skill_slug)
  const [{ data: skills }, { data: events }, { data: outcomes }, { data: dailyEvents }, { data: versions }] = await Promise.all([
    approvedSlugs.length
      ? supabase.from('skills').select('slug,name,category,repository,version,license,license_source,license_status,source_commit_sha,source_sync_status,last_synced_at').in('slug', approvedSlugs)
      : Promise.resolve({ data: [] }),
    approvedSlugs.length
      ? supabase.from('skill_event_stats').select('*').in('skill_slug', approvedSlugs)
      : Promise.resolve({ data: [] }),
    approvedSlugs.length
      ? supabase.from('agent_outcome_stats').select('*').in('skill_slug', approvedSlugs)
      : Promise.resolve({ data: [] }),
    approvedSlugs.length
      ? supabase.from('skill_events_daily').select('skill_slug,event_date,views,install_starts,install_successes,outcome_successes').in('skill_slug', approvedSlugs).order('event_date', { ascending: false }).limit(Math.max(30, approvedSlugs.length * 31))
      : Promise.resolve({ data: [] }),
    approvedSlugs.length
      ? supabase.from('skill_versions').select('skill_slug,source_content_hash,detected_at').in('skill_slug', approvedSlugs).order('detected_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const eventMap = new Map((events || []).map((row) => [row.skill_slug, row]))
  const outcomeMap = new Map((outcomes || []).map((row) => [row.skill_slug, row]))
  const versionCounts = new Map<string, number>()
  for (const row of versions || []) versionCounts.set(row.skill_slug, (versionCounts.get(row.skill_slug) || 0) + 1)
  const totals = (skills || []).reduce(
    (sum, skill) => {
      const event = eventMap.get(skill.slug)
      const outcome = outcomeMap.get(skill.slug)
      sum.views += Number(event?.views || 0)
      sum.installStarts += Number(event?.install_starts || event?.install_copies || 0)
      sum.verifiedInstalls += Number(outcome?.verified_installs || event?.install_successes || 0)
      sum.successes += Number(outcome?.successful_outcomes || event?.outcome_successes || 0)
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
  const username = profile?.username || user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'creator'
  const hasVerifiedClaim = approvedSlugs.length > 0
  const steps = [
    { label: 'Account', detail: user.email || 'Signed in', done: true },
    { label: 'Identity', detail: profile?.github_verified_at ? 'GitHub OAuth verified' : 'Repository proof available', done: Boolean(profile?.github_verified_at) },
    { label: 'Ownership', detail: hasVerifiedClaim ? `${approvedSlugs.length} verified skill${approvedSlugs.length === 1 ? '' : 's'}` : 'Claim your first listing', done: hasVerifiedClaim },
    { label: 'Outcomes', detail: totals.verifiedInstalls ? `${metric(totals.verifiedInstalls)} verified installs` : 'Waiting for first receipt', done: totals.verifiedInstalls > 0 },
  ]

  return (
    <MarketingPageShell><div className="mx-auto min-h-screen max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
      <CreatorActivationTracker
        githubConnected={params.connected === 'github'}
        profilePublished={params.saved === '1'}
      />
      <header className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Creator ownership console</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[0.98] sm:text-6xl">Turn a GitHub repository into a verified creator asset.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-secondary">Claim provenance, keep source versions synchronized, publish license evidence, and see the path from discovery to a successful Agent outcome.</p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link href="/submit" className="bg-foreground px-4 py-3 text-sm font-semibold text-background">Add a skill</Link>
          {profile?.username ? <Link className="inline-flex items-center gap-2 border border-border px-4 py-3 text-sm hover:border-foreground" href={`/creators/${profile.username}`}>Public profile <ExternalLink className="size-3.5" /></Link> : null}
        </div>
      </header>

      {params.saved ? <p className="mt-6 border border-emerald-600/40 bg-emerald-500/5 p-3 text-sm">Creator profile saved.</p> : null}
      {params.connected === 'github' ? <p className="mt-6 border border-emerald-600/40 bg-emerald-500/5 p-3 text-sm">GitHub identity connected and verified.</p> : null}
      {params.error ? <p className="mt-6 border border-red-600/40 bg-red-500/5 p-3 text-sm">Could not complete that action. Check the fields or try repository verification.</p> : null}

      <section className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4" aria-label="Ownership progress">
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
      </section>

      <section className="mt-10 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4" aria-label="Creator analytics">
        {[
          ['Views', totals.views, `${metric(last30.views)} in 30 days`],
          ['Install starts', totals.installStarts, `${percent(totals.installStarts, totals.views)} from views`],
          ['Verified installs', totals.verifiedInstalls, `${percent(totals.verifiedInstalls, totals.installStarts)} completion`],
          ['Successful outcomes', totals.successes, `${percent(totals.successes, totals.verifiedInstalls)} post-install success`],
        ].map(([label, value, note]) => (
          <div key={String(label)} className="bg-background p-5">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-secondary">{label}</p>
            <p className="mt-3 font-display text-3xl">{metric(value)}</p>
            <p className="mt-2 text-xs text-secondary">{note}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-8">
          <CreatorIdentityConnections
            githubUsername={profile?.github_username}
            githubVerifiedAt={profile?.github_verified_at}
            xUsername={profile?.x_username}
            githubOAuthEnabled={process.env.NEXT_PUBLIC_GITHUB_OAUTH_ENABLED === 'true'}
            githubAppInstallUrl={process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL || null}
          />
          <form action={updateCreatorProfile} className="border border-border p-6">
            <h2 className="font-display text-2xl">Public creator record</h2>
            <p className="mt-2 text-sm leading-6 text-secondary">This page is crawlable only after a verified Skill claim. OAuth-verified handles cannot be overwritten by text fields.</p>
            <div className="mt-6 space-y-4">
              {[
                ['username', 'Public profile handle', username],
                ['display_name', 'Display name', profile?.display_name || ''],
                ['website', 'Website', profile?.website || ''],
                ['github_username', profile?.github_verified_at ? 'GitHub username · OAuth verified' : 'GitHub username', profile?.github_username || ''],
                ['x_username', 'X username · optional, self-reported', profile?.x_username || ''],
              ].map(([name, label, value]) => (
                <label key={name} className="block text-sm">
                  <span className="mb-1.5 block text-secondary">{label}</span>
                  <input name={name} defaultValue={value} readOnly={name === 'github_username' && Boolean(profile?.github_verified_at)} className="w-full border border-border bg-background px-3 py-2.5 outline-none focus:border-foreground read-only:bg-muted/40 read-only:text-secondary" />
                </label>
              ))}
              <label className="block text-sm">
                <span className="mb-1.5 block text-secondary">Bio</span>
                <textarea name="bio" rows={4} defaultValue={profile?.bio || ''} className="w-full border border-border bg-background px-3 py-2.5 outline-none focus:border-foreground" />
              </label>
              <button className="w-full bg-foreground px-4 py-3 font-semibold text-background">Save public profile</button>
            </div>
          </form>
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
                      <span>Starts <b className="block text-base text-foreground">{metric(event?.install_starts || event?.install_copies)}</b></span>
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
      </section>
    </div></MarketingPageShell>
  )
}
