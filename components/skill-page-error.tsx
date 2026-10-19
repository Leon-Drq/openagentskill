'use client'

import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { DirectoryRecovery } from '@/components/directory-recovery'
import { useI18n } from '@/lib/i18n/context'
import { directoryCopy } from '@/lib/i18n/directory-copy'

// Route error boundaries keep ISR failures as failures: a transient outage must
// never replace a last-good cached page with a successful empty directory.
// Next 16.3 retry re-fetches the server tree, unlike a reset-only boundary.
export function SkillPageError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { locale } = useI18n()
  const copy = directoryCopy(locale)
  return (
    <div data-skill-page-error className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto min-h-[50vh] max-w-[1440px] px-4 py-16 sm:px-6">
        <h1 className="font-display text-4xl font-normal sm:text-5xl">{copy.title}</h1>
        <div className="mt-8 max-w-3xl">
          <DirectoryRecovery locale={locale} empty pageError onRetry={retry} />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
