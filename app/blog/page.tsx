import type { Metadata } from 'next'
import Link from 'next/link'
import { getBlogPosts } from '@/lib/blog/generate'

export const metadata: Metadata = {
  title: 'Blog - AI Agent Skill Updates & Guides',
  description: 'Latest AI agent skill introductions, tutorials, and updates from Open Agent Skill.',
  alternates: {
    canonical: 'https://www.openagentskill.com/blog',
  },
  openGraph: {
    title: 'Blog — Open Agent Skill',
    description: 'Latest AI agent skill introductions, tutorials, and updates.',
    url: 'https://www.openagentskill.com/blog',
    type: 'website',
  },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function BlogPage() {
  const posts = await getBlogPosts(30)

  return (
    <div className="min-h-screen bg-background font-serif">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-display font-bold text-sm tracking-wide uppercase text-foreground hover:text-secondary transition-colors">
            Open Agent Skill
          </Link>
          <nav className="flex items-center gap-6 text-sm text-secondary">
            <Link href="/skills" className="hover:text-foreground transition-colors">Skills</Link>
            <Link href="/blog" className="text-foreground font-medium">Blog</Link>
            <Link href="/submit" className="hover:text-foreground transition-colors">Submit</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Page Title */}
        <div className="mb-12 border-b border-border pb-8">
          <p className="text-xs uppercase tracking-widest text-secondary mb-3">Editorial</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground text-balance">
            Skill Journal
          </h1>
          <p className="mt-4 text-secondary text-lg leading-relaxed">
            AI-generated introductions and guides for every new skill added to the marketplace.
          </p>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-secondary text-lg">No posts yet. New skills will appear here automatically.</p>
            <Link href="/skills" className="mt-6 inline-block border border-foreground px-6 py-3 text-sm hover:bg-foreground hover:text-background transition-colors">
              Browse Skills
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {posts.map((post) => {
              const skill = Array.isArray(post.skills) ? post.skills[0] : post.skills
              return (
                <article key={post.id} className="py-8 group">
                  <div className="flex items-start gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        {skill?.category && (
                          <span className="text-xs uppercase tracking-widest text-secondary border border-border px-2 py-0.5">
                            {skill.category === 'chinese' ? '中文' : skill.category}
                          </span>
                        )}
                        <time className="text-xs text-secondary">
                          {formatDate(post.published_at)}
                        </time>
                      </div>
                      <Link href={`/blog/${post.slug}`}>
                        <h2 className="font-display text-xl font-bold text-foreground group-hover:text-secondary transition-colors text-balance leading-snug mb-2">
                          {post.title}
                        </h2>
                      </Link>
                      <p className="text-secondary leading-relaxed text-sm line-clamp-2">
                        {post.summary}
                      </p>
                      <div className="mt-3 flex items-center gap-4 text-xs text-secondary">
                        {skill && (
                          <>
                            <span>by {skill.author_name}</span>
                            {skill.github_stars > 0 && (
                              <span>{skill.github_stars.toLocaleString()} stars</span>
                            )}
                          </>
                        )}
                        <Link href={`/blog/${post.slug}`} className="text-foreground hover:text-secondary transition-colors underline underline-offset-2">
                          Read more
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
