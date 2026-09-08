import { creatorCopy } from '@/lib/i18n/creator-copy'
import type { Locale } from '@/lib/i18n/config'
export function CreatorMethodology({ locale }: { locale: Locale }) {
  return (
    <details
      id="methodology"
      className="mt-12 scroll-mt-24 border-y border-border py-5 text-sm text-secondary"
    >
      <summary className="cursor-pointer font-semibold text-foreground">
        {creatorCopy(locale, 'Sources and methodology')}
      </summary>
      <ul className="mt-4 max-w-4xl list-disc space-y-3 pl-5 leading-6">
        {[
          'Selected for a public skill source and a clear use case; gallery examples are linked where available.',
          'Public GitHub attribution is not account verification, author endorsement, or a safety audit.',
          'Stars count each selected repository once, not every skill or unrelated project.',
          'Ownership applies only to the linked, approved claims, not every repository shown.',
          'Claiming requires sign-in and repository-control verification. Browsing does not require an account.',
          'Growth history is not available yet; no estimated growth rankings are shown.',
        ].map((key) => (
          <li key={key}>
            {creatorCopy(locale, key as Parameters<typeof creatorCopy>[1])}
          </li>
        ))}
      </ul>
    </details>
  )
}
