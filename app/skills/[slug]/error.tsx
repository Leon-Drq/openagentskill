'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export default function SkillDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Skill detail temporarily unavailable:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center px-4 py-16 sm:px-6">
        <section className="w-full rounded-[10px] border border-border bg-card p-6 shadow-[0_18px_55px_rgba(29,27,24,0.05)] sm:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">Temporary registry delay</p>
          <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">This skill is still published.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-secondary sm:text-base">
            The registry could not reach its data service in time. This is not a “skill not found” result. Retry now or return to search.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#006b4f] px-5 text-sm font-semibold text-white"
            >
              Retry skill
            </button>
            <Link
              href="/skills"
              className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-border px-5 text-sm font-semibold"
            >
              Browse skills
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
