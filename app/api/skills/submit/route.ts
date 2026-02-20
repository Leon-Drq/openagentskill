import { NextRequest, NextResponse } from 'next/server'
import {
  validateGitHubRepo,
  fetchReadme,
  fetchSkillManifest,
  fetchCodeFiles,
  parseGitHubUrl,
} from '@/lib/github/api'
import { reviewSkill } from '@/lib/ai-review/reviewer'
import { mockSkills } from '@/lib/mock-data'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { repository, category, tags, submissionSource = 'web' } = body

    console.log('[v0] Skill submission received:', { repository, category, tags })

    // Parse GitHub URL
    const parsed = parseGitHubUrl(repository)
    if (!parsed) {
      return NextResponse.json(
        { error: '无效的 GitHub 仓库格式' },
        { status: 400 }
      )
    }

    const { owner, repo } = parsed

    // Step 1: Validate GitHub repository
    console.log('[v0] Validating repository...')
    const repoData = await validateGitHubRepo(repository)

    if (!repoData.hasReadme) {
      return NextResponse.json(
        { error: '仓库缺少 README 文件' },
        { status: 400 }
      )
    }

    // Step 2: Fetch repository content
    console.log('[v0] Fetching repository content...')
    const [readmeContent, manifestData, codeFiles] = await Promise.all([
      fetchReadme(owner, repo),
      fetchSkillManifest(owner, repo).catch(() => null),
      fetchCodeFiles(owner, repo).catch(() => []),
    ])

    // Step 3: AI Review
    console.log('[v0] Starting AI review...')
    const review = await reviewSkill({
      repository: repoData.fullName,
      readmeContent,
      codeFiles,
      manifestData,
      githubStats: {
        stars: repoData.stars,
        forks: repoData.forks,
        lastUpdated: repoData.updatedAt,
      },
    })

    console.log('[v0] AI review completed:', {
      approved: review.approved,
      totalScore: review.totalScore,
    })

    // Step 4: Create skill object
    const skillName = manifestData?.name || repo.replace(/-/g, ' ')
    const slug = `${owner}-${repo}`.toLowerCase()

    const newSkill = {
      id: `skill-${Date.now()}`,
      slug,
      name: skillName,
      tagline: manifestData?.description || repoData.description || '',
      description: manifestData?.description || repoData.description || '',
      longDescription: readmeContent.slice(0, 500),
      category,
      tags,
      author: {
        id: `author-${owner}`,
        name: owner,
        username: owner,
        reputation: 0,
        skillCount: 1,
        verified: false,
      },
      stats: {
        downloads: 0,
        stars: repoData.stars,
        forks: repoData.forks,
        usedBy: 0,
        rating: 0,
        reviewCount: 0,
      },
      technical: {
        version: manifestData?.version || '1.0.0',
        language: repoData.language ? [repoData.language] : [],
        frameworks: manifestData?.frameworks || [],
        dependencies: [],
        documentation: `https://github.com/${owner}/${repo}`,
        repository: `https://github.com/${owner}/${repo}`,
        license: repoData.license || 'Unknown',
        size: '0 MB',
        lastUpdated: repoData.updatedAt,
        installCommand: `npx skills add ${owner}/${repo}`,
        githubRepo: `${owner}/${repo}`,
      },
      pricing: {
        type: 'free' as const,
      },
      compatibility: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      featured: false,
      verified: review.approved && review.totalScore >= 35,
    }

    // In a real implementation, this would save to database
    // For now, we'll just log it
    console.log('[v0] Created skill:', newSkill.slug)

    return NextResponse.json({
      success: true,
      approved: review.approved,
      review,
      skill: newSkill,
    })
  } catch (error: any) {
    console.error('[v0] Submission error:', error)

    return NextResponse.json(
      { error: error.message || '提交失败，请稍后重试' },
      { status: 500 }
    )
  }
}
