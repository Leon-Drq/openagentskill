import { NextRequest, NextResponse } from 'next/server'
import { getSkillBySlug } from '@/lib/mock-data'

/**
 * Agent-friendly API endpoint for getting a specific skill
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const skill = getSkillBySlug(params.slug)
  const format = request.nextUrl.searchParams.get('format') || 'json'

  if (!skill) {
    return NextResponse.json(
      { error: 'Skill not found' },
      { status: 404 }
    )
  }

  if (format === 'text') {
    // Plain text format optimized for LLM consumption
    const textResponse = `
${skill.name}
${'='.repeat(skill.name.length)}

Tagline: ${skill.tagline}

Description:
${skill.description}

Detailed Information:
${skill.longDescription}

Technical Details:
- Version: ${skill.technical.version}
- Languages: ${skill.technical.language.join(', ')}
- Frameworks: ${skill.technical.frameworks.join(', ')}
- License: ${skill.technical.license}
- Size: ${skill.technical.size}
- Last Updated: ${skill.technical.lastUpdated}

Compatibility:
${skill.compatibility
  .map((c) => `- ${c.platform} (${c.version}): ${c.status}`)
  .join('\n')}

Statistics:
- Downloads: ${skill.stats.downloads.toLocaleString()}
- Stars: ${skill.stats.stars.toLocaleString()}
- Rating: ${skill.stats.rating}/5 (${skill.stats.reviewCount} reviews)
- Used by: ${skill.stats.usedBy.toLocaleString()} agents

Pricing:
- Type: ${skill.pricing.type}
${skill.pricing.price ? `- Price: $${skill.pricing.price} ${skill.pricing.pricingModel}` : ''}

Installation:
pip install oas-${skill.slug}

or

npm install @openagentskill/${skill.slug}

Author:
${skill.author.name} (@${skill.author.username})${skill.author.verified ? ' ✓ Verified' : ''}
${skill.author.bio || ''}

Tags: ${skill.tags.join(', ')}

Documentation: ${skill.technical.documentation}
${skill.technical.repository ? `Repository: ${skill.technical.repository}` : ''}

---
This skill is ${skill.verified ? 'verified' : 'not verified'} by Open Agent Skill.
${skill.featured ? 'Featured skill.' : ''}
`

    return new NextResponse(textResponse, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Agent-Friendly': 'true',
      },
    })
  }

  // JSON format with complete structured data
  return NextResponse.json({
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    tagline: skill.tagline,
    description: skill.description,
    longDescription: skill.longDescription,
    category: skill.category,
    tags: skill.tags,
    verified: skill.verified,
    featured: skill.featured,
    stats: skill.stats,
    pricing: skill.pricing,
    technical: skill.technical,
    compatibility: skill.compatibility,
    author: skill.author,
    install: {
      pip: `pip install oas-${skill.slug}`,
      npm: `npm install @openagentskill/${skill.slug}`,
      instructions: `# Install ${skill.name}\n\nFor Python:\npip install oas-${skill.slug}\n\nFor JavaScript/Node:\nnpm install @openagentskill/${skill.slug}\n\nSee documentation for detailed setup: ${skill.technical.documentation}`,
    },
    urls: {
      detail: `https://openagentskill.com/skills/${skill.slug}`,
      documentation: skill.technical.documentation,
      repository: skill.technical.repository,
    },
    metadata: {
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
    },
    schema: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: skill.name,
      description: skill.description,
      applicationCategory: skill.category,
      offers: {
        '@type': 'Offer',
        price: skill.pricing.price?.toString() || '0',
        priceCurrency: skill.pricing.currency || 'USD',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: skill.stats.rating,
        reviewCount: skill.stats.reviewCount,
      },
      operatingSystem: skill.compatibility.map((c) => c.platform),
      softwareVersion: skill.technical.version,
      datePublished: skill.createdAt,
      dateModified: skill.updatedAt,
      author: {
        '@type': skill.author.verified ? 'Organization' : 'Person',
        name: skill.author.name,
      },
    },
  })
}
