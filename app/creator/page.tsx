import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateCreatorProfile } from './actions'

export const dynamic = 'force-dynamic'

function metric(value: unknown) {
  return Number(value || 0).toLocaleString('en-US')
}

export default async function CreatorDashboard({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/creator')

  const [{ data: profile }, { data: claims }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('skill_claims')
      .select('id,skill_slug,status,github_username,x_username,created_at,updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
  ])

  const approvedSlugs = (claims || []).filter((claim) => claim.status === 'approved').map((claim) => claim.skill_slug)
  const [{ data: skills }, { data: events }, { data: outcomes }] = await Promise.all([
    approvedSlugs.length
      ? supabase.from('skills').select('slug,name,category,repository').in('slug', approvedSlugs)
      : Promise.resolve({ data: [] }),
    approvedSlugs.length
      ? supabase.from('skill_event_stats').select('*').in('skill_slug', approvedSlugs)
      : Promise.resolve({ data: [] }),
    approvedSlugs.length
      ? supabase.from('agent_outcome_stats').select('*').in('skill_slug', approvedSlugs)
      : Promise.resolve({ data: [] }),
  ])

  const eventMap = new Map((events || []).map((row) => [row.skill_slug, row]))
  const outcomeMap = new Map((outcomes || []).map((row) => [row.skill_slug, row]))
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
  const username = profile?.username || user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'creator'

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-secondary">Creator Console</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">Own the listing. Prove the outcome.</h1>
          <p className="mt-3 max-w-2xl text-secondary">Bind an optional GitHub or X identity, claim skills, and measure the complete path from discovery to verified agent success.</p>
        </div>
        {profile?.username ? <Link className="border border-border px-4 py-2 text-sm hover:border-foreground" href={`/creators/${profile.username}`}>View public profile</Link> : null}
      </div>

      {params.saved ? <p className="mt-6 border border-emerald-600/40 bg-emerald-500/5 p-3 text-sm">Profile saved.</p> : null}
      {params.error ? <p className="mt-6 border border-red-600/40 bg-red-500/5 p-3 text-sm">Could not save this profile. Check the fields or choose another public handle.</p> : null}

      <section className="mt-8 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Views', totals.views],
          ['Install starts', totals.installStarts],
          ['Verified installs', totals.verifiedInstalls],
          ['Successful outcomes', totals.successes],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-background p-5">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-secondary">{label}</p>
            <p className="mt-3 font-display text-3xl">{metric(value)}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <form action={updateCreatorProfile} className="border border-border p-6">
          <h2 className="font-display text-2xl">Creator identity</h2>
          <p className="mt-2 text-sm text-secondary">GitHub and X are optional. A public handle gives your claimed skills a citable creator page.</p>
          <div className="mt-6 space-y-4">
            {[
              ['username', 'Public profile handle', username],
              ['display_name', 'Display name', profile?.display_name || ''],
              ['website', 'Website', profile?.website || ''],
              ['github_username', 'GitHub username (optional)', profile?.github_username || ''],
              ['x_username', 'X username (optional)', profile?.x_username || ''],
            ].map(([name, label, value]) => (
              <label key={name} className="block text-sm">
                <span className="mb-1 block text-secondary">{label}</span>
                <input name={name} defaultValue={value} className="w-full border border-border bg-background px-3 py-2 outline-none focus:border-foreground" />
              </label>
            ))}
            <label className="block text-sm">
              <span className="mb-1 block text-secondary">Bio</span>
              <textarea name="bio" rows={4} defaultValue={profile?.bio || ''} className="w-full border border-border bg-background px-3 py-2 outline-none focus:border-foreground" />
            </label>
            <button className="w-full bg-foreground px-4 py-3 font-semibold text-background">Save creator profile</button>
          </div>
        </form>

        <div className="border border-border">
          <div className="flex items-center justify-between border-b border-border p-6">
            <div><h2 className="font-display text-2xl">Claimed skills</h2><p className="mt-1 text-sm text-secondary">Only approved claims contribute creator analytics.</p></div>
            <Link href="/submit" className="text-sm underline underline-offset-4">Submit skill</Link>
          </div>
          {(claims || []).length ? (
            <div className="divide-y divide-border">
              {(claims || []).map((claim) => {
                const skill = (skills || []).find((item) => item.slug === claim.skill_slug)
                const event = eventMap.get(claim.skill_slug)
                const outcome = outcomeMap.get(claim.skill_slug)
                return <div key={claim.id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/skills/${claim.skill_slug}`} className="font-semibold hover:underline">{skill?.name || claim.skill_slug}</Link>
                    <span className="font-mono text-xs uppercase text-secondary">{claim.status}</span>
                  </div>
                  {claim.status === 'approved' ? <div className="mt-4 grid grid-cols-4 gap-3 text-xs text-secondary">
                    <span>Views <b className="block text-base text-foreground">{metric(event?.views)}</b></span>
                    <span>Starts <b className="block text-base text-foreground">{metric(event?.install_starts || event?.install_copies)}</b></span>
                    <span>Installs <b className="block text-base text-foreground">{metric(outcome?.verified_installs)}</b></span>
                    <span>Success <b className="block text-base text-foreground">{metric(outcome?.successful_outcomes)}</b></span>
                  </div> : <p className="mt-3 text-sm text-secondary">Awaiting review. You can update evidence from the skill page.</p>}
                </div>
              })}
            </div>
          ) : <div className="p-8 text-sm text-secondary">No claims yet. Open one of your skill pages and choose “Claim this skill”.</div>}
        </div>
      </section>
    </main>
  )
}
