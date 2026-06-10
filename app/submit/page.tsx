'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SkillSubmitForm, SubmitFormData } from '@/components/skill-submit-form'
import { useI18n } from '@/lib/i18n/context'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export default function SubmitPage() {
  const { t } = useI18n()
  const [submitted, setSubmitted] = useState(false)
  const [reviewResult, setReviewResult] = useState<any>(null)

  const handleSubmit = async (data: SubmitFormData) => {
    console.log('[v0] Submitting skill:', data)

    const response = await fetch('/api/skills/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || t.common.error)
    }

    const result = await response.json()
    console.log('[v0] Submission result:', result)

    setReviewResult(result)
    setSubmitted(true)
  }

  if (submitted && reviewResult) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />

        {/* Result */}
        <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="max-w-2xl mx-auto text-center">
            {reviewResult.approved ? (
              <>
                <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                  {t.submitPage.result.approved.title}
                </h1>
                <p className="text-base sm:text-lg text-secondary mb-8">
                  {t.submitPage.result.approved.subtitle}
                </p>
                <div className="border border-border p-4 sm:p-6 mb-8 text-left">
                  <h2 className="font-semibold text-lg sm:text-xl mb-4">
                    {t.submitPage.result.approved.reviewDetails}
                  </h2>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-secondary">{t.submitPage.result.approved.security}</span>{' '}
                      <span className="font-mono">{reviewResult.review.scores.security}/10</span>
                    </p>
                    <p>
                      <span className="text-secondary">{t.submitPage.result.approved.quality}</span>{' '}
                      <span className="font-mono">{reviewResult.review.scores.quality}/10</span>
                    </p>
                    <p>
                      <span className="text-secondary">{t.submitPage.result.approved.usefulness}</span>{' '}
                      <span className="font-mono">{reviewResult.review.scores.usefulness}/10</span>
                    </p>
                    <p>
                      <span className="text-secondary">{t.submitPage.result.approved.compliance}</span>{' '}
                      <span className="font-mono">{reviewResult.review.scores.compliance}/10</span>
                    </p>
                    <p className="pt-2 border-t border-border mt-2">
                      <span className="text-secondary">{t.submitPage.result.approved.totalScore}</span>{' '}
                      <span className="font-mono font-semibold">{reviewResult.review.totalScore}/40</span>
                    </p>
                  </div>
                  {reviewResult.review.suggestions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h3 className="font-semibold mb-2">{t.submitPage.result.approved.suggestions}</h3>
                      <ul className="list-disc list-inside text-sm text-secondary space-y-1">
                        {reviewResult.review.suggestions.map((suggestion: string, i: number) => (
                          <li key={i}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <Link
                  href={`/skills/${reviewResult.skill.slug}`}
                  className="inline-block px-4 sm:px-6 py-2 sm:py-3 border-2 border-foreground font-semibold hover:bg-foreground hover:text-background transition-colors text-sm sm:text-base"
                >
                  {t.submitPage.result.approved.viewSkill}
                </Link>
                <div className="mt-8 border border-border p-4 text-left sm:p-5">
                  <p className="mb-2 text-xs uppercase tracking-widest text-secondary">README badge</p>
                  <p className="mb-3 text-sm leading-relaxed text-secondary">
                    Add this badge to the repository README after the listing is live.
                  </p>
                  <pre className="overflow-x-auto border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-secondary">
                    <code>{`[![OpenAgentSkill](https://www.openagentskill.com/api/badge/${reviewResult.skill.slug})](https://www.openagentskill.com/skills/${reviewResult.skill.slug})`}</code>
                  </pre>
                </div>
              </>
            ) : (
              <>
                <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                  {t.submitPage.result.rejected.title}
                </h1>
                <p className="text-base sm:text-lg text-secondary mb-8">
                  {t.submitPage.result.rejected.subtitle}
                </p>
                <div className="border border-destructive p-4 sm:p-6 mb-8 text-left">
                  <h2 className="font-semibold text-lg sm:text-xl mb-4">
                    {t.submitPage.result.rejected.reviewIssues}
                  </h2>
                  <ul className="list-disc list-inside text-sm space-y-2">
                    {reviewResult.review.issues.map((issue: string, i: number) => (
                      <li key={i} className="text-destructive">{issue}</li>
                    ))}
                  </ul>
                  {reviewResult.review.suggestions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h3 className="font-semibold mb-2">{t.submitPage.result.rejected.suggestions}</h3>
                      <ul className="list-disc list-inside text-sm text-secondary space-y-1">
                        {reviewResult.review.suggestions.map((suggestion: string, i: number) => (
                          <li key={i}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-border text-sm text-secondary">
                    <p>{reviewResult.review.reasoning}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSubmitted(false)}
                  className="inline-block px-4 sm:px-6 py-2 sm:py-3 border-2 border-foreground font-semibold hover:bg-foreground hover:text-background transition-colors text-sm sm:text-base"
                >
                  {t.submitPage.result.rejected.resubmit}
                </button>
              </>
            )}
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Main Content */}
      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="brand-grain pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative mx-auto max-w-6xl px-6 py-14 text-center sm:py-16 lg:py-20">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-secondary">Submit a skill</p>
            <h1 className="mx-auto mt-5 max-w-4xl font-display text-4xl font-normal leading-[0.98] text-balance sm:text-5xl lg:text-6xl">
              {t.submitPage.title}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-secondary sm:text-lg">
              {t.submitPage.subtitle}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-4xl px-6 py-10 sm:py-12">
          <SkillSubmitForm onSubmit={handleSubmit} />

          <section className="mx-auto mt-8 max-w-2xl border border-border bg-card p-5 sm:mt-10 sm:p-6">
            <p className="mb-3 text-xs uppercase tracking-widest text-secondary">After approval</p>
            <h2 className="font-display text-2xl font-semibold">Add the OpenAgentSkill badge to your README</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Approved skills get a public listing, install handoff API, and badge endpoint. Add the badge to your
              GitHub README so users and agents can verify the listing from the repository.
            </p>
            <pre className="mt-5 overflow-x-auto border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-secondary">
              <code>{`[![OpenAgentSkill](https://www.openagentskill.com/api/badge/YOUR-SKILL-SLUG)](https://www.openagentskill.com/skills/YOUR-SKILL-SLUG)`}</code>
            </pre>
            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              {[
                ['1', 'Submit a GitHub repository with clear README and install path.'],
                ['2', 'Claim the listing after approval to show verified ownership.'],
                ['3', 'Add the badge and link back to the OpenAgentSkill skill page.'],
              ].map(([step, copy]) => (
                <div key={step} className="border border-border bg-background p-4">
                  <span className="font-mono text-xs text-secondary">{step}</span>
                  <p className="mt-2 leading-relaxed">{copy}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Info */}
          <div className="max-w-2xl mx-auto mt-8 sm:mt-12 border-t border-border pt-6 sm:pt-8">
            <h2 className="font-semibold text-lg sm:text-xl mb-4">{t.submitPage.guidelines.title}</h2>
            <ul className="space-y-2 text-sm text-secondary">
              {t.submitPage.guidelines.items.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
