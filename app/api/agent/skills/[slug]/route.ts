import { NextRequest, NextResponse } from 'next/server'
import { getSkillBySlug } from '@/lib/db/skills'

/**
 * GET /api/agent/skills/{slug}
 * Full skill details by slug. Database-backed. Agent-friendly.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const format = request.nextUrl.searchParams.get('format') || 'json'

  try {
    const skill = await getSkillBySlug(slug)

    if (!skill) {
      return NextResponse.json(
        { error: `Skill not found: ${slug}` },
        { status: 404 }
      )
    }

    if (format === 'text') {
      const text = `${skill.name}
${'='.repeat(skill.name.length)}

${skill.tagline || skill.description}

Description:
${skill.long_description || skill.description}

Technical Details:
- Version: ${skill.version}
- License: ${skill.license}
- Platforms: ${(skill.frameworks || []).join(', ')}
- Tags: ${(skill.tags || []).join(', ')}

Statistics:
- GitHub Stars: ${skill.github_stars}
- Downloads: ${skill.downloads}
- Rating: ${skill.rating}/5 (${skill.review_count} reviews)

Author: ${skill.author_name}${skill.verified ? ' (Verified)' : ''}

Install:
${skill.install_command || `npx skills add ${skill.github_repo}`}

Repository: ${skill.repository}

---
Open Agent Skill — ${skill.verified ? 'Verified' : 'Unverified'} skill.`

      return new NextResponse(text, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Agent-Friendly': 'true',
        },
      })
    }

    return NextResponse.json({
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      long_description: skill.long_description,
      tagline: skill.tagline,
      category: skill.category,
      tags: skill.tags,
      author: skill.author_name,
      verified: skill.verified,
      stats: {
        stars: skill.github_stars,
        forks: skill.github_forks,
        downloads: skill.downloads,
        rating: skill.rating,
        review_count: skill.review_count,
      },
      platforms: skill.frameworks,
      install: skill.install_command || `npx skills add ${skill.github_repo}`,
      repository: skill.repository,
      github_repo: skill.github_repo,
      version: skill.version,
      license: skill.license,
      urls: {
        web: `https://openagentskill.com/skills/${skill.slug}`,
        repository: skill.repository,
        api: `/api/agent/skills/${skill.slug}`,
      },
      meta: {
        created_at: skill.created_at,
        updated_at: skill.updated_at,
        agent_friendly: true,
      },
    })
  } catch (error) {
    console.error('Agent skill detail API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch skill details' },
      { status: 500 }
    )
  }
}
