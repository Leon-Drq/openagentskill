import { MetadataRoute } from 'next'
import { mockSkills } from '@/lib/mock-data'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://openagentskill.com'

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/skills`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/api`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
  ]

  // Skill detail pages
  const skillPages = mockSkills.map((skill) => ({
    url: `${baseUrl}/skills/${skill.slug}`,
    lastModified: new Date(skill.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: skill.featured ? 0.9 : 0.7,
  }))

  return [...staticPages, ...skillPages]
}
