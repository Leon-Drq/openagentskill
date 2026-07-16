import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Download, FileJson2 } from 'lucide-react'
import {
  MarketingButtonLink,
  MarketingHero,
  MarketingMetricStrip,
  MarketingPageShell,
} from '@/components/marketing-page'
import { formatCompactNumber } from '@/lib/quality'
import { getStateOfAgentSkillsReport } from '@/lib/research/state-of-agent-skills'

const SITE_URL = 'https://www.openagentskill.com'
const REPORT_URL = `${SITE_URL}/reports/state-of-agent-skills-2026`

// The report reads a live registry snapshot. Keep it out of static generation so
// a slow database connection cannot fail a production deployment.
export const dynamic = 'force-dynamic'
export const revalidate = 3_600

export const metadata: Metadata = {
  title: 'State of Agent Skills 2026',
  description:
    'Open data report on AI agent skill specificity, maintenance, licenses, trust, install readiness, risk, and real agent outcome evidence.',
  alternates: {
    canonical: REPORT_URL,
  },
  openGraph: {
    title: 'State of Agent Skills 2026',
    description:
      'A transparent OpenAgentSkill ecosystem report with methodology and downloadable JSON, CSV, and text data.',
    url: REPORT_URL,
    type: 'article',
  },
}

function percent(count: number, total: number) {
  if (total <= 0) return '0%'
  return `${Math.round((count / total) * 100)}%`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function riskLabel(value: string) {
  if (value === 'safe_to_try') return 'Safe to try'
  if (value === 'needs_review') return 'Needs review'
  return 'Risky'
}

export default async function StateOfAgentSkillsPage() {
  const report = await getStateOfAgentSkillsReport()
  const { metrics } = report
  const skillSpecificShare = percent(metrics.skillSpecificCandidates, metrics.analyzedCandidates)

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      '@id': `${REPORT_URL}#dataset`,
      name: report.title,
      description:
        'OpenAgentSkill registry analysis covering skill specificity, maintenance, license clarity, install readiness, trust, audit risk, and agent outcome evidence.',
      url: REPORT_URL,
      datePublished: report.publishedAt,
      dateModified: report.generatedAt,
      creator: {
        '@id': `${SITE_URL}/#organization`,
      },
      isAccessibleForFree: true,
      measurementTechnique: [
        'OpenAgentSkill skill-likeness classifier',
        'OpenAgentSkill Trust Score',
        'OpenAgentSkill public audit model',
        'Public GitHub repository metadata',
        'Reported agent outcomes',
      ],
      variableMeasured: [
        'skill likeness',
        'GitHub stars',
        'maintenance freshness',
        'license clarity',
        'install readiness',
        'trust score',
        'audit score',
        'risk level',
        'agent outcomes',
      ],
      distribution: [
        {
          '@type': 'DataDownload',
          encodingFormat: 'application/json',
          contentUrl: report.datasetUrls.json,
        },
        {
          '@type': 'DataDownload',
          encodingFormat: 'text/csv',
          contentUrl: report.datasetUrls.csv,
        },
        {
          '@type': 'DataDownload',
          encodingFormat: 'text/plain',
          contentUrl: report.datasetUrls.text,
        },
      ],
      license: 'https://github.com/Leon-Drq/openagentskill/blob/main/LICENSE',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Report',
      headline: report.title,
      description:
        'A transparent report on the quality and readiness of reusable AI agent skill candidates.',
      url: REPORT_URL,
      datePublished: report.publishedAt,
      dateModified: report.generatedAt,
      author: {
        '@id': `${SITE_URL}/#organization`,
      },
      publisher: {
        '@id': `${SITE_URL}/#organization`,
      },
      mainEntity: {
        '@id': `${REPORT_URL}#dataset`,
      },
    },
  ]

  return (
    <MarketingPageShell>
      <MarketingHero
        eyebrow="Open research · 2026 edition"
        title="State of Agent Skills 2026."
        description={
          <>
            A transparent look at what is actually inside an agent-skill registry: which records look like reusable
            skills, which are maintained, which declare a license, what can be installed, and how little real outcome
            evidence the ecosystem still has.
          </>
        }
        actions={
          <>
            <MarketingButtonLink href={report.datasetUrls.json} variant="primary" prefetch={false}>
              <FileJson2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Download JSON
            </MarketingButtonLink>
            <MarketingButtonLink href={report.datasetUrls.csv} prefetch={false}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Download CSV
            </MarketingButtonLink>
            <MarketingButtonLink href={report.datasetUrls.text} variant="text" prefetch={false}>
              Agent-readable text
            </MarketingButtonLink>
          </>
        }
        aside={
          <MarketingMetricStrip
            columns="grid-cols-2"
            items={[
              { value: metrics.indexedCandidates.toLocaleString(), label: 'Indexed candidates' },
              { value: metrics.analyzedCandidates.toLocaleString(), label: 'Analyzed sample' },
              { value: skillSpecificShare, label: 'Strict agent skills' },
              { value: metrics.agentProvenSkills.toLocaleString(), label: 'Agent Proven' },
            ]}
          />
        }
      />

      <section className="border-b border-border bg-card/35">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Executive finding</p>
            <h2 className="mt-3 font-display text-3xl font-normal leading-tight">Popularity is not readiness.</h2>
            <p className="mt-4 text-sm leading-6 text-secondary">
              GitHub adoption is useful, but it does not prove task fit, safe installation, or a successful agent run.
              This report keeps those signals separate.
            </p>
          </div>
          <ol className="overflow-hidden rounded-[8px] border border-border bg-background">
            {report.findings.map((finding, index) => (
              <li key={finding} className="grid grid-cols-[38px_1fr] border-b border-border p-4 last:border-b-0 sm:p-5">
                <span className="font-mono text-xs text-[#006b4f]">{String(index + 1).padStart(2, '0')}</span>
                <span className="text-sm leading-6 text-secondary">{finding}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-7 max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Readiness signals</p>
            <h2 className="mt-3 font-display text-3xl font-normal leading-tight">What the analyzed sample can support.</h2>
          </div>
          <dl className="grid gap-px overflow-hidden rounded-[8px] border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Maintained within 180 days', metrics.maintainedCandidates],
              ['Known license', metrics.knownLicenseCandidates],
              ['Install path available', metrics.installReadyCandidates],
              ['500+ GitHub stars', metrics.highAdoptionCandidates],
              ['72+ Trust Score', metrics.highTrustCandidates],
              ['Safe-to-try audit', metrics.safeToTryCandidates],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-background p-5">
                <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-secondary">{label}</dt>
                <dd className="mt-4 flex items-baseline justify-between gap-3">
                  <span className="font-display text-3xl">{Number(value).toLocaleString()}</span>
                  <span className="font-mono text-xs text-secondary">{percent(Number(value), metrics.analyzedCandidates)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-b border-border bg-[#fbfaf7]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-7 max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Domain coverage</p>
            <h2 className="mt-3 font-display text-3xl font-normal leading-tight">Where the candidate supply is concentrated.</h2>
            <p className="mt-4 text-sm leading-6 text-secondary">
              Track assignment uses category, task, use-case, and repository text signals. It is a discovery aid, not a
              claim that every record is production ready.
            </p>
          </div>
          <div className="overflow-x-auto rounded-[8px] border border-border bg-background">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-card font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                <tr>
                  <th className="border-b border-border p-4 font-normal">Track</th>
                  <th className="border-b border-border p-4 text-right font-normal">Candidates</th>
                  <th className="border-b border-border p-4 text-right font-normal">Share</th>
                  <th className="border-b border-border p-4 text-right font-normal">Maintained</th>
                  <th className="border-b border-border p-4 text-right font-normal">Known license</th>
                  <th className="border-b border-border p-4 text-right font-normal">High trust</th>
                </tr>
              </thead>
              <tbody>
                {report.tracks.map((track) => (
                  <tr key={track.slug} className="border-b border-border last:border-b-0">
                    <td className="p-4 font-semibold">{track.label}</td>
                    <td className="p-4 text-right font-mono">{track.count}</td>
                    <td className="p-4 text-right font-mono text-secondary">{track.share}%</td>
                    <td className="p-4 text-right font-mono text-secondary">{track.maintainedCount}</td>
                    <td className="p-4 text-right font-mono text-secondary">{track.knownLicenseCount}</td>
                    <td className="p-4 text-right font-mono text-secondary">{track.highTrustCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Evidence shortlist</p>
            <h2 className="mt-3 font-display text-3xl font-normal leading-tight">Leading strict skill candidates.</h2>
              <p className="mt-4 text-sm leading-6 text-secondary">
                Ordered by reported outcomes, Trust Score, skill-likeness, and GitHub adoption. This is a shortlist for
                evaluation, not an automatic-install endorsement.
              </p>
            </div>
            <Link href="/rankings/agent-proven" className="inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-border underline-offset-4">
              Agent Proven ranking <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="overflow-x-auto rounded-[8px] border border-border">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-card font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
                <tr>
                  <th className="border-b border-border p-4 font-normal">Skill</th>
                  <th className="border-b border-border p-4 font-normal">Track</th>
                  <th className="border-b border-border p-4 text-right font-normal">Stars</th>
                  <th className="border-b border-border p-4 text-right font-normal">Trust</th>
                  <th className="border-b border-border p-4 text-right font-normal">Audit</th>
                  <th className="border-b border-border p-4 font-normal">Risk</th>
                  <th className="border-b border-border p-4 text-right font-normal">Outcomes</th>
                </tr>
              </thead>
              <tbody>
                {report.topSkills.map((skill) => (
                  <tr key={skill.slug} className="border-b border-border last:border-b-0 hover:bg-card/60">
                    <td className="p-4">
                      <Link href={`/skills/${skill.slug}`} className="font-semibold underline decoration-transparent underline-offset-4 hover:decoration-foreground">
                        {skill.name}
                      </Link>
                      <div className="mt-1 max-w-[280px] truncate font-mono text-[10px] text-secondary">{skill.repository}</div>
                    </td>
                    <td className="p-4 text-secondary">{skill.trackLabel}</td>
                    <td className="p-4 text-right font-mono">{formatCompactNumber(skill.stars)}</td>
                    <td className="p-4 text-right font-mono">{skill.trustScore}</td>
                    <td className="p-4 text-right font-mono">{skill.auditScore}</td>
                    <td className="p-4 text-secondary">{riskLabel(skill.riskLevel)}</td>
                    <td className="p-4 text-right font-mono">{skill.agentOutcomeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card/35">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Methodology</p>
            <h2 className="mt-3 font-display text-3xl font-normal leading-tight">Readable before repeatable.</h2>
            <p className="mt-4 text-sm leading-6 text-secondary">
              Published {formatDate(report.publishedAt)}. Data refreshed {formatDate(report.generatedAt)}.
            </p>
          </div>
          <div className="space-y-7">
            <div>
              <h3 className="text-sm font-semibold">Population and sample</h3>
              <p className="mt-2 text-sm leading-6 text-secondary">{report.methodology.indexedPopulation}</p>
              <p className="mt-2 text-sm leading-6 text-secondary">{report.methodology.analyzedSample}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Inclusion and measurement</h3>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-secondary">
                {report.methodology.inclusionRules.map((rule) => (
                  <li key={rule} className="flex gap-3"><span className="text-[#006b4f]">•</span><span>{rule}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Limitations</h3>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-secondary">
                {report.methodology.limitations.map((limitation) => (
                  <li key={limitation} className="flex gap-3"><span className="text-[#b7791f]">•</span><span>{limitation}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl rounded-[8px] border border-border bg-card p-6 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Cite this report</p>
          <blockquote className="mt-4 max-w-4xl text-base leading-7 text-secondary">
            OpenAgentSkill. “State of Agent Skills 2026.” Published July 10, 2026. Dataset and methodology available at{' '}
            <a href={REPORT_URL} className="break-all font-semibold text-foreground underline underline-offset-4">{REPORT_URL}</a>.
          </blockquote>
          <div className="mt-6 flex flex-wrap gap-3">
            <MarketingButtonLink href={report.datasetUrls.json} prefetch={false}>JSON dataset</MarketingButtonLink>
            <MarketingButtonLink href={report.datasetUrls.csv} prefetch={false}>CSV dataset</MarketingButtonLink>
            <MarketingButtonLink href="https://github.com/Leon-Drq/openagentskill" target="_blank" rel="noopener noreferrer">
              Research code
            </MarketingButtonLink>
          </div>
        </div>
      </section>

      {structuredData.map((item) => (
        <script
          key={item['@type']}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </MarketingPageShell>
  )
}
