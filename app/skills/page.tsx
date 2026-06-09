import { Metadata } from 'next'
import { getAllSkills, getCategories, convertSkillRecordToManifest, type SkillSortMode, getSkillStats } from '@/lib/db/skills'
import { SkillsPageClient } from '@/components/skills-page-client'
import { getSkillQualityProfile, getPlatformHints } from '@/lib/quality'
import { getSkillTrustProfile } from '@/lib/trust'
import { getUseCaseBySlug, scoreSkillForUseCase, USE_CASES } from '@/lib/use-cases'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Browse AI Agent Skills',
  description: 'Discover AI agent skills for web automation, coding agents, RAG, data processing, workflow automation, and more. Filter by category, GitHub stars, popularity, or recent updates.',
  keywords: ['AI agent skills', 'agent tools', 'Claude tools', 'GPT plugins', 'LangChain tools', 'agent marketplace'],
  openGraph: {
    title: 'Browse AI Agent Skills — Open Agent Skill',
    description: 'Discover high-star AI agent skills, browser automation tools, coding agents, RAG tools, and agent frameworks.',
    type: 'website',
    url: 'https://www.openagentskill.com/skills',
  },
  alternates: {
    canonical: 'https://www.openagentskill.com/skills',
  },
}

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    sort?: string
    category?: string
    useCase?: string
    platform?: string
    quality?: string
    trust?: string
    minStars?: string
  }>
}) {
  const params = await searchParams
  const sort = (params.sort as SkillSortMode) || 'quality'
  const category = params.category || 'all'
  const useCase = params.useCase || 'all'
  const platform = params.platform || 'all'
  const quality = params.quality || 'all'
  const trust = params.trust || 'all'
  const minStars = Number(params.minStars || 0)

  const [records, categories, statsMap] = await Promise.all([
    getAllSkills(sort),
    getCategories(),
    getSkillStats(),
  ])

  const platformOptions = [...new Set(records.flatMap((record) => [
    ...(record.frameworks || []),
    ...getPlatformHints(record),
  ]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))

  const selectedUseCase = useCase !== 'all' ? getUseCaseBySlug(useCase) : undefined

  const enrichedRecords = records.map((record) => {
    const agentStats = statsMap[record.slug] || null
    return {
      record,
      agentStats,
      qualityProfile: getSkillQualityProfile(record, agentStats),
      trustProfile: getSkillTrustProfile(record),
      platformHints: getPlatformHints(record),
    }
  })

  let filteredRecords = enrichedRecords.filter((item) => {
    const { record } = item
    if (category !== 'all' && record.category !== category) return false
    if (selectedUseCase && scoreSkillForUseCase(record, selectedUseCase) < 6) return false
    if (platform !== 'all') {
      const platforms = [
        ...(record.frameworks || []),
        ...item.platformHints,
      ].map((item) => item.toLowerCase())
      if (!platforms.includes(platform.toLowerCase())) return false
    }
    if (minStars > 0 && Number(record.github_stars || 0) < minStars) return false
    if (quality !== 'all' && item.qualityProfile.tier !== quality) return false
    if (trust !== 'all' && item.trustProfile.tier !== trust) return false
    return true
  })

  if (params.q) {
    const query = params.q.toLowerCase()
    filteredRecords = filteredRecords.filter(
      ({ record }) =>
        record.name.toLowerCase().includes(query) ||
        record.description.toLowerCase().includes(query) ||
        (record.long_description || '').toLowerCase().includes(query) ||
        (record.tags || []).some((tag) => tag.toLowerCase().includes(query)) ||
        (record.frameworks || []).some((framework) => framework.toLowerCase().includes(query)) ||
        record.github_repo?.toLowerCase().includes(query)
    )
  }

  const skills = filteredRecords.map(({ record, agentStats, qualityProfile, platformHints, trustProfile }) => {
    return {
      ...convertSkillRecordToManifest(record),
      agentStats,
      qualityProfile,
      platformHints,
      trustProfile,
    }
  })

  return (
    <SkillsPageClient
      skills={skills}
      query={params.q}
      sort={sort}
      category={category}
      categories={categories}
      useCase={useCase}
      useCases={USE_CASES}
      platform={platform}
      platformOptions={platformOptions}
      quality={quality}
      trust={trust}
      minStars={Number.isFinite(minStars) ? minStars : 0}
    />
  )
}
