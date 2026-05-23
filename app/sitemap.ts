import { MetadataRoute } from 'next'
import { getAllSkills } from '@/lib/db/skills'
import { getBlogPosts } from '@/lib/blog/generate'
import { SKILL_STACKS } from '@/lib/collections'
import { getRankingDefinitions } from '@/lib/rankings'
import { USE_CASES } from '@/lib/use-cases'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.openagentskill.com'

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/skills`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/use-cases`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/rankings`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/collections`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/compare`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/submit`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/docs`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/activity`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.6 },
  ]

  const skills = await getAllSkills().catch(() => [])
  const skillPages: MetadataRoute.Sitemap = skills.map((skill) => ({
    url: `${baseUrl}/skills/${skill.slug}`,
    lastModified: new Date(skill.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
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

  const collectionPages: MetadataRoute.Sitemap = SKILL_STACKS.map((stack) => ({
    url: `${baseUrl}/collections/${stack.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
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

  return [
    ...staticPages,
    ...useCasePages,
    ...collectionPages,
    ...rankingPages,
    ...blogUseCasePages,
    ...skillPages,
    ...blogPages,
  ]
}
