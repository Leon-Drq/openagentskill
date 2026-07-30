import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getXGrowthReport, type XGrowthSummary } from '@/lib/x/report'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'X Content Learning Report',
  description: 'A 14-day operating report for OpenAgentSkill scenario-led X content.',
  robots: { index: false, follow: false },
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatRate(value: number | null) {
  return value === null ? '—' : `${value.toFixed(2)}%`
}

function SummaryStrip({ title, value }: { title: string; value: XGrowthSummary }) {
  const metrics = [
    ['Main posts', value.posts],
    ['Impressions', formatNumber(value.impressions)],
    ['Reaction rate', formatRate(value.reactionRate)],
    ['Landing sessions', value.attributedLandingViews],
    ['Install + save', value.installCopies + value.saves],
  ]

  return (
    <section className="border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">{title}</p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-5">
        {metrics.map(([label, metric]) => (
          <div key={String(label)} className="min-w-0 bg-card p-4">
            <p className="font-mono text-lg font-semibold tabular-nums">{metric}</p>
            <p className="mt-1 text-xs leading-relaxed text-secondary">{label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default async function XGrowthReportPage() {
  const report = await getXGrowthReport().catch(() => null)

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <section className="border-b border-border pb-9">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#006b4f]">X content learning loop</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-6xl">
            Learn which skill stories earn a next action.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-secondary sm:text-lg">
            Three scenario-led shortlists per day. One high-quality creator interaction draft. This report follows attention through to an on-site visit, install copy, or save.
          </p>
        </section>

        {!report ? (
          <section className="py-12">
            <div className="border border-border bg-card p-6">
              <h2 className="font-display text-2xl font-semibold">The learning report is preparing.</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-secondary">The next editorial run will create the first tracked shortlist, then this page will populate with measured results.</p>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-px border-b border-border py-8 sm:grid-cols-4">
              {[
                ['Experiment', report.status.replaceAll('_', ' ')],
                ['Days elapsed', `${report.daysElapsed} / 14`],
                ['Topics tested', `${report.topicsTested} / ${report.targetTopics}`],
                ['Decision window', report.daysRemaining ? `${report.daysRemaining} days left` : 'Ready to choose'],
              ].map(([label, value]) => (
                <div key={label} className="border border-border bg-card p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-secondary">{label}</p>
                  <p className="mt-3 text-lg font-semibold capitalize">{value}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-5 py-10">
              <SummaryStrip title="Current experiment" value={report.summary} />
              <SummaryStrip title="Previous 14-day posting baseline" value={report.baseline} />
            </section>

            <section className="border-y border-border py-9">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#006b4f]">Recommendation</p>
              <h2 className="mt-3 font-display text-3xl font-semibold">{report.recommendation.title}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-secondary">{report.recommendation.detail}</p>
            </section>

            <section className="py-10">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-secondary">Content lanes</p>
                  <h2 className="mt-3 font-display text-3xl font-semibold">What is earning useful attention.</h2>
                </div>
                <p className="max-w-sm text-sm leading-relaxed text-secondary">A winner needs at least two measured main posts. Replies in the same thread do not inflate the result.</p>
              </div>
              {report.lanes.length ? (
                <div className="divide-y divide-border border-y border-border">
                  {report.lanes.map((lane) => (
                    <article key={lane.lane} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-2xl font-semibold capitalize">{lane.lane}</h3>
                          <span className="border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-secondary">{lane.status}</span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-secondary">{lane.topics} topic{lane.topics === 1 ? '' : 's'} · {lane.posts} main post{lane.posts === 1 ? '' : 's'} · {lane.attributedLandingViews} attributed landing session{lane.attributedLandingViews === 1 ? '' : 's'}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-right sm:min-w-[290px]">
                        <div><p className="font-mono text-lg">{formatNumber(lane.impressions)}</p><p className="text-xs text-secondary">Impressions</p></div>
                        <div><p className="font-mono text-lg">{formatRate(lane.reactionRate)}</p><p className="text-xs text-secondary">Reactions</p></div>
                        <div><p className="font-mono text-lg">{lane.installCopies + lane.saves}</p><p className="text-xs text-secondary">Intent</p></div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="border border-border bg-card p-5 text-sm text-secondary">No editorial topics have been measured yet.</p>
              )}
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
