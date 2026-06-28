import { unstable_cache } from 'next/cache'
import { buildResolveFeedback } from '@/lib/agent-outcomes'
import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { buildAgentHandoffTemplates } from '@/lib/agent-integration-kit'
import { getAgentSafetyProfile, type AgentResolveConstraints, type AgentSafetyProfile } from '@/lib/agent-safety'
import { buildAgentReadableSkillMetadata, type AgentReadableSkillMetadata } from '@/lib/agent-readable'
import { getSkillDecisionProfile } from '@/lib/decision'
import {
  getAgentOutcomeStatsMap,
  getAllSkills,
  getSkillEventStatsMap,
  type SkillEventStats,
  type SkillOutcomeStats,
  type SkillRecord,
} from '@/lib/db/skills'
import { getPrimaryInstallCommand, getSkillInstallTargets, type InstallTargetId } from '@/lib/install-targets'
import { getSkillQualityProfile } from '@/lib/quality'
import { dedupeRankedSkills, getRecommendationReasons, normalizeMatchScore, rankSkillsForQuery } from '@/lib/registry'
import { getSkillSupplyProfile, type SkillSupplyProfile } from '@/lib/supply'
import { getSkillTrustProfile, type SkillTrustProfile } from '@/lib/trust'
import { getUseCasesForSkill } from '@/lib/use-cases'

const SITE_URL = 'https://www.openagentskill.com'
const RESOLVE_CANDIDATE_POOL_SIZE = 750
const RESOLVE_CACHE_REVALIDATE = 300
const RESOLVE_QUERY_TIMEOUT_MS = 1800
const FALLBACK_DATE = '2026-06-01T00:00:00.000Z'

function fallbackSkill(input: {
  slug: string
  name: string
  description: string
  repo: string
  category: string
  tags: string[]
  frameworks: string[]
  stars: number
  quality: number
  license?: string
}): SkillRecord {
  return {
    id: `fallback-${input.slug}`,
    slug: input.slug,
    name: input.name,
    description: input.description,
    long_description: input.description,
    tagline: input.description,
    author_name: input.repo.split('/')[0],
    author_email: null,
    author_url: `https://github.com/${input.repo.split('/')[0]}`,
    repository: `https://github.com/${input.repo}`,
    github_repo: input.repo,
    github_stars: input.stars,
    github_forks: 0,
    category: input.category,
    tags: input.tags,
    frameworks: input.frameworks,
    version: '1.0.0',
    license: input.license || 'Unknown',
    install_command: `npx skills add ${input.repo}`,
    npm_package: null,
    verified: false,
    submission_source: 'fallback',
    submitted_by_agent: null,
    ai_review_score: null,
    ai_review_approved: true,
    ai_review_issues: [],
    ai_review_suggestions: [],
    downloads: Math.max(1000, Math.round(input.stars * 1.3)),
    used_by: 0,
    rating: 0,
    review_count: 0,
    quality_score: input.quality,
    quality_signals: null,
    github_language: null,
    github_last_pushed_at: FALLBACK_DATE,
    created_at: FALLBACK_DATE,
    updated_at: FALLBACK_DATE,
  }
}

const RESOLVE_FALLBACK_SKILLS: SkillRecord[] = [
  fallbackSkill({
    slug: 'crawl4ai',
    name: 'Crawl4AI',
    description: 'Open-source LLM-friendly web crawler and scraper for agent workflows.',
    repo: 'unclecode/crawl4ai',
    category: 'Web Scraping',
    tags: ['web scraping', 'crawler', 'research'],
    frameworks: ['Codex', 'Claude Code', 'Cursor'],
    stars: 66_000,
    quality: 96,
    license: 'Apache-2.0',
  }),
  fallbackSkill({
    slug: 'firecrawl',
    name: 'Firecrawl',
    description: 'Turn websites into clean markdown or structured data for retrieval and agents.',
    repo: 'mendableai/firecrawl',
    category: 'Web Scraping',
    tags: ['crawler', 'markdown', 'rag'],
    frameworks: ['Codex', 'Claude Code', 'Cursor'],
    stars: 34_000,
    quality: 94,
    license: 'AGPL-3.0',
  }),
  fallbackSkill({
    slug: 'n8n',
    name: 'n8n',
    description: 'Workflow automation for connecting agents to repeated operational tasks.',
    repo: 'n8n-io/n8n',
    category: 'Workflow Automation',
    tags: ['automation', 'workflow', 'integration'],
    frameworks: ['API', 'CLI', 'Agent workflow'],
    stars: 190_000,
    quality: 92,
  }),
  fallbackSkill({
    slug: 'markitdown',
    name: 'MarkItDown',
    description: 'Convert PDFs, Office documents, and web files into clean markdown for agents.',
    repo: 'microsoft/markitdown',
    category: 'Research',
    tags: ['pdf', 'markdown', 'documents'],
    frameworks: ['Codex', 'Claude Code', 'Cursor'],
    stars: 80_000,
    quality: 93,
    license: 'MIT',
  }),
  fallbackSkill({
    slug: 'hugohe3-ppt-master',
    name: 'Ppt Master',
    description:
      'Generate real editable PowerPoint decks from documents, briefs, templates, and speaker-note workflows.',
    repo: 'hugohe3/ppt-master',
    category: 'Design',
    tags: ['presentation', 'ppt', 'pptx', 'powerpoint', 'slides', 'speaker notes'],
    frameworks: ['Codex', 'Claude Code', 'PowerPoint'],
    stars: 31_000,
    quality: 95,
    license: 'MIT',
  }),
  fallbackSkill({
    slug: 'op7418-guizang-ppt-skill',
    name: 'Guizang Ppt Skill',
    description:
      'AI-agent skill for polished HTML slide decks with editorial layouts, visual prompts, and web presentation runtime.',
    repo: 'op7418/guizang-ppt-skill',
    category: 'Design',
    tags: ['presentation', 'ppt', 'slides', 'html slides', 'deck', 'design'],
    frameworks: ['Codex', 'Claude Code', 'HTML'],
    stars: 15_000,
    quality: 94,
    license: 'MIT',
  }),
  fallbackSkill({
    slug: 'zarazhangrui-frontend-slides',
    name: 'Frontend Slides',
    description: "Create beautiful web-based slides using a coding agent's frontend and design skills.",
    repo: 'zarazhangrui/frontend-slides',
    category: 'Design',
    tags: ['presentation', 'slides', 'html slides', 'frontend', 'deck'],
    frameworks: ['Codex', 'Claude Code', 'Cursor'],
    stars: 23_000,
    quality: 93,
    license: 'MIT',
  }),
  fallbackSkill({
    slug: 'llamaindex',
    name: 'LlamaIndex',
    description: 'Data framework for building RAG and knowledge workflows around agent tasks.',
    repo: 'run-llama/llama_index',
    category: 'RAG',
    tags: ['rag', 'knowledge', 'retrieval'],
    frameworks: ['Python', 'Codex', 'Claude Code'],
    stars: 42_000,
    quality: 91,
    license: 'MIT',
  }),
  fallbackSkill({
    slug: 'openbb',
    name: 'OpenBB',
    description: 'Open-source investment research platform for financial analysis agents.',
    repo: 'OpenBB-finance/OpenBB',
    category: 'Finance',
    tags: ['finance', 'stocks', 'research'],
    frameworks: ['Python', 'Codex', 'Claude Code'],
    stars: 46_000,
    quality: 90,
  }),
  fallbackSkill({
    slug: 'browser-use',
    name: 'Browser Use',
    description: 'Browser automation layer for agents that need to interact with websites.',
    repo: 'browser-use/browser-use',
    category: 'Browser Automation',
    tags: ['browser', 'automation', 'agent'],
    frameworks: ['Python', 'Browser', 'Agent workflow'],
    stars: 75_000,
    quality: 90,
  }),
  fallbackSkill({
    slug: 'playwright',
    name: 'Playwright',
    description: 'Reliable browser automation and testing engine for web agent tasks.',
    repo: 'microsoft/playwright',
    category: 'Browser Automation',
    tags: ['browser', 'testing', 'automation'],
    frameworks: ['Node.js', 'Python', 'Codex'],
    stars: 76_000,
    quality: 89,
    license: 'Apache-2.0',
  }),
  fallbackSkill({
    slug: 'last30days-skill',
    name: 'Last30days Skill',
    description: 'Research recent cross-source changes across Reddit, X, YouTube, Hacker News, and the web.',
    repo: 'mvanhorn/last30days-skill',
    category: 'Research',
    tags: ['research', 'recent events', 'briefing'],
    frameworks: ['Codex', 'Claude Code'],
    stars: 42_500,
    quality: 88,
  }),
  fallbackSkill({
    slug: 'addyosmani-agent-skills',
    name: 'Agent Skills',
    description: 'Production-grade engineering skills for AI coding agents across spec, planning, build, test, review, and shipping workflows.',
    repo: 'addyosmani/agent-skills',
    category: 'Coding Agents',
    tags: ['agent-skills', 'coding-agents', 'engineering', 'quality-gates', 'claude-code', 'cursor'],
    frameworks: ['Claude Code', 'Cursor', 'Gemini CLI', 'Codex'],
    stars: 61_800,
    quality: 94,
    license: 'MIT',
  }),
  fallbackSkill({
    slug: 'serenity-skill',
    name: 'Serenity Skill',
    description: 'Stock analysis skill for market research and financial reasoning workflows.',
    repo: 'muxuuu/serenity-skill',
    category: 'Finance',
    tags: ['stocks', 'finance', 'analysis'],
    frameworks: ['Codex', 'Claude Code'],
    stars: 12_000,
    quality: 86,
  }),
  fallbackSkill({
    slug: 'seedance-2-0',
    name: 'Seedance 2.0 Skill',
    description: 'Creative video generation workflow skill for Seedance 2.0 filmmaking agents.',
    repo: 'Emily2040/seedance-2.0',
    category: 'Design',
    tags: ['video', 'creative', 'seedance'],
    frameworks: ['Codex', 'Claude Code'],
    stars: 8_000,
    quality: 84,
  }),
  fallbackSkill({
    slug: 'vectorbt',
    name: 'Vectorbt',
    description: 'Fast quantitative research and backtesting workflows for financial agents.',
    repo: 'polakowo/vectorbt',
    category: 'Finance',
    tags: ['quant', 'backtesting', 'finance'],
    frameworks: ['Python', 'Codex'],
    stars: 5_400,
    quality: 83,
  }),
]

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

const getResolveCandidatePool = unstable_cache(
  async () => getAllSkills('quality', undefined, RESOLVE_CANDIDATE_POOL_SIZE),
  ['agent-resolve-candidate-pool-v2'],
  { revalidate: RESOLVE_CACHE_REVALIDATE }
)

const getResolveEventStatsMap = unstable_cache(
  async () => getSkillEventStatsMap().catch((): Record<string, SkillEventStats> => ({})),
  ['agent-resolve-event-stats-v1'],
  { revalidate: RESOLVE_CACHE_REVALIDATE }
)

const getResolveOutcomeStatsMap = unstable_cache(
  async () => getAgentOutcomeStatsMap().catch((): Record<string, SkillOutcomeStats> => ({})),
  ['agent-resolve-outcome-stats-v1'],
  { revalidate: RESOLVE_CACHE_REVALIDATE }
)

export interface AgentResolveInput {
  task: string
  agent?: InstallTargetId | 'auto' | string
  limit?: number
  constraints?: AgentResolveConstraints
  live?: boolean
}

function normalizeLimit(limit: number | undefined) {
  const parsed = Number(limit)
  return Math.min(Math.max(Number.isFinite(parsed) && parsed > 0 ? parsed : 5, 1), 10)
}

function normalizeAgent(agent: AgentResolveInput['agent']): InstallTargetId | 'auto' {
  if (agent === 'codex' || agent === 'claude-code' || agent === 'cursor' || agent === 'openagentskill-cli') return agent
  return 'auto'
}

function candidateAllowed(skill: SkillRecord, constraints: AgentResolveConstraints) {
  if (constraints.min_stars && Number(skill.github_stars || 0) < constraints.min_stars) return false
  return true
}

function buildInstallPlan(skill: SkillRecord, agent: InstallTargetId | 'auto') {
  const targets = getSkillInstallTargets(skill)
  const preferred =
    agent === 'auto'
      ? targets.find((target) => target.id === 'openagentskill-cli') || targets[0]
      : targets.find((target) => target.id === agent) || targets[0]
  const command = getPrimaryInstallCommand(skill)

  return {
    target: preferred?.id || 'openagentskill-cli',
    label: preferred?.title || 'OpenAgentSkill CLI',
    command,
    value: preferred?.value || command,
    kind: preferred?.kind || 'command',
    steps: [
      `Review ${skill.name} trust and audit signals before installing.`,
      preferred?.kind === 'agent-prompt' ? 'Send the install prompt to the target agent.' : `Run: ${command}`,
      'Install in a sandbox or low-risk workspace first.',
      'Pin the repository source and re-check the audit before production use.',
    ],
    targets,
  }
}

function buildPolicyDecision(autoInstallAllowed: boolean, policyWarnings: string[]) {
  if (autoInstallAllowed) {
    return {
      status: 'approved_for_agent_install',
      summary: 'Policy allows an agent to install this skill after normal workspace review.',
    }
  }
  if (policyWarnings.length > 0) {
    return {
      status: 'human_review_required',
      summary: 'Do not auto-install. Review policy warnings and audit details before using this skill.',
    }
  }
  return {
    status: 'manual_review_recommended',
    summary: 'Install is possible, but a human should review the audit before allowing agent use.',
  }
}

function buildSafetyPolicyDecision(safety: AgentSafetyProfile) {
  if (safety.blocked) {
    return {
      status: 'blocked_for_auto_install',
      summary: safety.safety_tier.recommended_action,
    }
  }

  if (safety.auto_install_allowed) {
    return {
      status: 'approved_for_agent_install',
      summary: safety.safety_tier.recommended_action,
    }
  }

  if (safety.policy_warnings.length > 0 || safety.human_review_required) {
    return {
      status: 'human_review_required',
      summary: safety.safety_tier.recommended_action,
    }
  }

  return buildPolicyDecision(safety.auto_install_allowed, safety.policy_warnings)
}

function summarizeRisks(candidate: {
  audit: { risk_label: string; warnings: string[] }
  trust: { score: number; label: string; warnings: string[] }
  safety: AgentSafetyProfile
}) {
  const notes = [
    ...candidate.safety.policy_warnings,
    ...candidate.audit.warnings,
    ...candidate.trust.warnings,
  ].filter(Boolean)

  return {
    level: candidate.audit.risk_label,
    safety_tier: candidate.safety.safety_tier.label,
    safety: `${candidate.safety.score}/100 ${candidate.safety.label}`,
    trust: `${candidate.trust.score}/100 ${candidate.trust.label}`,
    notes: [...new Set(notes)].slice(0, 5),
  }
}

interface ResolverRecommendationCandidate {
  skill: {
    slug: string
    name: string
    description: string
    category: string
  }
  urls: {
    web: string
    api: string
    audit: string
    eval: string
    install_api: string
    repository: string
  }
  install_plan: {
    command: string
    target: string
    label: string
    kind: string
    value: string
  }
  recommendation_reasons: string[]
  supply_profile: SkillSupplyProfile
  trust: SkillTrustProfile
  audit: {
    audit_score: number
    risk_label: string
    warnings: string[]
  }
  safety: AgentSafetyProfile
  safety_gate: {
    tier: string
    label: string
    badge: string
    auto_install_policy: string
    auto_install_allowed: boolean
    human_review_required: boolean
    blocked: boolean
    recommended_action: string
    reasons: string[]
  }
  decision: {
    headline: string
  }
  machine_metadata: AgentReadableSkillMetadata
}

type ResolveFeedbackContract = ReturnType<typeof buildResolveFeedback>

function buildResolverRecommendation(
  task: string,
  agent: InstallTargetId | 'auto',
  selected: ResolverRecommendationCandidate | null,
  alternatives: ResolverRecommendationCandidate[],
  feedback: ResolveFeedbackContract
) {
  if (!selected) return null

  const risk = summarizeRisks(selected)
  const alternativeShortlist = alternatives.slice(0, 5).map((candidate) => ({
    slug: candidate.skill.slug,
    name: candidate.skill.name,
    url: candidate.urls.web,
    install_command: candidate.install_plan.command,
    trust_score: candidate.trust.score,
    audit_score: candidate.audit.audit_score,
    safety_score: candidate.safety.score,
    why_consider: candidate.recommendation_reasons[0] || candidate.decision.headline,
    risk: summarizeRisks(candidate),
  }))

  return {
    task,
    agent,
    best_skill: {
      slug: selected.skill.slug,
      name: selected.skill.name,
      description: selected.skill.description,
      category: selected.skill.category,
      url: selected.urls.web,
      api_url: selected.urls.api,
      audit_url: selected.urls.audit,
      eval_url: selected.urls.eval,
      repository: selected.urls.repository,
    },
    install: {
      command: selected.install_plan.command,
      target: selected.install_plan.target,
      label: selected.install_plan.label,
      kind: selected.install_plan.kind,
      value: selected.install_plan.value,
      install_api: selected.urls.install_api,
      ready: selected.supply_profile.install.ready,
      review_required: selected.safety.human_review_required,
      auto_install_allowed: selected.safety.auto_install_allowed,
      policy: selected.safety.safety_tier.auto_install_policy,
    },
    why_recommended: [
      ...selected.recommendation_reasons,
      selected.decision.headline,
      `${selected.trust.score}/100 OpenAgentSkill Trust Score v4`,
      `${selected.audit.audit_score}/100 audit score`,
      `${selected.safety.score}/100 safety score`,
    ].filter(Boolean).slice(0, 8),
    trust_score_v4: {
      score: selected.trust.score,
      tier: selected.trust.tier,
      label: selected.trust.label,
      version: selected.trust.version,
      install_policy: selected.trust.installReadiness.policy,
      evidence: selected.trust.evidence,
      agent_compatibility: selected.trust.agentCompatibility,
      risk: selected.trust.riskSummary,
      outcomes: selected.trust.outcomeEvidence,
      auto_install: selected.trust.autoInstall,
      best_for: selected.trust.bestFor,
      do_not_use_for: selected.trust.doNotUseFor,
      known_risks: selected.trust.knownRisks,
    },
    trust_score_v3: {
      score: selected.trust.score,
      tier: selected.trust.tier,
      label: selected.trust.label,
      version: selected.trust.version,
      install_policy: selected.trust.installReadiness.policy,
      evidence: selected.trust.evidence,
      agent_compatibility: selected.trust.agentCompatibility,
      risk: selected.trust.riskSummary,
    },
    trust_score_v2: {
      score: selected.trust.score,
      tier: selected.trust.tier,
      label: selected.trust.label,
      version: selected.trust.version,
      install_policy: selected.trust.installReadiness.policy,
      evidence: selected.trust.evidence,
      agent_compatibility: selected.trust.agentCompatibility,
      risk: selected.trust.riskSummary,
    },
    risk,
    safety_gate: selected.safety_gate,
    machine_metadata: selected.machine_metadata,
    agent_contract: {
      version: 'openagentskill-resolve-contract-v1',
      input_task: task,
      recommended_skill_slug: selected.skill.slug,
      recommended_skill_name: selected.skill.name,
      install_command: selected.install_plan.command,
      install_policy: selected.safety.safety_tier.auto_install_policy,
      auto_install_allowed: selected.safety.auto_install_allowed,
      human_review_required: selected.safety.human_review_required,
      audit_url: selected.urls.audit,
      eval_url: selected.urls.eval,
      skill_api_url: selected.urls.api,
      do_not_use_when: selected.machine_metadata.do_not_use_when,
      minimum_review_before_use: selected.machine_metadata.agent_contract.minimum_review_before_use,
      expected_agent_output: selected.machine_metadata.agent_contract.expected_agent_output,
    },
    supply_asset: {
      track: selected.supply_profile.track,
      scenario: selected.supply_profile.scenario,
      maintenance: selected.supply_profile.maintenance,
      github_quality: selected.supply_profile.githubQuality,
      coverage_tags: selected.supply_profile.coverageTags,
    },
    alternatives: alternativeShortlist,
    decision_packet: {
      version: 'openagentskill-agent-decision-packet-v1',
      task,
      agent,
      selected_skill: {
        slug: selected.skill.slug,
        name: selected.skill.name,
        url: selected.urls.web,
        api_url: selected.urls.api,
        audit_url: selected.urls.audit,
        repository: selected.urls.repository,
      },
      suited_tasks: selected.machine_metadata.suited_tasks,
      suited_agents: selected.machine_metadata.suited_agents,
      install: {
        command: selected.install_plan.command,
        target: selected.install_plan.target,
        label: selected.install_plan.label,
        policy: selected.safety.safety_tier.auto_install_policy,
        auto_install_allowed: selected.safety.auto_install_allowed,
        human_review_required: selected.safety.human_review_required,
        sandbox_first: !selected.safety.auto_install_allowed || selected.trust.autoInstall.sandboxRequired,
      },
      trust: {
        score: selected.trust.score,
        label: selected.trust.label,
        version: selected.trust.version,
        dimensions: selected.trust.dimensions.map((dimension) => ({
          id: dimension.id,
          label: dimension.label,
          score: dimension.score,
          status: dimension.status,
          detail: dimension.detail,
        })),
      },
      risk: {
        level: risk.level,
        audit_label: risk.level,
        safety: risk.safety,
        trust: risk.trust,
        safety_tier: risk.safety_tier,
        notes: risk.notes,
        do_not_use_when: selected.machine_metadata.do_not_use_when,
        minimum_review_before_use: selected.machine_metadata.agent_contract.minimum_review_before_use,
      },
      alternatives: alternativeShortlist,
      outcome_feedback: {
        event_id: feedback.event_id,
        endpoint: feedback.outcome_api,
        method: feedback.method,
        expected_outcomes: feedback.expected_outcomes,
        payload_template: feedback.json_example,
        cli_example: feedback.cli_example,
      },
      next_agent_action: selected.safety.auto_install_allowed
        ? 'Review audit, install in a sandbox, run one narrow task, then report outcome.'
        : 'Ask for human approval or choose a safer alternative before installing.',
      stable_fields: [
        'decision_packet.selected_skill',
        'decision_packet.install',
        'decision_packet.risk.do_not_use_when',
        'decision_packet.alternatives',
        'decision_packet.outcome_feedback',
      ],
    },
    agent_instruction: [
      `Use ${selected.skill.name} for: ${task}`,
      `Review audit: ${selected.urls.audit}`,
      selected.safety.auto_install_allowed
        ? `Install in a sandbox first with: ${selected.install_plan.command}`
        : `Ask for human approval before installing: ${selected.install_plan.command}`,
      'If the audit or policy warnings are unacceptable, choose one of the alternatives.',
    ].join('\n'),
  }
}

export async function resolveAgentSkill(input: AgentResolveInput) {
  const task = input.task.trim()
  if (!task) throw new Error('Missing required field: task')

  const agent = normalizeAgent(input.agent)
  const limit = normalizeLimit(input.limit)
  const constraints: AgentResolveConstraints = {
    max_risk: input.constraints?.max_risk || 'medium',
    needs_install_command: input.constraints?.needs_install_command ?? true,
    min_stars: Number(input.constraints?.min_stars || 0),
  }
  const [skills, eventStatsMap, outcomeStatsMap] = input.live
    ? await Promise.all([
        withTimeout(getResolveCandidatePool(), RESOLVE_QUERY_TIMEOUT_MS, 'agent resolve candidate query')
          .catch((error) => {
            console.warn('Agent resolve candidate fallback:', error)
            return RESOLVE_FALLBACK_SKILLS
          }),
        withTimeout(getResolveEventStatsMap(), RESOLVE_QUERY_TIMEOUT_MS, 'agent resolve stats query')
          .catch((): Record<string, SkillEventStats> => ({})),
        withTimeout(getResolveOutcomeStatsMap(), RESOLVE_QUERY_TIMEOUT_MS, 'agent resolve outcome query')
          .catch((): Record<string, SkillOutcomeStats> => ({})),
      ])
    : [RESOLVE_FALLBACK_SKILLS, {} as Record<string, SkillEventStats>, {} as Record<string, SkillOutcomeStats>]

  const ranked = dedupeRankedSkills(rankSkillsForQuery(skills, task, outcomeStatsMap))
    .filter(({ skill }) => candidateAllowed(skill, constraints))
    .slice(0, Math.max(limit * 3, 10))
  const topMatchScore = ranked[0]?.score || 0

  const candidates = ranked.map(({ skill, score }, index) => {
    const eventStats = eventStatsMap[skill.slug] || null
    const outcomeStats = outcomeStatsMap[skill.slug] || null
    const audit = buildSkillAudit(skill, eventStats)
    const safety = getAgentSafetyProfile(skill, audit, constraints)
    const trust = getSkillTrustProfile(skill, false, eventStats, outcomeStats)
    const decision = getSkillDecisionProfile(skill, eventStats)
    const useCases = getUseCasesForSkill(skill, 3)
    const supplyProfile = getSkillSupplyProfile(skill, eventStats)
    const matchScore = normalizeMatchScore(score, topMatchScore)

    return {
      rank: index + 1,
      match_score: matchScore,
      raw_match_score: score,
      skill: {
        slug: skill.slug,
        name: skill.name,
        description: skill.description,
        category: skill.category,
        repository: skill.repository,
        github_repo: skill.github_repo,
      },
      recommendation_reasons: getRecommendationReasons(skill, task, matchScore),
      supply_profile: supplyProfile,
      quality: getSkillQualityProfile(skill),
      trust,
      audit: {
        audit_score: audit.audit_score,
        risk_level: audit.risk_level,
        risk_label: auditRiskLabel(audit.risk_level),
        warnings: audit.warnings.slice(0, 5),
      },
      safety,
      safety_gate: {
        tier: safety.safety_tier.tier,
        label: safety.safety_tier.label,
        badge: safety.safety_tier.badge,
        auto_install_policy: safety.safety_tier.auto_install_policy,
        auto_install_allowed: safety.auto_install_allowed,
        human_review_required: safety.human_review_required,
        blocked: safety.blocked,
        recommended_action: safety.safety_tier.recommended_action,
        reasons: safety.safety_tier.reasons,
      },
      decision: {
        readiness_score: decision.readinessScore,
        readiness_label: decision.readinessLabel,
        headline: decision.decisionHeadline,
        role: decision.agentRole,
        best_for: decision.bestFor,
        risks: decision.riskNotes,
        next_steps: decision.implementationPlan,
      },
      install_plan: buildInstallPlan(skill, agent),
      machine_metadata: buildAgentReadableSkillMetadata(skill, {
        eventStats,
        outcomeStats,
        task,
      }),
      use_cases: useCases.map((useCase) => ({
        slug: useCase.slug,
        title: useCase.shortTitle,
        url: `${SITE_URL}/use-cases/${useCase.slug}`,
      })),
      urls: {
        web: `${SITE_URL}/skills/${skill.slug}`,
        api: `${SITE_URL}/api/agent/skills/${skill.slug}`,
        install_api: `${SITE_URL}/api/skills/${skill.slug}/install`,
        audit: `${SITE_URL}/skills/${skill.slug}/audit`,
        eval: `${SITE_URL}/api/agent/evals?slug=${encodeURIComponent(skill.slug)}&task=${encodeURIComponent(task)}&max_risk=${encodeURIComponent(constraints.max_risk || 'medium')}`,
        badge: `${SITE_URL}/api/badge/${skill.slug}?metric=audit`,
        repository: skill.repository,
      },
    }
  })

  const eligibleCandidates = candidates.filter((candidate) => !candidate.safety.blocked)
  const safeCandidates = eligibleCandidates.filter((candidate) =>
    candidate.safety.safety_tier.tier === 'verified' || candidate.safety.safety_tier.tier === 'reviewed'
  )
  const selected =
    safeCandidates.find((candidate) => candidate.safety.auto_install_allowed) ||
    safeCandidates[0] ||
    eligibleCandidates[0] ||
    candidates[0] ||
    null
  const alternatives = eligibleCandidates
    .filter((candidate) => candidate.skill.slug !== selected?.skill.slug)
    .slice(0, Math.max(0, limit - 1))
  const blockedCandidates = candidates
    .filter((candidate) => candidate.safety.blocked)
    .slice(0, 5)
  const feedback = buildResolveFeedback({
    task,
    agent,
    selectedSlug: selected?.skill.slug || null,
    selectedName: selected?.skill.name || null,
    alternativeSlugs: alternatives.slice(0, 5).map((candidate) => candidate.skill.slug),
  })
  const agentDecision = selected
    ? {
        input_task: task,
        recommended_skill: {
          slug: selected.skill.slug,
          name: selected.skill.name,
          url: selected.urls.web,
          audit_url: selected.urls.audit,
          repository: selected.urls.repository,
          safety_tier: selected.safety.safety_tier.label,
          auto_install_policy: selected.safety.safety_tier.auto_install_policy,
        },
        alternative_skills: alternatives.slice(0, 3).map((candidate) => ({
          slug: candidate.skill.slug,
          name: candidate.skill.name,
          url: candidate.urls.web,
          install_command: candidate.install_plan.command,
          why_consider: candidate.recommendation_reasons[0] || candidate.decision.headline,
          risk: summarizeRisks(candidate),
        })),
        install_command: selected.install_plan.command,
        install_target: selected.install_plan.label,
        why_recommended: [
          ...selected.recommendation_reasons,
          selected.decision.headline,
          `${selected.trust.score}/100 OpenAgentSkill Trust Score`,
          `${selected.audit.audit_score}/100 audit score`,
          `${selected.safety.safety_tier.label} safety gate`,
        ].filter(Boolean).slice(0, 6),
        risk_summary: summarizeRisks(selected),
        safety_gate: {
          tier: selected.safety.safety_tier.tier,
          label: selected.safety.safety_tier.label,
          auto_install_policy: selected.safety.safety_tier.auto_install_policy,
          action: selected.safety.safety_tier.recommended_action,
        },
        feedback: {
          event_id: feedback.event_id,
          outcome_api: feedback.outcome_api,
          cli_example: feedback.cli_example,
        },
        agent_next_steps: [
          'Read the audit URL before installing.',
          selected.safety.auto_install_allowed
            ? 'Install in a sandbox or low-risk workspace first.'
            : selected.safety.blocked
              ? 'Do not install automatically. Pick a safer alternative or ask for explicit human review.'
              : 'Ask for human approval before installing.',
          `Use install command: ${selected.install_plan.command}`,
          `After one narrow task, report the outcome with: ${feedback.cli_example}`,
          'Summarize output, warnings, files touched, and whether setup or human review was required.',
        ],
      }
    : null
  const agentWorkflow = selected
    ? {
        mode: 'resolve_review_install',
        recommended_action: selected.safety.safety_tier.recommended_action,
        selected_skill: {
          slug: selected.skill.slug,
          name: selected.skill.name,
          url: selected.urls.web,
          repository: selected.urls.repository,
        },
        install: {
          target: selected.install_plan.target,
          label: selected.install_plan.label,
          kind: selected.install_plan.kind,
          command: selected.install_plan.command,
          value: selected.install_plan.value,
          api: selected.urls.install_api,
        },
        copy_paste_prompt: [
          `Task: ${task}`,
          `Use ${selected.skill.name} from ${selected.urls.web}.`,
          `Review the audit first: ${selected.urls.audit}`,
          `Review the eval first: ${selected.urls.eval}`,
          `Install handoff: ${selected.urls.install_api}`,
          `Install command: ${selected.install_plan.command}`,
          'If audit or policy warnings look unsafe for this workspace, use one of the alternatives instead.',
        ].join('\n'),
        api_sequence: [
          {
            step: 1,
            label: 'Resolve task',
            method: 'GET',
            url: `${SITE_URL}/api/agent/resolve?task=${encodeURIComponent(task)}&agent=${encodeURIComponent(agent)}&max_risk=${encodeURIComponent(constraints.max_risk || 'medium')}`,
          },
          {
            step: 2,
            label: 'Fetch pre-install eval',
            method: 'GET',
            url: selected.urls.eval,
          },
          {
            step: 3,
            label: 'Fetch selected skill profile',
            method: 'GET',
            url: selected.urls.api,
          },
          {
            step: 4,
            label: 'Fetch install handoff',
            method: 'GET',
            url: selected.urls.install_api,
          },
          {
            step: 5,
            label: 'Review audit',
            method: 'GET',
            url: selected.urls.audit,
          },
          {
            step: 6,
            label: 'Report outcome',
            method: 'POST',
            url: feedback.outcome_api,
            body: feedback.json_example,
          },
        ],
        review_checklist: [
          `Safety tier: ${selected.safety.safety_tier.label}`,
          `Safety score: ${selected.safety.score}/100 ${selected.safety.label}`,
          `Audit score: ${selected.audit.audit_score}/100 ${selected.audit.risk_label}`,
          `Trust score: ${selected.trust.score}/100 ${selected.trust.label}`,
          `Readiness: ${selected.decision.readiness_score}/100 ${selected.decision.readiness_label}`,
          ...selected.safety.policy_warnings.slice(0, 3),
          ...selected.audit.warnings.slice(0, 3),
        ],
        fallback_strategy: alternatives.slice(0, 3).map((candidate) => ({
          slug: candidate.skill.slug,
          name: candidate.skill.name,
          reason: candidate.recommendation_reasons[0] || 'Alternative task match',
          url: candidate.urls.web,
          install_api: candidate.urls.install_api,
        })),
        expected_agent_output: {
          selected_skill: 'slug and name',
          install_command: 'command or agent prompt used',
          risk_summary: 'audit, trust, and policy notes',
          next_step: 'what the agent will do after install',
          outcome_event_id: feedback.event_id,
        },
      }
    : null
  const agentHandoff = selected
    ? {
        version: 'openagentskill-agent-handoff-v1',
        mode: 'resolve_compare_review_install',
        task,
        agent,
        selected_skill: {
          slug: selected.skill.slug,
          name: selected.skill.name,
          url: selected.urls.web,
          api_url: selected.urls.api,
          audit_url: selected.urls.audit,
          eval_url: selected.urls.eval,
          repository: selected.urls.repository,
        },
        install_plan: {
          command: selected.install_plan.command,
          target: selected.install_plan.target,
          label: selected.install_plan.label,
          kind: selected.install_plan.kind,
          value: selected.install_plan.value,
          install_api: selected.urls.install_api,
          auto_install_allowed: selected.safety.auto_install_allowed,
          human_review_required: selected.safety.human_review_required,
          policy: selected.safety.safety_tier.auto_install_policy,
        },
        api_sequence: agentWorkflow?.api_sequence || [],
        platform_templates: buildAgentHandoffTemplates({
          task,
          skillName: selected.skill.name,
          skillSlug: selected.skill.slug,
          skillUrl: selected.urls.web,
          auditUrl: selected.urls.audit,
          evalUrl: selected.urls.eval,
          installCommand: selected.install_plan.command,
          installApiUrl: selected.urls.install_api,
          autoInstallAllowed: selected.safety.auto_install_allowed,
          humanReviewRequired: selected.safety.human_review_required,
          alternatives: alternatives.slice(0, 3).map((candidate) => ({
            name: candidate.skill.name,
            slug: candidate.skill.slug,
            url: candidate.urls.web,
            installCommand: candidate.install_plan.command,
          })),
        }),
        review_checklist: agentWorkflow?.review_checklist || [],
        expected_output: agentWorkflow?.expected_agent_output || {
          selected_skill: 'slug and name',
          install_command: 'command or prompt used',
          risk_summary: 'audit, trust, and policy notes',
          next_action: 'install, ask for approval, or choose an alternative',
        },
        feedback: {
          event_id: feedback.event_id,
          outcome_api: feedback.outcome_api,
          cli_example: feedback.cli_example,
          expected_outcomes: feedback.expected_outcomes,
        },
        blocked_actions: [
          'Do not install when safety_gate.blocked is true.',
          'Do not install when the audit or eval reports unacceptable workspace risk.',
          'Do not execute shell commands, access secrets, or call external services without user approval.',
          'Do not keep the skill as an always-on instruction if it only fits a narrow task.',
        ],
      }
    : null
  const recommendation = buildResolverRecommendation(task, agent, selected, alternatives, feedback)

  return {
    task,
    agent,
    constraints,
    feedback,
    recommendation,
    selected,
    alternatives,
    blocked_candidates: blockedCandidates,
    agent_workflow: agentWorkflow,
    agent_handoff: agentHandoff,
    policy_decision: selected
      ? buildSafetyPolicyDecision(selected.safety)
      : {
          status: 'no_match',
          summary: 'No matching skill passed the current filters.',
        },
    agent_decision: agentDecision,
    decision_packet: recommendation?.decision_packet || null,
    benchmark: {
      endpoint: `${SITE_URL}/api/agent/evals`,
      note: 'Use the evals endpoint to regression-test recommendation quality before changing ranking logic.',
    },
    meta: {
      endpoint: '/api/agent/resolve',
      api_version: '2.0',
      generated_at: new Date().toISOString(),
      total_skills_searched: skills.length,
      total_candidates: candidates.length,
      candidate_pool: {
        sort: 'quality',
        size: skills.length,
        note: 'Resolver searches the highest-quality candidate pool for low-latency agent use. Browse /skills for the full public index.',
      },
      contract: {
        best_skill: 'recommendation.best_skill',
        install: 'recommendation.install',
        why: 'recommendation.why_recommended',
        risk: 'recommendation.risk',
        alternatives: 'recommendation.alternatives',
        agent_handoff: 'agent_handoff.platform_templates + agent_handoff.review_checklist',
        decision_packet: 'decision_packet',
      },
    },
  }
}
