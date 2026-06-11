import { NextResponse } from 'next/server'
import { formatCompactNumber } from '@/lib/quality'

export const revalidate = 3600

const REPO = 'Leon-Drq/openagentskill'

interface GitHubRepoApiResponse {
  full_name?: string
  html_url?: string
  stargazers_count?: number
  forks_count?: number
}

export async function GET() {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'OpenAgentSkill',
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          repo: REPO,
          url: `https://github.com/${REPO}`,
          stars: 0,
          stars_label: '0',
          error: `GitHub API returned ${response.status}`,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
          },
        }
      )
    }

    const data = (await response.json()) as GitHubRepoApiResponse
    const stars = Number(data.stargazers_count || 0)
    const forks = Number(data.forks_count || 0)

    return NextResponse.json(
      {
        ok: true,
        repo: data.full_name || REPO,
        url: data.html_url || `https://github.com/${REPO}`,
        stars,
        stars_label: formatCompactNumber(stars),
        forks,
        forks_label: formatCompactNumber(forks),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        repo: REPO,
        url: `https://github.com/${REPO}`,
        stars: 0,
        stars_label: '0',
        error: error instanceof Error ? error.message : 'Unknown GitHub API error',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        },
      }
    )
  }
}
