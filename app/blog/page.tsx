import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { SubscribeCard } from '@/components/subscribe-card'
import { getBlogHubData, getBlogPosts, type BlogSkillPreview } from '@/lib/blog/generate'
import { SKILL_STACKS } from '@/lib/collections'
import { CORE_RANKINGS, getRankingDefinitions } from '@/lib/rankings'
import { USE_CASES } from '@/lib/use-cases'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'OpenAgentSkill Update - AI Agent Skill Guides & Launch Notes',
  description:
    'OpenAgentSkill Update tracks newly indexed AI agent skills, practical developer workflows, and high-star tools from the agent ecosystem.',
  alternates: {
    canonical: 'https://www.openagentskill.com/blog',
  },
  openGraph: {
    title: 'OpenAgentSkill Update',
    description: 'Launch notes, skill roundups, and practical guides for AI agent builders.',
    url: 'https://www.openagentskill.com/blog',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenAgentSkill Update',
    description: 'Launch notes, skill roundups, and practical guides for AI agent builders.',
    images: ['/opengraph-image'],
  },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatStars(stars: number) {
  if (stars >= 1000) return `${(stars / 1000).toFixed(stars >= 10000 ? 0 : 1)}K`
  return stars.toLocaleString()
}

function SkillLink({ skill }: { skill: BlogSkillPreview }) {
  return (
    <Link
      href={`/skills/${skill.slug}`}
      className="group block border-b border-border py-4 transition-colors hover:border-foreground"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-secondary">
              {skill.name}
            </h3>
            <span className="text-xs font-mono text-secondary">{formatStars(skill.github_stars)} stars</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-secondary line-clamp-2">{skill.description}</p>
        </div>
        <span className="shrink-0 text-xs uppercase tracking-widest text-secondary border border-border px-2 py-1">
          {skill.category === 'chinese' ? 'ZH' : skill.category}
        </span>
      </div>
    </Link>
  )
}

export default async function BlogPage() {
  const [posts, hub] = await Promise.all([getBlogPosts(30), getBlogHubData()])
  const featureSkill = hub.topRecentSkills[0] || hub.latestSkills[0]
  const rankingGuides = getRankingDefinitions()

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="max-w-5xl mx-auto px-6 py-14">
        <section className="border-b border-border pb-12">
          <p className="text-xs uppercase tracking-widest text-secondary mb-4">OpenAgentSkill Update</p>
          <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground text-balance leading-tight">
                New skills, practical workflows, and agent-builder notes.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
                The blog now follows the marketplace itself: launch batches, high-signal skill picks, and guides
                written around real developer scenarios.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/skills?sort=new"
                  className="border border-foreground bg-foreground px-5 py-2 text-sm text-background transition-colors hover:bg-background hover:text-foreground"
                >
                  Browse New Arrivals
                </Link>
                <Link
                  href="/skills?sort=stars"
                  className="border border-border px-5 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
                >
                  Most Starred
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-px border border-border bg-border text-center">
              <div className="bg-background p-4">
                <div className="font-mono text-2xl text-foreground">{hub.totalSkills.toLocaleString()}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Skills</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl text-foreground">{hub.recentLaunchCount.toLocaleString()}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Last 24h</div>
              </div>
              <div className="bg-background p-4">
                <div className="font-mono text-2xl text-foreground">{hub.categoryHighlights.length}</div>
                <div className="mt-1 text-xs uppercase tracking-widest text-secondary">Tracks</div>
              </div>
            </div>
          </div>
        </section>

        {featureSkill && (
          <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="text-xs uppercase tracking-widest text-secondary mb-3">Launch Desk</p>
              <h2 className="font-display text-2xl font-bold text-foreground">The latest batch is live.</h2>
              <p className="mt-3 text-sm leading-relaxed text-secondary">
                {hub.recentLaunchCount.toLocaleString()} new high-star skills were added in the last {hub.launchWindowHours}{' '}
                hours, led by {featureSkill.name} and other agent, automation, RAG, and developer-tool projects.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs uppercase tracking-widest text-secondary">Top by stars</h3>
                {hub.topRecentSkills.slice(0, 4).map((skill) => (
                  <SkillLink key={skill.slug} skill={skill} />
                ))}
              </div>
              <div>
                <h3 className="mb-2 text-xs uppercase tracking-widest text-secondary">Newest indexed</h3>
                {hub.latestSkills.slice(0, 4).map((skill) => (
                  <SkillLink key={skill.slug} skill={skill} />
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-xs uppercase tracking-widest text-secondary mb-3">Explore by use case</p>
            <h2 className="font-display text-2xl font-bold text-foreground">Find the right workflow faster.</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {hub.categoryHighlights.map((item) => (
              <Link
                key={item.category}
                href={`/skills?category=${encodeURIComponent(item.category)}`}
                className="border border-border px-3 py-2 text-sm text-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                {item.category === 'chinese' ? 'Chinese' : item.category}
                <span className="ml-2 font-mono text-xs">{item.count}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-xs uppercase tracking-widest text-secondary mb-3">SEO playbooks</p>
            <h2 className="font-display text-2xl font-bold text-foreground">Evergreen guides for agent builders.</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              These pages turn marketplace data into search-friendly guides that link back to skills, use cases, and stacks.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {USE_CASES.slice(0, 6).map((useCase) => (
              <Link
                key={useCase.slug}
                href={`/blog/use-cases/${useCase.slug}`}
                className="border border-border p-4 transition-colors hover:border-foreground"
              >
                <p className="text-xs uppercase tracking-widest text-secondary">{useCase.eyebrow}</p>
                <h3 className="mt-2 font-display text-lg font-semibold">
                  Best {useCase.shortTitle.toLowerCase()} skills
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-secondary">{useCase.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-xs uppercase tracking-widest text-secondary mb-3">Ranking guides</p>
            <h2 className="font-display text-2xl font-bold text-foreground">Turn the index into searchable lists.</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Ranking pages target high-intent searches like most starred, recently updated, and best skills for each workflow.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[...CORE_RANKINGS, ...rankingGuides.filter((ranking) => ranking.kind === 'use-case').slice(0, 4)].map((ranking) => (
              <Link
                key={ranking.slug}
                href={`/rankings/${ranking.slug}`}
                className="border border-border p-4 transition-colors hover:border-foreground"
              >
                <p className="text-xs uppercase tracking-widest text-secondary">{ranking.eyebrow}</p>
                <h3 className="mt-2 font-display text-lg font-semibold">{ranking.shortTitle}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-secondary">{ranking.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-b border-border py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-xs uppercase tracking-widest text-secondary mb-3">Stack guides</p>
            <h2 className="font-display text-2xl font-bold text-foreground">Turn discovery into adoption.</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {SKILL_STACKS.slice(0, 4).map((stack) => (
              <Link
                key={stack.slug}
                href={`/collections/${stack.slug}`}
                className="border border-border p-4 transition-colors hover:border-foreground"
              >
                <p className="text-xs uppercase tracking-widest text-secondary">{stack.eyebrow}</p>
                <h3 className="mt-2 font-display text-lg font-semibold">{stack.shortTitle}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-secondary">{stack.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-b border-border py-10">
          <SubscribeCard
            source="blog"
            topics={['skills', 'stacks', 'seo-guides']}
            title="Follow OpenAgentSkill Update"
            description="Get the strongest new skills, practical stacks, and guide ideas without scanning the full index."
          />
        </section>

        <section className="py-10">
          <div className="mb-6 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-secondary mb-3">Field Notes</p>
              <h2 className="font-display text-2xl font-bold text-foreground">Latest guides</h2>
            </div>
            <Link href="/skills?sort=quality" className="text-sm text-secondary underline underline-offset-2 hover:text-foreground">
              Browse quality ranking
            </Link>
          </div>

          {posts.length === 0 ? (
            <div className="border border-border p-8">
              <p className="text-secondary text-lg">No guides yet. New skill notes will appear here automatically.</p>
              <Link
                href="/skills"
                className="mt-6 inline-block border border-foreground px-6 py-3 text-sm hover:bg-foreground hover:text-background transition-colors"
              >
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
                          <time className="text-xs text-secondary">{formatDate(post.published_at)}</time>
                        </div>
                        <Link href={`/blog/${post.slug}`}>
                          <h3 className="font-display text-xl font-bold text-foreground group-hover:text-secondary transition-colors text-balance leading-snug mb-2">
                            {post.title}
                          </h3>
                        </Link>
                        <p className="text-secondary leading-relaxed text-sm line-clamp-2">{post.summary}</p>
                        <div className="mt-3 flex items-center gap-4 text-xs text-secondary">
                          {skill && (
                            <>
                              <span>by {skill.author_name}</span>
                              {skill.github_stars > 0 && <span>{skill.github_stars.toLocaleString()} stars</span>}
                            </>
                          )}
                          <Link
                            href={`/blog/${post.slug}`}
                            className="text-foreground hover:text-secondary transition-colors underline underline-offset-2"
                          >
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
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
