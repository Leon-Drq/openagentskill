import { MetadataRoute } from 'next'
import { getAllSkills } from '@/lib/db/skills'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://openagentskill.com'

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/skills`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
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

  return [...staticPages, ...skillPages]
}
