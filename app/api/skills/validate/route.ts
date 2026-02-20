import { NextRequest, NextResponse } from 'next/server'
import { validateGitHubRepo, GitHubAPIError } from '@/lib/github/api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { repository } = body

    if (!repository) {
      return NextResponse.json(
        { error: '请提供 GitHub 仓库 URL' },
        { status: 400 }
      )
    }

    // Validate GitHub repository
    const repoData = await validateGitHubRepo(repository)

    // Check basic requirements
    if (!repoData.hasReadme) {
      return NextResponse.json(
        { 
          valid: false,
          error: '仓库缺少 README 文件，请添加后重试'
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      repository: repoData,
    })
  } catch (error) {
    console.error('[v0] Validation error:', error)

    if (error instanceof GitHubAPIError) {
      return NextResponse.json(
        { valid: false, error: error.message },
        { status: error.statusCode || 400 }
      )
    }

    return NextResponse.json(
      { valid: false, error: '验证失败，请稍后重试' },
      { status: 500 }
    )
  }
}
