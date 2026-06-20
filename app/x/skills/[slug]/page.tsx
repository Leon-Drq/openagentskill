import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { convertSkillRecordToManifest } from '@/lib/db/skills'
import { getSkillBySlugOrFallback } from '@/lib/skill-fallbacks'

const SITE_URL = 'https://www.openagentskill.com'

const STATIC_SHARE_IMAGES: Record<string, string> = {
  'addyosmani-agent-skills': `${SITE_URL}/og/skills/addyosmani-agent-skills-v7.png`,
}

function getShareImageUrl(slug: string) {
  return STATIC_SHARE_IMAGES[slug] || `${SITE_URL}/skills/${slug}/twitter-image?v=7`
}

function compactNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return String(value)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const record = await getSkillBySlugOrFallback(slug)
  const skill = record ? convertSkillRecordToManifest(record) : null
  if (!skill) return { title: 'Skill Not Found' }

  const shareUrl = `${SITE_URL}/x/skills/${slug}`
  const skillUrl = `${SITE_URL}/skills/${slug}`
  const imageUrl = getShareImageUrl(slug)
  const stars = compactNumber(skill.stats.stars || 0)
  const description = `${skill.description} ${stars} GitHub stars. OpenAgentSkill helps agents compare, audit, and install it.`

  return {
    title: `${skill.name} — OpenAgentSkill Update`,
    description,
    alternates: {
      canonical: shareUrl,
    },
    openGraph: {
      title: `${skill.name} — AI Agent Skill`,
      description,
      type: 'article',
      url: shareUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${skill.name} — OpenAgentSkill card`,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${skill.name} — AI Agent Skill`,
      description,
      images: [
        {
          url: imageUrl,
          alt: `${skill.name} — OpenAgentSkill card`,
        },
      ],
    },
    other: {
      'openagentskill:target': skillUrl,
    },
  }
}

export default async function XSkillSharePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const record = await getSkillBySlugOrFallback(slug)
  if (!record) notFound()

  const skill = convertSkillRecordToManifest(record)
  const imageUrl = getShareImageUrl(slug)
  const skillUrl = `/skills/${slug}`
  const installCommand = skill.technical.installCommand || `npx skills add ${skill.slug}`

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-6 text-xs uppercase tracking-[0.24em] text-secondary">OpenAgentSkill Update</div>
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section>
            <h1 className="font-display text-4xl font-semibold leading-tight text-foreground md:text-6xl">
              {skill.name}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-secondary">
              {skill.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border border-[#c8ded5] bg-[#eef7f2] px-3 py-1 font-mono text-[#006b4f]">
                {compactNumber(skill.stats.stars || 0)} stars
              </span>
              <span className="rounded-full border border-border px-3 py-1 font-mono text-secondary">
                {skill.category}
              </span>
              <span className="rounded-full border border-border px-3 py-1 font-mono text-secondary">
                {record.license || 'Open source'}
              </span>
            </div>
            <code className="mt-7 block overflow-x-auto rounded-[8px] border border-border bg-[#fbfaf7] px-4 py-3 font-mono text-sm text-foreground">
              {installCommand}
            </code>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={skillUrl}
                className="rounded-[8px] bg-[#006b4f] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85"
              >
                View Skill
              </Link>
              {skill.technical.repository && (
                <a
                  href={skill.technical.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[8px] border border-border px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-foreground"
                >
                  GitHub
                </a>
              )}
            </div>
          </section>
          <section className="overflow-hidden rounded-[18px] border border-border bg-[#fbfaf7]">
            <img
              src={imageUrl}
              alt={`${skill.name} OpenAgentSkill social card`}
              className="block aspect-[1200/630] w-full object-cover"
            />
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
