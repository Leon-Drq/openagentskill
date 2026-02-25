'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SkillSubmitForm, SubmitFormData } from '@/components/skill-submit-form'
import { useI18n } from '@/lib/i18n/context'
import { LanguageSwitcher } from '@/components/language-switcher'

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
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-background">
          <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex items-baseline justify-between">
              <Link href="/" className="flex items-center gap-2 hover:opacity-60 transition-opacity">
                <span className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-foreground rounded-full flex items-center justify-center font-display font-bold text-xs sm:text-sm">
                  O
                </span>
                <span className="text-xl sm:text-2xl font-display font-bold text-foreground">
                  Open Agent Skill
                </span>
              </Link>
              <div className="flex items-center gap-4 sm:gap-6">
                <nav className="flex gap-3 sm:gap-6 text-xs sm:text-sm">
                  <Link href="/skills" className="text-secondary hover:text-foreground">
                    {t.nav.skills}
                  </Link>
                  <Link href="/docs" className="text-secondary hover:text-foreground">
                    {t.nav.docs}
                  </Link>
                </nav>
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </header>

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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-baseline justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-60 transition-opacity">
              <span className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-foreground rounded-full flex items-center justify-center font-display font-bold text-xs sm:text-sm">
                O
              </span>
              <span className="text-xl sm:text-2xl font-display font-bold text-foreground">
                Open Agent Skill
              </span>
            </Link>
            <div className="flex items-center gap-3 sm:gap-6">
              <nav className="hidden sm:flex gap-6 text-sm">
                <Link href="/skills" className="text-secondary hover:text-foreground">
                  {t.nav.skills}
                </Link>
                <Link href="/docs" className="text-secondary hover:text-foreground">
                  {t.nav.docs}
                </Link>
              </nav>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
            {t.submitPage.title}
          </h1>
          <p className="text-base sm:text-lg text-secondary max-w-2xl mx-auto px-4">
            {t.submitPage.subtitle}
          </p>
        </div>

        <SkillSubmitForm onSubmit={handleSubmit} />

        {/* Info */}
        <div className="max-w-2xl mx-auto mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border">
          <h2 className="font-semibold text-lg sm:text-xl mb-4">{t.submitPage.guidelines.title}</h2>
          <ul className="space-y-2 text-sm text-secondary">
            {t.submitPage.guidelines.items.map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}
