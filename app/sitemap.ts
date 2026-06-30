import { MetadataRoute } from 'next'
import { SKILL_STACKS } from '@/lib/collections'
import { getRankingDefinitions } from '@/lib/rankings'
import { LOCALIZED_LANDING_PAGES, getLocalizedLanguageAlternates } from '@/lib/seo/localized-pages'
import { BEST_SKILL_PAGES } from '@/lib/seo/growth-pages'
import { GROWTH_GUIDES } from '@/lib/seo/growth-guides'
import { AGENT_PROFILES, OFFICIAL_CREATORS } from '@/lib/seo/growth-directories'
import { SKILL_CLUSTERS } from '@/lib/seo/skill-clusters'
import { CURATED_SKILL_SNAPSHOT } from '@/lib/seo/curated-skill-snapshot'
import { SKILL_PACKS } from '@/lib/skill-packs'
import { USE_CASES } from '@/lib/use-cases'
import { AGENT_TASKS } from '@/lib/agent-tasks'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.openagentskill.com'
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/resolve`, lastModified: now, changeFrequency: 'daily', priority: 0.95 },
    { url: `${baseUrl}/skills`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/agent-skill`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/agent-skills`, lastModified: now, changeFrequency: 'weekly', priority: 0.91 },
    { url: `${baseUrl}/ai-agent-skills`, lastModified: now, changeFrequency: 'weekly', priority: 0.91 },
    { url: `${baseUrl}/skills-registry`, lastModified: now, changeFrequency: 'weekly', priority: 0.91 },
    { url: `${baseUrl}/openagentskill`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/agent`, lastModified: now, changeFrequency: 'daily', priority: 0.93 },
    { url: `${baseUrl}/agent/integration-kit`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/evals/resolve`, lastModified: now, changeFrequency: 'daily', priority: 0.88 },
    { url: `${baseUrl}/agent-skills-directory`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/agent-skills-registry`, lastModified: now, changeFrequency: 'weekly', priority: 0.92 },
    { url: `${baseUrl}/best`, lastModified: now, changeFrequency: 'daily', priority: 0.92 },
    { url: `${baseUrl}/trending`, lastModified: now, changeFrequency: 'hourly', priority: 0.92 },
    { url: `${baseUrl}/hot`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/audits`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/official`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/agents`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/use-cases`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/tasks`, lastModified: now, changeFrequency: 'daily', priority: 0.91 },
    { url: `${baseUrl}/rankings`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/outcomes`, lastModified: now, changeFrequency: 'daily', priority: 0.89 },
    { url: `${baseUrl}/reports/weekly`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/reports/monthly`, lastModified: now, changeFrequency: 'weekly', priority: 0.86 },
    { url: `${baseUrl}/collections`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/skill-packs`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/compare`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/compare/openagentskill-vs-skills-sh`, lastModified: now, changeFrequency: 'monthly', priority: 0.82 },
    { url: `${baseUrl}/compare/openagentskill-vs-agentskills-io`, lastModified: now, changeFrequency: 'monthly', priority: 0.84 },
    { url: `${baseUrl}/alternatives/skills-sh`, lastModified: now, changeFrequency: 'monthly', priority: 0.82 },
    { url: `${baseUrl}/alternatives/agentskills-io`, lastModified: now, changeFrequency: 'monthly', priority: 0.82 },
    { url: `${baseUrl}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/submit`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
	    { url: `${baseUrl}/docs`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
	    { url: `${baseUrl}/cli`, lastModified: now, changeFrequency: 'weekly', priority: 0.86 },
	    { url: `${baseUrl}/creator-kit`, lastModified: now, changeFrequency: 'weekly', priority: 0.82 },
	    { url: `${baseUrl}/x-kit`, lastModified: now, changeFrequency: 'daily', priority: 0.74 },
    { url: `${baseUrl}/activity`, lastModified: now, changeFrequency: 'hourly', priority: 0.6 },
  ]

  const localizedPages: MetadataRoute.Sitemap = Object.entries(LOCALIZED_LANDING_PAGES).map(([locale]) => ({
    url: `${baseUrl}/${locale}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.88,
    alternates: {
      languages: getLocalizedLanguageAlternates(baseUrl),
    },
  }))

  const skillPages: MetadataRoute.Sitemap = CURATED_SKILL_SNAPSHOT.map((skill) => ({
    url: `${baseUrl}/skills/${skill.slug}`,
    lastModified: new Date(skill.github_last_pushed_at || skill.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const alternativePages: MetadataRoute.Sitemap = CURATED_SKILL_SNAPSHOT
    .filter((skill) => Number(skill.github_stars || 0) >= 500)
    .slice(0, 120)
    .map((skill) => ({
      url: `${baseUrl}/alternatives/${skill.slug}`,
      lastModified: new Date(skill.github_last_pushed_at || skill.updated_at),
      changeFrequency: 'weekly',
      priority: 0.78,
    }))

  const auditPages: MetadataRoute.Sitemap = CURATED_SKILL_SNAPSHOT
    .map((skill) => ({
      url: `${baseUrl}/skills/${skill.slug}/audit`,
      lastModified: new Date(skill.github_last_pushed_at || skill.updated_at),
      changeFrequency: 'weekly',
      priority: Number(skill.github_stars || 0) >= 500 ? 0.76 : 0.68,
    }))

  const evalPages: MetadataRoute.Sitemap = CURATED_SKILL_SNAPSHOT
    .map((skill) => ({
      url: `${baseUrl}/skills/${skill.slug}/evals`,
      lastModified: new Date(skill.github_last_pushed_at || skill.updated_at),
      changeFrequency: 'weekly',
      priority: Number(skill.github_stars || 0) >= 500 ? 0.78 : 0.7,
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

  const skillClusterPages: MetadataRoute.Sitemap = SKILL_CLUSTERS.map((cluster) => ({
    url: `${baseUrl}${cluster.path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: cluster.slug === 'world-cup-football' ? 0.9 : 0.88,
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

  const staticBlogPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/blog/introducing-addyosmani-agent-skills`,
      lastModified: new Date('2026-06-17T00:00:00.000Z'),
      changeFrequency: 'monthly',
      priority: 0.82,
    },
  ]

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
    ...skillClusterPages,
    ...useCasePages,
    ...taskPages,
    ...bestPages,
    ...officialPages,
    ...agentPages,
    ...collectionPages,
    ...skillPackPages,
    ...rankingPages,
    ...guidePages,
    ...staticBlogPages,
    ...blogUseCasePages,
    ...skillPages,
    ...auditPages,
    ...evalPages,
    ...alternativePages,
  ]
}
