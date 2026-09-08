import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { rehypeSkillDocument, quoteSourceWrappers, resolveSkillDocumentUrl } from '@/lib/skills/document'
import { defaultLocale, type Locale } from '@/lib/i18n/config'
import { skillDocumentCopy } from '@/lib/i18n/skill-document-copy'

const documentSchema = { ...defaultSchema, strip: [...(defaultSchema.strip || []), 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'textarea', 'select'] }

/** Server-rendered only: parsing libraries and untrusted HTML never execute in the client. */
export function SkillDocumentBody({ body, sourceUrl, locale = defaultLocale }: { body: string; sourceUrl: string; locale?: Locale }) {
  return (
    <div className="skill-document" data-skill-document>
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, documentSchema], rehypeSkillDocument]}
        urlTransform={value => resolveSkillDocumentUrl(value, sourceUrl) || ''}
        components={{
          a: ({ href, id, children }) => href ? <a id={id} href={href} target={href.startsWith('#skill-doc-') ? undefined : '_blank'} rel="nofollow ugc noopener noreferrer">{children}</a> : <span id={id}>{children}</span>,
          // No automatic requests to README tracking pixels, SVGs or arbitrary remote media.
          img: ({ src, alt }) => typeof src === 'string' && src ? <a href={src} target="_blank" rel="nofollow ugc noopener noreferrer">{alt || skillDocumentCopy(locale, 'image')} ↗</a> : <span>{alt}</span>,
          table: ({ children }) => <div className="skill-document-scroll" role="region" aria-label={skillDocumentCopy(locale, 'table')} tabIndex={0}><table>{children}</table></div>,
          pre: ({ children }) => <pre tabIndex={0} aria-label={skillDocumentCopy(locale, 'code')}>{children}</pre>,
        }}
      >{quoteSourceWrappers(body)}</Markdown>
    </div>
  )
}
