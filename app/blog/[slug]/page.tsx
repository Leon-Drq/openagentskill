import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBlogPostBySlug } from '@/lib/blog/generate'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)
  if (!post) return { title: 'Post Not Found' }

  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      title: `${post.title} — Open Agent Skill`,
      description: post.summary,
      type: 'article',
      url: `https://www.openagentskill.com/blog/${slug}`,
      publishedTime: post.published_at,
    },
    alternates: {
      canonical: `https://www.openagentskill.com/blog/${slug}`,
    },
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Minimal Markdown to HTML converter (handles headings, bold, code, lists, paragraphs)
function renderMarkdown(md: string): string {
  return md
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-muted border border-border p-4 overflow-x-auto text-sm my-6"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 text-sm font-mono">$1</code>')
    // H3
    .replace(/^### (.+)$/gm, '<h3 class="font-display text-lg font-bold mt-8 mb-3 text-foreground">$1</h3>')
    // H2
    .replace(/^## (.+)$/gm, '<h2 class="font-display text-2xl font-bold mt-10 mb-4 text-foreground border-b border-border pb-2">$1</h2>')
    // H1
    .replace(/^# (.+)$/gm, '<h1 class="font-display text-3xl font-bold mt-10 mb-4 text-foreground">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Unordered list items
    .replace(/^- (.+)$/gm, '<li class="ml-4 pl-2 border-l-2 border-border mb-2 text-foreground leading-relaxed">$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, '<ul class="my-4 space-y-1">$&</ul>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-foreground underline underline-offset-2 hover:text-secondary transition-colors">$1</a>')
    // Paragraphs (blank-line separated)
    .replace(/\n\n([^<\n][^\n]*)\n/g, '\n\n<p class="leading-relaxed text-foreground mb-4">$1</p>\n')
    // Remaining bare lines
    .replace(/^([^<\n#][^\n]+)$/gm, '<p class="leading-relaxed text-foreground mb-4">$1</p>')
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)
  if (!post) notFound()

  const skill = Array.isArray(post.skills) ? post.skills[0] : post.skills
  const htmlContent = renderMarkdown(post.content)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary,
    datePublished: post.published_at,
    url: `https://www.openagentskill.com/blog/${slug}`,
    publisher: {
      '@type': 'Organization',
      name: 'Open Agent Skill',
      url: 'https://www.openagentskill.com',
    },
  }

  return (
    <div className="min-h-screen bg-background font-serif">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-display font-bold text-sm tracking-wide uppercase text-foreground hover:text-secondary transition-colors">
            Open Agent Skill
          </Link>
          <nav className="flex items-center gap-6 text-sm text-secondary">
            <Link href="/skills" className="hover:text-foreground transition-colors">Skills</Link>
            <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link href="/submit" className="hover:text-foreground transition-colors">Submit</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 text-xs text-secondary flex items-center gap-2">
          <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-xs">{post.title}</span>
        </nav>

        {/* Article Header */}
        <div className="mb-10 pb-8 border-b border-border">
          {skill?.category && (
            <span className="text-xs uppercase tracking-widest text-secondary border border-border px-2 py-0.5 inline-block mb-4">
              {skill.category === 'chinese' ? '中文' : skill.category}
            </span>
          )}
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight text-balance mb-4">
            {post.title}
          </h1>
          <p className="text-secondary text-lg leading-relaxed mb-6">{post.summary}</p>
          <div className="flex items-center gap-6 text-sm text-secondary flex-wrap">
            <time>{formatDate(post.published_at)}</time>
            {skill && (
              <>
                <span>by {skill.author_name}</span>
                {skill.github_stars > 0 && (
                  <span>{skill.github_stars.toLocaleString()} GitHub stars</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Article Body */}
        <article
          className="prose-custom"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* Skill CTA */}
        {skill && (
          <div className="mt-12 border border-border p-6">
            <p className="text-xs uppercase tracking-widest text-secondary mb-3">Featured Skill</p>
            <h3 className="font-display text-xl font-bold text-foreground mb-2">{skill.name}</h3>
            <div className="flex items-center gap-4 flex-wrap mt-4">
              <Link
                href={`/skills/${skill.slug}`}
                className="border border-foreground px-5 py-2 text-sm hover:bg-foreground hover:text-background transition-colors"
              >
                View Skill
              </Link>
              {skill.github_repo && (
                <a
                  href={`https://github.com/${skill.github_repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-border px-5 py-2 text-sm text-secondary hover:border-foreground hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              )}
            </div>
          </div>
        )}

        {/* Back link */}
        <div className="mt-10 pt-8 border-t border-border">
          <Link href="/blog" className="text-sm text-secondary hover:text-foreground transition-colors underline underline-offset-2">
            Back to Blog
          </Link>
        </div>
      </main>
    </div>
  )
}
