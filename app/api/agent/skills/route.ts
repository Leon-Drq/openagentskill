import { NextRequest, NextResponse } from 'next/server'
import { mockSkills } from '@/lib/mock-data'

/**
 * Agent-friendly API endpoint for searching skills
 * Supports both JSON and plain text responses for maximum compatibility
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || ''
  const category = searchParams.get('category')
  const platform = searchParams.get('platform')
  const format = searchParams.get('format') || 'json' // json or text
  const limit = parseInt(searchParams.get('limit') || '10')

  // Filter skills
  let results = mockSkills

  if (query) {
    const lowerQuery = query.toLowerCase()
    results = results.filter(
      (skill) =>
        skill.name.toLowerCase().includes(lowerQuery) ||
        skill.description.toLowerCase().includes(lowerQuery) ||
        skill.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    )
  }

  if (category) {
    results = results.filter((skill) => skill.category === category)
  }

  if (platform) {
    results = results.filter((skill) =>
      skill.compatibility.some((c) => c.platform === platform)
    )
  }

  // Limit results
  results = results.slice(0, limit)

  // Return in requested format
  if (format === 'text') {
    // Plain text format optimized for LLM consumption
    const textResponse = results
      .map(
        (skill, index) => `
${index + 1}. ${skill.name} (${skill.slug})
   ${skill.tagline}
   
   Description: ${skill.description}
   
   Category: ${skill.category}
   Pricing: ${skill.pricing.type}
   Downloads: ${skill.stats.downloads.toLocaleString()}
   Rating: ${skill.stats.rating}/5 (${skill.stats.reviewCount} reviews)
   
   Compatible with: ${skill.compatibility.map((c) => c.platform).join(', ')}
   
   Install: pip install oas-${skill.slug}
   Documentation: ${skill.technical.documentation}
   ${skill.technical.repository ? `Repository: ${skill.technical.repository}` : ''}
   
   ---`
      )
      .join('\n')

    return new NextResponse(
      `Agent Skills Search Results
Query: "${query}"
Found: ${results.length} skills
---
${textResponse}`,
      {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Agent-Friendly': 'true',
        },
      }
    )
  }

  // JSON format with structured data
  return NextResponse.json({
    query,
    filters: {
      category,
      platform,
    },
    total: results.length,
    skills: results.map((skill) => ({
      id: skill.id,
      slug: skill.slug,
      name: skill.name,
      tagline: skill.tagline,
      description: skill.description,
      category: skill.category,
      tags: skill.tags,
      pricing: skill.pricing,
      stats: skill.stats,
      compatibility: skill.compatibility,
      technical: {
        version: skill.technical.version,
        languages: skill.technical.language,
        frameworks: skill.technical.frameworks,
        documentation: skill.technical.documentation,
        repository: skill.technical.repository,
        license: skill.technical.license,
      },
      author: {
        name: skill.author.name,
        username: skill.author.username,
        verified: skill.author.verified,
      },
      install: {
        pip: `pip install oas-${skill.slug}`,
        npm: `npm install @openagentskill/${skill.slug}`,
      },
      urls: {
        detail: `https://openagentskill.com/skills/${skill.slug}`,
        documentation: skill.technical.documentation,
        repository: skill.technical.repository,
      },
    })),
    meta: {
      timestamp: new Date().toISOString(),
      api_version: '1.0',
      agent_friendly: true,
    },
  })
}
