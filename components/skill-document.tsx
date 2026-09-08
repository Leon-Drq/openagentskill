import { prepareSkillDocument, resolveSkillDocumentUrl } from '@/lib/skills/document'
import { defaultLocale, type Locale } from '@/lib/i18n/config'
import { SkillDocumentText as Text } from '@/components/skill-document-text'
import { SkillDocumentBody } from '@/components/skill-document-body'

export function SkillDocument({ source, summary, sourceUrl, locale = defaultLocale }: { source: string; summary: string; sourceUrl: string; locale?: Locale }) {
  const document = prepareSkillDocument(source)
  const content = <SkillDocumentBody body={document.body} sourceUrl={sourceUrl} locale={locale} />
  const externalSource = resolveSkillDocumentUrl(sourceUrl, sourceUrl)
  return (
    <div className="mt-6 min-w-0" data-skill-document-section>
      {document.isLong ? <>
        <p className="break-words text-base leading-8 text-secondary [overflow-wrap:anywhere]">{summary}</p>
        <details className="skill-document-disclosure mt-5" data-full-document>
          <summary><Text id="readFull" /></summary>
          <p className="my-4 text-xs leading-relaxed text-secondary"><Text id="notice" /></p>
          {content}
        </details>
      </> : content}
      <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-secondary">
        {externalSource && <a href={externalSource} target="_blank" rel="nofollow ugc noopener noreferrer" className="underline underline-offset-4"><Text id="source" /> ↗</a>}
      </div>
      {document.metadata && <details className="skill-document-disclosure mt-4" data-document-metadata><summary><Text id="metadata" /></summary><pre className="skill-document-raw" tabIndex={0}>{document.metadata}</pre></details>}
      <details className="skill-document-disclosure mt-3" data-document-original><summary><Text id="raw" /></summary><pre className="skill-document-raw" tabIndex={0}>{source}</pre></details>
    </div>
  )
}
