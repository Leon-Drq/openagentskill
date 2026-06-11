import { MetadataRoute } from 'next'
import { getAllSkills } from '@/lib/db/skills'
import { getBlogPosts } from '@/lib/blog/generate'
import { SKILL_STACKS } from '@/lib/collections'
import { getRankingDefinitions } from '@/lib/rankings'
import { LOCALIZED_LANDING_PAGES, getLocalizedLanguageAlternates } from '@/lib/seo/localized-pages'
import { BEST_SKILL_PAGES } from '@/lib/seo/growth-pages'
import { GROWTH_GUIDES } from '@/lib/seo/growth-guides'
import { AGENT_PROFILES, OFFICIAL_CREATORS } from '@/lib/seo/growth-directories'
import { SKILL_PACKS } from '@/lib/skill-packs'
import { USE_CASES } from '@/lib/use-cases'
import { AGENT_TASKS } from '@/lib/agent-tasks'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.openagentskill.com'

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/skills`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/agent-skill`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/agent`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.93 },
    { url: `${baseUrl}/agent-skills-directory`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/agent-skills-registry`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.92 },
    { url: `${baseUrl}/best`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.92 },
    { url: `${baseUrl}/trending`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.92 },
    { url: `${baseUrl}/hot`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/audits`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/official`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/agents`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/use-cases`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/tasks`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.91 },
    { url: `${baseUrl}/rankings`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/reports/weekly`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/reports/monthly`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.86 },
    { url: `${baseUrl}/collections`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/skill-packs`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/compare`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/compare/openagentskill-vs-skills-sh`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.82 },
    { url: `${baseUrl}/alternatives/skills-sh`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.82 },
    { url: `${baseUrl}/guides`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/submit`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/docs`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/cli`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.86 },
    { url: `${baseUrl}/x-kit`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.74 },
    { url: `${baseUrl}/activity`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.6 },
  ]

  const localizedPages: MetadataRoute.Sitemap = Object.entries(LOCALIZED_LANDING_PAGES).map(([locale]) => ({
    url: `${baseUrl}/${locale}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.88,
    alternates: {
      languages: getLocalizedLanguageAlternates(baseUrl),
    },
  }))

  const skills = await getAllSkills().catch(() => [])
  const skillPages: MetadataRoute.Sitemap = skills.map((skill) => ({
    url: `${baseUrl}/skills/${skill.slug}`,
    lastModified: new Date(skill.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const alternativePages: MetadataRoute.Sitemap = skills
    .filter((skill) => Number(skill.github_stars || 0) >= 500)
    .slice(0, 250)
    .map((skill) => ({
      url: `${baseUrl}/alternatives/${skill.slug}`,
      lastModified: new Date(skill.updated_at),
      changeFrequency: 'weekly',
      priority: 0.78,
    }))

  const auditPages: MetadataRoute.Sitemap = skills
    .filter((skill) => Number(skill.github_stars || 0) >= 500)
    .slice(0, 350)
    .map((skill) => ({
      url: `${baseUrl}/skills/${skill.slug}/audit`,
      lastModified: new Date(skill.updated_at),
      changeFrequency: 'weekly',
      priority: 0.76,
    }))

  const posts = await getBlogPosts(100).catch(() => [])
  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.published_at),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const useCasePages: MetadataRoute.Sitemap = USE_CASES.map((useCase) => ({
    url: `${baseUrl}/use-cases/${useCase.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
  }))

  const taskPages: MetadataRoute.Sitemap = AGENT_TASKS.map((task) => ({
    url: `${baseUrl}/tasks/${task.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.86,
  }))

  const collectionPages: MetadataRoute.Sitemap = SKILL_STACKS.map((stack) => ({
    url: `${baseUrl}/collections/${stack.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
  }))

  const skillPackPages: MetadataRoute.Sitemap = SKILL_PACKS.map((pack) => ({
    url: `${baseUrl}/skill-packs/${pack.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.86,
  }))

  const blogUseCasePages: MetadataRoute.Sitemap = USE_CASES.map((useCase) => ({
    url: `${baseUrl}/blog/use-cases/${useCase.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const rankingPages: MetadataRoute.Sitemap = getRankingDefinitions().map((ranking) => ({
    url: `${baseUrl}/rankings/${ranking.slug}`,
    lastModified: new Date(),
    changeFrequency: ranking.kind === 'new-this-week' ? 'daily' : 'weekly',
    priority: ranking.kind === 'use-case' ? 0.82 : 0.85,
  }))

  const bestPages: MetadataRoute.Sitemap = BEST_SKILL_PAGES.map((page) => ({
    url: `${baseUrl}/best/${page.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.88,
  }))

  const officialPages: MetadataRoute.Sitemap = OFFICIAL_CREATORS.map((creator) => ({
    url: `${baseUrl}/official/${creator.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.84,
  }))

  const agentPages: MetadataRoute.Sitemap = AGENT_PROFILES.map((profile) => ({
    url: `${baseUrl}/agents/${profile.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.84,
  }))

  const guidePages: MetadataRoute.Sitemap = GROWTH_GUIDES.map((guide) => ({
    url: `${baseUrl}/guides/${guide.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: guide.intent === 'compare' ? 0.86 : 0.88,
  }))

  return [
    ...staticPages,
    ...localizedPages,
    ...useCasePages,
    ...taskPages,
    ...bestPages,
    ...officialPages,
    ...agentPages,
    ...collectionPages,
    ...skillPackPages,
    ...rankingPages,
    ...guidePages,
    ...blogUseCasePages,
    ...skillPages,
    ...auditPages,
    ...alternativePages,
    ...blogPages,
  ]
}
