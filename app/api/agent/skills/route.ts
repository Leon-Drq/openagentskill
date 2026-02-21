import { NextRequest, NextResponse } from 'next/server'
import { getAllSkills, searchSkills } from '@/lib/db/skills'

/**
 * Agent-friendly API endpoint for searching skills.
 * Reads from database. Supports JSON and plain text.
 * 
 * GET /api/agent/skills?q=web+scraping&limit=5
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || ''
  const category = searchParams.get('category')
  const platform = searchParams.get('platform')
  const format = searchParams.get('format') || 'json'
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)

  try {
    let records = query ? await searchSkills(query) : await getAllSkills()

    if (category) {
      records = records.filter((r) => r.category === category)
    }
    if (platform) {
      records = records.filter((r) =>
        r.frameworks.some((f) => f.toLowerCase().includes(platform.toLowerCase()))
      )
    }

    records = records.slice(0, limit)

    if (format === 'text') {
      const text = records
        .map(
          (r, i) =>
            `${i + 1}. ${r.name} (${r.slug})\n   ${r.description}\n   Stars: ${r.github_stars} | Downloads: ${r.downloads}\n   Install: ${r.install_command || `npx skills add ${r.github_repo}`}\n   Repository: ${r.repository}\n   ---`
        )
        .join('\n')

      return new NextResponse(
        `Open Agent Skill — Search Results\nQuery: "${query}"\nFound: ${records.length} skills\n---\n${text}`,
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Agent-Friendly': 'true',
          },
        }
      )
    }

    return NextResponse.json({
      query,
      filters: { category, platform },
      total: records.length,
      skills: records.map((r) => ({
        slug: r.slug,
        name: r.name,
        description: r.description,
        category: r.category,
        tags: r.tags,
        author: r.author_name,
        verified: r.verified,
        stats: {
          stars: r.github_stars,
          downloads: r.downloads,
          rating: r.rating,
          forks: r.github_forks,
        },
        platforms: r.frameworks,
        install: r.install_command || `npx skills add ${r.github_repo}`,
        repository: r.repository,
        github_repo: r.github_repo,
        version: r.version,
        license: r.license,
        urls: {
          detail: `https://openagentskill.com/skills/${r.slug}`,
          repository: r.repository,
        },
      })),
      meta: {
        timestamp: new Date().toISOString(),
        api_version: '1.0',
        agent_friendly: true,
      },
    })
  } catch (error) {
    console.error('Agent skills API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    )
  }
}
