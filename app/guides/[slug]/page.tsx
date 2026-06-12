import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { InstallCommand } from '@/components/install-command'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getAllSkills, type SkillRecord } from '@/lib/db/skills'
import { getSkillDecisionProfile } from '@/lib/decision'
import { formatCompactNumber, getPlatformHints, getSkillQualityProfile } from '@/lib/quality'
import {
  GROWTH_GUIDES,
  type GrowthGuideDefinition,
  getGrowthGuideBySlug,
  getRelatedGrowthGuides,
} from '@/lib/seo/growth-guides'
import { getUseCaseBySlug, getUseCasesForSkill, scoreSkillForUseCase } from '@/lib/use-cases'

export const dynamic = 'force-dynamic'

export function generateStaticParams() {
  return GROWTH_GUIDES.map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const guide = getGrowthGuideBySlug(slug)
  if (!guide) return { title: 'Guide Not Found' }

  return {
    title: guide.title,
    description: guide.description,
    alternates: {
      canonical: `https://www.openagentskill.com/guides/${guide.slug}`,
    },
    openGraph: {
      title: `${guide.title} - OpenAgentSkill`,
      description: guide.description,
      url: `https://www.openagentskill.com/guides/${guide.slug}`,
      type: 'article',
      images: [
        {
          url: 'https://www.openagentskill.com/opengraph-image?v=2',
          width: 1200,
          height: 630,
          alt: guide.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: guide.title,
      description: guide.description,
      images: ['https://www.openagentskill.com/opengraph-image?v=2'],
    },
  }
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function searchableSkillText(skill: SkillRecord) {
  return [
    skill.slug,
    skill.name,
    skill.description,
    skill.long_description,
    skill.tagline,
    skill.category,
    skill.repository,
    skill.github_repo,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function formatDate(value: string | null) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getInstallCommand(skill: SkillRecord) {
  if (skill.install_command) return skill.install_command
  if (skill.github_repo) return `npx skills add ${skill.github_repo}`
  return `npx skills add ${skill.slug}`
}

function findSkillByNeedle(skills: SkillRecord[], needle: string) {
  const normalizedNeedle = normalize(needle)
  return skills.find((skill) => {
    const normalizedText = normalize([skill.slug, skill.name, skill.github_repo, skill.repository].filter(Boolean).join(' '))
    return normalizedText.includes(normalizedNeedle)
  })
}

function addUniqueSkill(target: SkillRecord[], skill: SkillRecord | undefined) {
  if (!skill || target.some((item) => item.slug === skill.slug)) return
  target.push(skill)
}

function scoreSkillForGuide(skill: SkillRecord, guide: GrowthGuideDefinition) {
  const useCase = guide.useCaseSlug ? getUseCaseBySlug(guide.useCaseSlug) : null
  const text = searchableSkillText(skill)
  const normalizedText = normalize(text)
  let score = 0

  for (const keyword of guide.skillKeywords) {
    const normalizedKeyword = keyword.toLowerCase()
    if (text.includes(normalizedKeyword)) score += normalizedKeyword.includes(' ') ? 6 : 4
    if (normalizedText.includes(normalize(keyword))) score += 2
  }

  for (const keyword of guide.platformKeywords || []) {
    const normalizedKeyword = keyword.toLowerCase()
    if (text.includes(normalizedKeyword)) score += normalizedKeyword.includes(' ') ? 5 : 3
  }

  for (const targetName of guide.compareTargetNames || []) {
    if (normalizedText.includes(normalize(targetName))) score += 28
  }

  for (const slug of guide.primarySkillSlugs || []) {
    if (skill.slug === slug || normalize(skill.name).includes(normalize(slug))) score += 35
  }

  if (useCase) score += scoreSkillForUseCase(skill, useCase)
  if (guide.platformLabel && getPlatformHints(skill).includes(guide.platformLabel)) score += 8
  if (skill.install_command || skill.github_repo) score += 4
  if (skill.verified) score += 2

  score += Math.min(9, Math.log10(Math.max(1, Number(skill.github_stars || 0))) * 2)
  score += Math.min(7, Number(skill.quality_score || 0) / 18)

  return score
}

function selectGuideSkills(skills: SkillRecord[], guide: GrowthGuideDefinition, limit = 12) {
  const selected: SkillRecord[] = []

  for (const slug of guide.primarySkillSlugs || []) {
    addUniqueSkill(selected, findSkillByNeedle(skills, slug))
  }

  for (const targetName of guide.compareTargetNames || []) {
    addUniqueSkill(selected, findSkillByNeedle(skills, targetName))
  }

  const scored = skills
    .map((skill) => ({ skill, score: scoreSkillForGuide(skill, guide) }))
    .filter((item) => item.score >= (guide.intent === 'standard' ? 8 : 10))
    .sort((a, b) => b.score - a.score || Number(b.skill.github_stars || 0) - Number(a.skill.github_stars || 0))

  for (const item of scored) {
    addUniqueSkill(selected, item.skill)
    if (selected.length >= limit) return selected
  }

  for (const skill of skills) {
    addUniqueSkill(selected, skill)
    if (selected.length >= limit) break
  }

  return selected
}

function getGuideSkillModels(skills: SkillRecord[], guide: GrowthGuideDefinition) {
  return selectGuideSkills(skills, guide, guide.intent === 'compare' ? 8 : 12).map((skill) => ({
    skill,
    score: scoreSkillForGuide(skill, guide),
    quality: getSkillQualityProfile(skill),
    decision: getSkillDecisionProfile(skill),
    platforms: getPlatformHints(skill),
    useCases: getUseCasesForSkill(skill, 2),
  }))
}

function getFaqSchema(guide: GrowthGuideDefinition) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export default async function GrowthGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const guide = getGrowthGuideBySlug(slug)
  if (!guide) notFound()

  const allSkills = await getAllSkills('quality').catch(() => [])
  const guideSkills = getGuideSkillModels(allSkills, guide)
  const primarySkills = guideSkills.slice(0, guide.intent === 'compare' ? 2 : 4)
  const relatedGuides = getRelatedGrowthGuides(guide)
  const useCase = guide.useCaseSlug ? getUseCaseBySlug(guide.useCaseSlug) : null

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(getFaqSchema(guide)) }} />
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-secondary">
          <Link href="/guides" className="hover:text-foreground">
            Guides
          </Link>
          <span>/</span>
          <span className="text-foreground">{guide.shortTitle}</span>
        </nav>

        <section className="grid gap-10 border-b border-border pb-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 text-xs uppercase tracking-widest text-secondary">{guide.eyebrow}</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-balance md:text-6xl">{guide.title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">{guide.description}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={`/api/agent/recommend?task=${encodeURIComponent(guide.heroPrompt)}&limit=4`}
                className="border border-foreground bg-foreground px-5 py-2 text-sm text-background transition-colors hover:bg-background hover:text-foreground"
              >
                Run recommendation API
              </a>
              <Link
                href={useCase ? `/use-cases/${useCase.slug}` : '/skills?sort=quality'}
                className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                {useCase ? 'View use case' : 'Browse skills'}
              </Link>
              <Link
                href="/api-docs"
                className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                Agent API docs
              </Link>
            </div>
          </div>

          <div className="border border-border bg-card p-5">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Decision prompt</p>
            <p className="text-lg leading-relaxed text-foreground">{guide.heroPrompt}</p>
            <div className="mt-5 grid grid-cols-2 gap-px border border-border bg-border text-center">
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{guideSkills.length}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Shortlist</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl">{guide.intent}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Intent</div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {guide.platformLabel && (
                <span className="border border-border px-2 py-1 text-xs font-mono text-secondary">{guide.platformLabel}</span>
              )}
              {useCase && (
                <span className="border border-border px-2 py-1 text-xs font-mono text-secondary">{useCase.shortTitle}</span>
              )}
              <span className="border border-border px-2 py-1 text-xs font-mono text-secondary">Updated Jun 2026</span>
            </div>
          </div>
        </section>

        {guide.intent === 'compare' && primarySkills.length >= 2 && (
          <section className="border-b border-border py-10">
            <div className="mb-6">
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Side-by-side decision</p>
              <h2 className="font-display text-2xl font-semibold">Which one should an agent builder try first?</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {primarySkills.map(({ skill, quality, decision, platforms }) => (
                <article key={skill.slug} className="border border-border bg-card p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link href={`/skills/${skill.slug}`} className="font-display text-2xl font-semibold hover:underline">
                        {skill.name}
                      </Link>
                      <p className="mt-2 text-sm leading-relaxed text-secondary">{skill.description}</p>
                    </div>
                    <span className="w-fit border border-border px-2 py-1 font-mono text-xs text-secondary">
                      {decision.readinessScore}/100
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-px border border-border bg-border text-sm">
                    <div className="bg-background p-3">
                      <p className="text-xs uppercase tracking-widest text-secondary">Quality</p>
                      <p className="mt-1 font-mono">{quality.label}</p>
                    </div>
                    <div className="bg-background p-3">
                      <p className="text-xs uppercase tracking-widest text-secondary">Stars</p>
                      <p className="mt-1 font-mono">{formatCompactNumber(Number(skill.github_stars || 0))}</p>
                    </div>
                    <div className="bg-background p-3">
                      <p className="text-xs uppercase tracking-widest text-secondary">Freshness</p>
                      <p className="mt-1 font-mono">{formatDate(skill.github_last_pushed_at)}</p>
                    </div>
                    <div className="bg-background p-3">
                      <p className="text-xs uppercase tracking-widest text-secondary">Fit</p>
                      <p className="mt-1 font-mono">{decision.primaryFit}</p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Use when</p>
                    <ul className="space-y-2 text-sm leading-relaxed text-secondary">
                      {decision.bestFor.slice(0, 3).map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="font-mono text-foreground/40">+</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {platforms.slice(0, 3).map((platform) => (
                      <span key={platform} className="border border-border px-2 py-1 text-xs text-secondary">
                        {platform}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="border-b border-border py-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Recommended shortlist</p>
              <h2 className="font-display text-2xl font-semibold">
                {guide.intent === 'compare' ? 'Fallbacks and companions' : 'Start with these skills'}
              </h2>
            </div>
            <span className="text-sm text-secondary">Ranked from current marketplace data</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {primarySkills.map(({ skill, quality, decision, platforms, useCases }) => (
              <article key={skill.slug} className="flex flex-col justify-between border border-border bg-card p-5">
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="border border-border px-2 py-1 text-xs font-mono text-secondary">
                      {decision.adoptionStage}
                    </span>
                    <span className="bg-foreground px-2 py-1 text-xs font-mono text-background">
                      {decision.readinessScore}/100
                    </span>
                  </div>
                  <Link href={`/skills/${skill.slug}`} className="font-display text-xl font-semibold leading-tight hover:underline">
                    {skill.name}
                  </Link>
                  <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-secondary">{skill.description}</p>

                  <div className="mt-4 space-y-2 text-xs font-mono text-secondary">
                    <div className="flex justify-between gap-3">
                      <span>Stars</span>
                      <span>{formatCompactNumber(Number(skill.github_stars || 0))}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Quality</span>
                      <span>{quality.score}/100</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Updated</span>
                      <span>{formatDate(skill.github_last_pushed_at || skill.updated_at)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {[...platforms, ...useCases.map((item) => item.shortTitle)].slice(0, 3).map((label) => (
                      <span key={label} className="border border-border px-2 py-1 text-xs text-secondary">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <InstallCommand command={getInstallCommand(skill)} skillSlug={skill.slug} compact />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">How to use this guide</p>
            <h2 className="font-display text-2xl font-semibold">Move from search to adoption</h2>
          </div>
          <div className="grid gap-3">
            {guide.steps.map((step, index) => (
              <div key={step.title} className="grid gap-4 border border-border bg-card p-5 sm:grid-cols-[auto_1fr]">
                <span className="font-mono text-sm text-secondary">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-secondary">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Evaluation notes</p>
            <h2 className="font-display text-2xl font-semibold">What to check before installing</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {guide.sections.map((section) => (
              <article key={section.title} className="border border-border bg-card p-5">
                <h3 className="font-display text-xl font-semibold">{section.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-secondary">{section.body}</p>
                <ul className="mt-4 space-y-2 text-sm leading-relaxed text-secondary">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="font-mono text-foreground/40">+</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="border-b border-border py-10">
          <div className="mb-6">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">FAQ</p>
            <h2 className="font-display text-2xl font-semibold">Common questions</h2>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {guide.faq.map((item) => (
              <article key={item.question} className="py-5">
                <h3 className="font-display text-lg font-semibold">{item.question}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-secondary">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        {guideSkills.length > primarySkills.length && (
          <section className="border-b border-border py-10">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-3 text-xs uppercase tracking-widest text-secondary">More candidates</p>
                <h2 className="font-display text-2xl font-semibold">Additional skills to review</h2>
              </div>
              <Link href="/skills?sort=quality" className="text-sm text-secondary underline underline-offset-2 hover:text-foreground">
                Browse full marketplace
              </Link>
            </div>

            <div className="divide-y divide-border border-y border-border">
              {guideSkills.slice(primarySkills.length).map(({ skill, decision }) => (
                <Link
                  key={skill.slug}
                  href={`/skills/${skill.slug}`}
                  className="grid gap-3 py-5 transition-colors hover:bg-muted/30 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-semibold">{skill.name}</h3>
                      <span className="border border-border px-2 py-0.5 text-xs text-secondary">{decision.agentRole}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-secondary">{skill.description}</p>
                  </div>
                  <div className="flex gap-4 text-xs font-mono text-secondary sm:justify-end">
                    <span>{formatCompactNumber(Number(skill.github_stars || 0))} stars</span>
                    <span>{decision.readinessScore}/100 ready</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {relatedGuides.length > 0 && (
          <section className="py-10">
            <div className="mb-6">
              <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Next guides</p>
              <h2 className="font-display text-2xl font-semibold">Keep building the workflow</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {relatedGuides.map((related) => (
                <Link
                  key={related.slug}
                  href={`/guides/${related.slug}`}
                  className="border border-border bg-card p-5 transition-colors hover:border-foreground"
                >
                  <p className="text-xs uppercase tracking-widest text-secondary">{related.eyebrow}</p>
                  <h3 className="mt-2 font-display text-xl font-semibold">{related.shortTitle}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-secondary">{related.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
