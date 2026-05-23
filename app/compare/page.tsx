import type { Metadata } from 'next'
import Link from 'next/link'
import { InstallCommand } from '@/components/install-command'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills, getSkillBySlug, type SkillRecord } from '@/lib/db/skills'
import { getStacksForSkill } from '@/lib/collections'
import { formatCompactNumber, getPlatformHints, getSkillQualityProfile } from '@/lib/quality'
import { getUseCasesForSkill } from '@/lib/use-cases'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Compare AI Agent Skills | OpenAgentSkill',
  description:
    'Compare AI agent skills by quality score, GitHub stars, maintenance freshness, install readiness, use-case fit, and workflow risk.',
  alternates: {
    canonical: 'https://www.openagentskill.com/compare',
  },
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ skills?: string }>
}) {
  const params = await searchParams
  const requestedSlugs = (params.skills || '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean)
    .slice(0, 4)

  const comparedSkills = requestedSlugs.length
    ? (await Promise.all(requestedSlugs.map((slug) => getSkillBySlug(slug).catch(() => null)))).filter(
        (skill): skill is SkillRecord => Boolean(skill)
      )
    : []

  const fallbackSkills = comparedSkills.length === 0
    ? (await getAllSkills('quality').catch(() => [])).slice(0, 6)
    : []

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="border-b border-border pb-10">
          <p className="mb-4 text-xs uppercase tracking-widest text-secondary">Skill comparison</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-balance sm:text-6xl">
            Compare agent skills before installing.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
            Put high-signal skills side by side and inspect quality, adoption, freshness, install readiness,
            use-case fit, and warnings in one place.
          </p>
        </section>

        {comparedSkills.length === 0 ? (
          <section className="py-10">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-semibold">Start with popular skills</h2>
              <p className="mt-2 text-sm text-secondary">
                Add skills from the browse page, or start with one of these high-quality picks.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {fallbackSkills.map((skill) => {
                const quality = getSkillQualityProfile(skill)
                return (
                  <Link
                    key={skill.slug}
                    href={`/compare?skills=${encodeURIComponent(skill.slug)}`}
                    className="border border-border p-5 transition-colors hover:border-foreground"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-semibold">{skill.name}</h2>
                      <span className="border border-border px-2 py-0.5 text-xs font-mono text-secondary">
                        {quality.label} · {quality.score}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-secondary">{skill.description}</p>
                  </Link>
                )
              })}
            </div>
          </section>
        ) : (
          <section className="py-10">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="font-display text-2xl font-semibold">
                  Comparing {comparedSkills.length} {comparedSkills.length === 1 ? 'skill' : 'skills'}
                </h2>
                <p className="mt-2 text-sm text-secondary">Use this as a shortlist, then open the skill detail page before adopting.</p>
              </div>
              <Link
                href="/skills"
                className="self-start border border-border px-4 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground sm:self-auto"
              >
                Add more skills
              </Link>
            </div>

            <div className="overflow-x-auto border border-border">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-card">
                    <th className="w-44 p-4 text-xs uppercase tracking-widest text-secondary">Signal</th>
                    {comparedSkills.map((skill) => (
                      <th key={skill.slug} className="p-4 align-top">
                        <Link href={`/skills/${skill.slug}`} className="font-display text-xl font-semibold hover:text-secondary">
                          {skill.name}
                        </Link>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-secondary">{skill.description}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-4 text-xs uppercase tracking-widest text-secondary">Quality</td>
                    {comparedSkills.map((skill) => {
                      const quality = getSkillQualityProfile(skill)
                      return (
                        <td key={skill.slug} className="p-4 align-top">
                          <div className="font-mono text-lg">{quality.score}/100</div>
                          <div className="mt-1 text-xs text-secondary">{quality.label}</div>
                          <div className="mt-3 h-1.5 bg-muted">
                            <div className="h-full bg-foreground" style={{ width: `${quality.score}%` }} />
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="p-4 text-xs uppercase tracking-widest text-secondary">Adoption</td>
                    {comparedSkills.map((skill) => (
                      <td key={skill.slug} className="p-4 align-top font-mono text-sm">
                        {formatCompactNumber(skill.github_stars || 0)} stars
                        <div className="mt-1 text-xs text-secondary">{formatCompactNumber(skill.downloads || 0)} installs</div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 text-xs uppercase tracking-widest text-secondary">Freshness</td>
                    {comparedSkills.map((skill) => (
                      <td key={skill.slug} className="p-4 align-top font-mono text-sm">
                        {formatDate(skill.github_last_pushed_at || skill.updated_at)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 text-xs uppercase tracking-widest text-secondary">Use-case fit</td>
                    {comparedSkills.map((skill) => (
                      <td key={skill.slug} className="p-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          {getUseCasesForSkill(skill, 3).map((useCase) => (
                            <Link
                              key={useCase.slug}
                              href={`/use-cases/${useCase.slug}`}
                              className="border border-border px-2 py-1 text-xs text-secondary hover:border-foreground hover:text-foreground"
                            >
                              {useCase.shortTitle}
                            </Link>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 text-xs uppercase tracking-widest text-secondary">Stack fit</td>
                    {comparedSkills.map((skill) => (
                      <td key={skill.slug} className="p-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          {getStacksForSkill(skill, 2).map((stack) => (
                            <Link
                              key={stack.slug}
                              href={`/collections/${stack.slug}`}
                              className="border border-border px-2 py-1 text-xs text-secondary hover:border-foreground hover:text-foreground"
                            >
                              {stack.shortTitle}
                            </Link>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 text-xs uppercase tracking-widest text-secondary">Platform hints</td>
                    {comparedSkills.map((skill) => (
                      <td key={skill.slug} className="p-4 align-top text-sm text-secondary">
                        {[...new Set([...(skill.frameworks || []), ...getPlatformHints(skill)])].slice(0, 5).join(', ') || 'General agent workflow'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 text-xs uppercase tracking-widest text-secondary">Warnings</td>
                    {comparedSkills.map((skill) => {
                      const warnings = getSkillQualityProfile(skill).warnings
                      return (
                        <td key={skill.slug} className="p-4 align-top text-sm text-secondary">
                          {warnings.length > 0 ? warnings.slice(0, 3).join(' · ') : 'No major warning signals'}
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="p-4 text-xs uppercase tracking-widest text-secondary">Install</td>
                    {comparedSkills.map((skill) => (
                      <td key={skill.slug} className="p-4 align-top">
                        <InstallCommand
                          command={skill.install_command || `npx skills add ${skill.github_repo}`}
                          skillSlug={skill.slug}
                          compact
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
