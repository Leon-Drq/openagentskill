import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import type { SkillEventStats, SkillRecord } from '@/lib/db/skills'
import { getSkillDecisionProfile } from '@/lib/decision'
import { getSkillInstallTargets } from '@/lib/install-targets'
import { getPlatformHints, getSkillQualityProfile } from '@/lib/quality'
import { getSkillTrustProfile } from '@/lib/trust'
import { getUseCasesForSkill, scoreSkillForUseCase, USE_CASES } from '@/lib/use-cases'

const SITE_URL = 'https://www.openagentskill.com'

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[\s+,./:_-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
}

function skillSearchText(skill: SkillRecord) {
  return [
    skill.name,
    skill.description,
    skill.long_description,
    skill.tagline,
    skill.category,
    skill.github_repo,
    skill.github_language,
    ...(skill.tags || []),
    ...(skill.frameworks || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function getCanonicalSkillKey(skill: SkillRecord) {
  const repo = (skill.github_repo || skill.repository || '')
    .toLowerCase()
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/^github\.com\//, '')
    .replace(/\/$/, '')

  if (repo) {
    const [owner, name] = repo.split('/')
    if (owner && name) return `${owner}/${name}`
  }

  return skill.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getNameDuplicateKey(skill: SkillRecord) {
  return skill.name
    .toLowerCase()
    .replace(/\b(ai|agent|skill|tool|server|mcp)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

export function getSkillUrl(slug: string) {
  return `${SITE_URL}/skills/${slug}`
}

export function getAgentSkillApiUrl(slug: string) {
  return `${SITE_URL}/api/agent/skills/${slug}`
}

export function getSkillInstallApiUrl(slug: string) {
  return `${SITE_URL}/api/skills/${slug}/install`
}

export function getSkillInstallCommand(skill: SkillRecord) {
  return skill.install_command || `npx skills add ${skill.github_repo}`
}

export function rankSkillsForQuery(skills: SkillRecord[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  const queryTokens = tokenize(query)

  return skills
    .map((skill) => {
      const text = skillSearchText(skill)
      const tags = (skill.tags || []).map((tag) => tag.toLowerCase())
      const frameworks = (skill.frameworks || []).map((framework) => framework.toLowerCase())
      let score = 0

      if (!normalizedQuery) {
        score += Number(skill.quality_score || 0)
        score += Math.min(35, Math.log10(Number(skill.github_stars || 0) + 1) * 8)
      } else {
        if (skill.name.toLowerCase().includes(normalizedQuery)) score += 80
        if (skill.description.toLowerCase().includes(normalizedQuery)) score += 42
        if (text.includes(normalizedQuery)) score += 28

        for (const token of queryTokens) {
          if (skill.name.toLowerCase().includes(token)) score += 28
          if (tags.some((tag) => tag.includes(token))) score += 24
          if (frameworks.some((framework) => framework.includes(token))) score += 20
          if (skill.category.toLowerCase().includes(token)) score += 16
          if (text.includes(token)) score += 8
        }

        for (const useCase of USE_CASES) {
          const useCaseHit =
            normalizedQuery.includes(useCase.slug.replace(/-/g, ' ')) ||
            useCase.keywords.some((keyword) => normalizedQuery.includes(keyword.toLowerCase()))
          if (useCaseHit) score += Math.min(45, scoreSkillForUseCase(skill, useCase) * 4)
        }

        const isGenericWebTask = /\b(websites?|web pages?|pages?|html|crawl|crawler|scrape|scraper|web scraping|pricing|competitor)\b/.test(normalizedQuery)
        const isGenericWebSkill = /\b(web-crawling|crawler|crawl|scraper|scrape|browser|playwright|puppeteer|html|markdown|extraction)\b/.test(text)
        const isLLMReadyWebSkill = /\b(llm-friendly|llm friendly|markdown|structured data|extract structured|web crawler|web scraper)\b/.test(text)
        const isPlatformSpecificExtractor = /\b(google maps|app store|google play|youtube|twitter|x.com|reddit|spotify|instagram|tiktok|linkedin|amazon|ebay|walmart|shopify store)\b/.test(text)
        const isContentTask = /\b(content|blog|post|posts|newsletter|social|copy|copywriting|writing|publish|publishing|product updates?|launch notes?)\b/.test(normalizedQuery)
        const isContentSkill = /\b(content|copywriting|writing|blog|markdown|newsletter|social|summary|summarize|publishing|content-generation|content automation)\b/.test(text)
        const isUnrelatedContentTool = /\b(data-analysis|database|security|scanner|vulnerability|browser-automation|web-automation|testing|qa)\b/.test(text)
        const isFinanceTask = /\b(finance|financial|quant|trading|portfolio|markets?|stocks?|equity|crypto|filings?|edgar|sec filings?|investor|earnings|10-k|10-q|alpha|factor|backtest|risk model)\b/.test(normalizedQuery)
        const isFinanceSkill = /\b(finance|financial|quant|trading|portfolio|market-data|markets?|stocks?|equity|crypto|filings?|edgar|sec filing|investor|earnings|10-k|10-q|alpha|factor|backtest|risk model)\b/.test(text)
        const isSecurityOnlySkill = /\b(security|vulnerability|scanner|nuclei|pentest|cve|sast|exploit|secret scanning)\b/.test(text) && !isFinanceSkill
        const isSportsTask = /\b(sports?|football|soccer|world cup|fifa|matches?|players?|teams?|statsbomb|expected goals|xg|soccernet|scouting|prediction|transfermarkt)\b/.test(normalizedQuery)
        const isSportsSkill = /\b(sports?|football|soccer|world cup|fifa|matches?|players?|teams?|statsbomb|expected goals|xg|soccernet|scouting|prediction|transfermarkt)\b/.test(text)

        if (isGenericWebTask && isGenericWebSkill) score += 42
        if (isGenericWebTask && isLLMReadyWebSkill) score += 28
        if (isGenericWebTask && isPlatformSpecificExtractor && !normalizedQuery.includes('google maps')) score -= 65
        if (isContentTask && skill.category === 'content-automation') score += 70
        if (isContentTask && isContentSkill) score += 42
        if (isContentTask && isUnrelatedContentTool && !isContentSkill) score -= 55
        if (isFinanceTask && skill.category === 'finance-quant') score += 85
        if (isFinanceTask && isFinanceSkill) score += 58
        if (isFinanceTask && isSecurityOnlySkill) score -= 90
        if (isSportsTask && skill.category === 'sports-analytics') score += 85
        if (isSportsTask && isSportsSkill) score += 58
      }

      score += Math.min(24, Number(skill.quality_score || 0) / 4)
      score += Math.min(22, Math.log10(Number(skill.github_stars || 0) + 1) * 5)
      score += Math.min(12, Math.log10(Number(skill.downloads || 0) + 1) * 3)
      if (skill.verified) score += 6

      return { skill, score: Math.round(score * 10) / 10 }
    })
    .filter((item) => !query.trim() || item.score > 18)
    .sort((a, b) => b.score - a.score)
}

export function dedupeRankedSkills<T extends { skill: SkillRecord; score?: number }>(items: T[]) {
  const seenRepoKeys = new Set<string>()
  const seenNames = new Set<string>()
  const deduped: T[] = []

  for (const item of items) {
    const repoKey = getCanonicalSkillKey(item.skill)
    const nameKey = getNameDuplicateKey(item.skill)
    const duplicateByRepo = repoKey && seenRepoKeys.has(repoKey)
    const duplicateByName = nameKey.length >= 5 && seenNames.has(nameKey)

    if (duplicateByRepo || duplicateByName) continue
    if (repoKey) seenRepoKeys.add(repoKey)
    if (nameKey.length >= 5) seenNames.add(nameKey)
    deduped.push(item)
  }

  return deduped
}

export function getRecommendationReasons(skill: SkillRecord, query: string, score?: number) {
  const reasons: string[] = []
  const text = skillSearchText(skill)
  const normalizedQuery = query.trim().toLowerCase()
  const queryTokens = tokenize(query)
  const matchedTokens = queryTokens.filter((token) => text.includes(token)).slice(0, 4)

  if (matchedTokens.length > 0) {
    reasons.push(`Matches task terms: ${matchedTokens.join(', ')}`)
  }
  if (Number(skill.github_stars || 0) >= 10_000) {
    reasons.push(`Strong GitHub adoption: ${Number(skill.github_stars || 0).toLocaleString()} stars`)
  } else if (Number(skill.github_stars || 0) >= 500) {
    reasons.push(`Useful GitHub adoption: ${Number(skill.github_stars || 0).toLocaleString()} stars`)
  }
  if (Number(skill.quality_score || 0) >= 70) {
    reasons.push(`Quality score ${Math.round(Number(skill.quality_score || 0))}/100`)
  }
  if (skill.install_command || skill.github_repo) {
    reasons.push('Install handoff is available')
  }
  if (skill.github_last_pushed_at) {
    reasons.push('Repository freshness signal is available')
  }
  if (normalizedQuery && score !== undefined) {
    reasons.push(`Registry match score ${Math.round(score)}`)
  }

  return reasons.slice(0, 5)
}

export function toRegistrySkill(skill: SkillRecord, eventStats?: SkillEventStats | null) {
  const quality = getSkillQualityProfile(skill)
  const trust = getSkillTrustProfile(skill, false, eventStats || null)
  const audit = buildSkillAudit(skill, eventStats || null)
  const decision = getSkillDecisionProfile(skill, eventStats || null)
  const install = getSkillInstallCommand(skill)

  return {
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    tagline: skill.tagline || skill.description,
    category: skill.category,
    tags: skill.tags || [],
    author: {
      name: skill.author_name,
      verified: skill.verified,
      url: skill.author_url,
    },
    stats: {
      stars: Number(skill.github_stars || 0),
      forks: Number(skill.github_forks || 0),
      downloads: Number(skill.downloads || 0),
      rating: Number(skill.rating || 0),
      review_count: Number(skill.review_count || 0),
      quality_score: Number(skill.quality_score || 0),
    },
    quality,
    trust,
    audit: {
      audit_score: audit.audit_score,
      risk_level: audit.risk_level,
      risk_label: auditRiskLabel(audit.risk_level),
      warnings: audit.warnings.slice(0, 5),
    },
    decision: {
      readiness_score: decision.readinessScore,
      readiness_label: decision.readinessLabel,
      headline: decision.decisionHeadline,
      role: decision.agentRole,
      primary_fit: decision.primaryFit,
      best_for: decision.bestFor,
      risks: decision.riskNotes,
      next_steps: decision.implementationPlan,
    },
    platforms: [...new Set([...(skill.frameworks || []), ...getPlatformHints(skill)])],
    use_cases: getUseCasesForSkill(skill, 4).map((useCase) => ({
      slug: useCase.slug,
      title: useCase.shortTitle,
      url: `${SITE_URL}/use-cases/${useCase.slug}`,
    })),
    install,
    install_targets: getSkillInstallTargets(skill),
    repository: skill.repository,
    github_repo: skill.github_repo,
    version: skill.version,
    license: skill.license,
    updated_at: skill.updated_at,
    canonical_key: getCanonicalSkillKey(skill),
    recommendation_reasons: getRecommendationReasons(skill, '', undefined),
    urls: {
      web: getSkillUrl(skill.slug),
      api: getAgentSkillApiUrl(skill.slug),
      install_api: getSkillInstallApiUrl(skill.slug),
      audit: `${getSkillUrl(skill.slug)}/audit`,
      repository: skill.repository,
    },
  }
}

export function buildInstallHandoff(skill: SkillRecord) {
  const install = getSkillInstallCommand(skill)
  const targets = getSkillInstallTargets(skill)
  const detailUrl = getSkillUrl(skill.slug)

  return {
    skill: {
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      repository: skill.repository,
    },
    recommended_command: install,
    install_targets: targets,
    agent_prompt:
      `Install the "${skill.name}" agent skill only after reviewing the OpenAgentSkill profile and source repository. Start with ${detailUrl}, inspect the trust and audit notes, then use the recommended install handoff: ${install}. After installation, summarize changed files, required setup, and a minimal verification result before using the skill for real work.`,
    safety_checklist: [
      'Review the repository and license before running third-party code.',
      'Prefer a sandbox or isolated project when testing a new skill.',
      'Start with the recommended command, then inspect generated files before committing changes.',
      'Do not execute external side effects, payments, account changes, or credentialed actions without explicit user approval.',
    ],
    verification_steps: [
      'Open the skill documentation or SKILL.md and identify required setup.',
      'Run the smallest safe example for the target task.',
      'Confirm outputs match the task before allowing broader agent use.',
      'Record any missing credentials, policy risks, or manual approvals needed.',
    ],
    do_not_auto_install_when: [
      'The repository or license cannot be reviewed.',
      'The skill requires broad credentials or production account access.',
      'The task involves regulated, private, or high-impact data without user approval.',
    ],
    urls: {
      web: detailUrl,
      api: getAgentSkillApiUrl(skill.slug),
      install_api: getSkillInstallApiUrl(skill.slug),
      repository: skill.repository,
    },
    meta: {
      agent_friendly: true,
      api_version: '1.0',
      generated_at: new Date().toISOString(),
    },
  }
}
