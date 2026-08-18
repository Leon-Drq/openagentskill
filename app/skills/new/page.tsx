import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'New Agent Skill submissions | OpenAgentSkill',
  description: 'A chronological community queue of standards-compliant SKILL.md submissions.',
  alternates: { canonical: 'https://www.openagentskill.com/skills/new' },
}

interface CommunitySubmission {
  id: string
  status: string
  skill_name: string | null
  skill_description: string | null
  skill_path: string | null
  repository_url: string | null
  submitter_github: string | null
  submitter_x: string | null
  identity_verified: boolean
  created_at: string
  skills: { slug: string }[] | { slug: string } | null
}

async function getCommunitySubmissions() {
  try {
    const supabase = createAdminClient({ requestTimeoutMs: 8_000 })
    const { data, error } = await supabase
      .from('skill_submissions')
      .select(`
        id,
        status,
        skill_name,
        skill_description,
        skill_path,
        repository_url,
        submitter_github,
        submitter_x,
        identity_verified,
        created_at,
        skills ( slug )
      `)
      .in('status', ['submitted', 'processing', 'listed', 'reviewed', 'duplicate'])
      .order('created_at', { ascending: false })
      .limit(60)
    if (error) throw error
    return (data || []) as CommunitySubmission[]
  } catch (error) {
    console.warn('[new-skills] community queue unavailable:', error)
    return []
  }
}

function statusCopy(status: string) {
  if (status === 'reviewed') return 'Reviewed'
  if (status === 'listed') return 'Community listed'
  if (status === 'duplicate') return 'Already listed'
  if (status === 'processing') return 'Reviewing'
  return 'Submitted'
}

export default async function NewSkillsPage() {
  const submissions = await getCommunitySubmissions()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-14 sm:py-18">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-secondary">Community queue</p>
            <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h1 className="font-display text-4xl font-normal sm:text-5xl">New Agent Skills</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-secondary">
                  Every valid SKILL.md can enter the community queue. Reviewed and verified skills earn stronger placement in search and Agent Resolve.
                </p>
              </div>
              <Link href="/submit" className="inline-flex h-11 items-center justify-center bg-[#006b4f] px-5 text-sm font-semibold text-white">
                Submit a Skill
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
          {submissions.length === 0 ? (
            <div className="border border-border bg-card p-8">
              <h2 className="font-display text-2xl">The queue is ready for its next submission.</h2>
              <p className="mt-3 text-sm leading-6 text-secondary">Zero-star projects are welcome when they contain a valid public SKILL.md.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {submissions.map((submission) => {
                const relatedSkill = Array.isArray(submission.skills) ? submission.skills[0] : submission.skills
                const destination = relatedSkill?.slug
                  ? `/skills/${relatedSkill.slug}`
                  : submission.repository_url || '#'
                return (
                  <article key={submission.id} className="border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-secondary">{statusCopy(submission.status)}</p>
                        <h2 className="mt-2 font-display text-2xl">{submission.skill_name || 'Unnamed skill'}</h2>
                      </div>
                      <time className="shrink-0 font-mono text-[11px] text-secondary" dateTime={submission.created_at}>
                        {new Date(submission.created_at).toISOString().slice(0, 10)}
                      </time>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-secondary">{submission.skill_description}</p>
                    <p className="mt-4 truncate font-mono text-[11px] text-secondary">{submission.skill_path}</p>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
                      <div className="flex flex-wrap gap-3 text-secondary">
                        {submission.submitter_github && (
                          <a href={`https://github.com/${submission.submitter_github}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                            GitHub @{submission.submitter_github}
                          </a>
                        )}
                        {submission.submitter_x && (
                          <a href={`https://x.com/${submission.submitter_x}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                            X @{submission.submitter_x}
                          </a>
                        )}
                        {(submission.submitter_github || submission.submitter_x) && !submission.identity_verified && (
                          <span className="font-mono text-[10px] uppercase">Unverified</span>
                        )}
                      </div>
                      <Link href={destination} className="font-semibold underline underline-offset-4">
                        Open source
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
