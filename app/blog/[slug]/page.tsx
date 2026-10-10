import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArticleLayout } from '@/components/blog/article-layout'
import { ArticleMarkdown } from '@/components/blog/article-markdown'
import { MarketingButtonLink } from '@/components/marketing-page'
import styles from '@/components/blog/editorial.module.css'
import { getBlogPostBySlug } from '@/lib/blog/generate'
import { breadcrumbData, jsonLd, resourceMetadata, RESOURCE_SITE } from '@/lib/seo/resource-pages'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)
  if (!post) return { title: 'Post Not Found', robots: { index: false, follow: true } }
  return resourceMetadata({ title: post.title, description: post.summary, path: `/blog/${slug}`, article: true, publishedTime: post.published_at })
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)
  if (!post) notFound()
  const skill = Array.isArray(post.skills) ? post.skills[0] : post.skills
  const url = `${RESOURCE_SITE}/blog/${slug}`
  const organization = { '@type': 'Organization', name: 'OpenAgentSkill', url: `${RESOURCE_SITE}/about` }
  const structuredData = [{
    '@context': 'https://schema.org', '@type': 'Article', headline: post.title, description: post.summary,
    datePublished: post.published_at, url, mainEntityOfPage: url, inLanguage: 'en', author: organization, publisher: organization,
  }, breadcrumbData([{ name: 'Blog', path: '/blog' }, { name: post.title, path: `/blog/${slug}` }])]

  return <ArticleLayout language="en" backHref="/blog" backLabel="Back to Blog" eyebrow={skill?.category || 'Agent workflows'}
    title={post.title} summary={post.summary} byline="OpenAgentSkill" dateLabel="Published" dateTime={post.published_at}
    date={new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
    <div className={styles.markdown}><ArticleMarkdown content={post.content} /></div>
    {skill && <section className={styles.next} aria-label="Featured Skill">
      <p className="text-sm text-secondary">Featured Skill</p>
      <h2 className="mt-3 font-sans text-xl font-semibold">{skill.name}</h2>
      {skill.author_name && <p className="mt-2 text-sm text-secondary">Skill by {skill.author_name}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <MarketingButtonLink href={`/skills/${skill.slug}`} variant="primary">View Skill</MarketingButtonLink>
        {skill.github_repo && <MarketingButtonLink href={`https://github.com/${skill.github_repo}`} target="_blank" rel="noopener noreferrer">View source on GitHub</MarketingButtonLink>}
      </div>
    </section>}
    <nav className="mt-10 flex flex-wrap gap-3" aria-label="Related resources">
      <MarketingButtonLink href="/blog">More articles</MarketingButtonLink>
      <MarketingButtonLink href="/guides">Explore guides</MarketingButtonLink>
    </nav>
  </ArticleLayout>
}
