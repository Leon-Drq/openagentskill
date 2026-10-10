import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Untrusted Markdown stays data: raw HTML is disabled and URLs use the parser's safe transform. */
export function ArticleMarkdown({ content }: { content: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
    h1: ({ children }) => <h2>{children}</h2>,
    table: ({ children }) => <div className="max-w-full overflow-x-auto" role="region" aria-label="Article table" tabIndex={0}><table>{children}</table></div>,
  }}>{content}</ReactMarkdown>
}
