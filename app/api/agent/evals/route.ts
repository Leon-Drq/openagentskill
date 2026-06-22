import { NextRequest, NextResponse } from 'next/server'
import { getAllSkills, getRelatedSkills, getSkillEventStats } from '@/lib/db/skills'
import { resolveAgentSkill } from '@/lib/agent-resolve'
import { REGISTRY_EVAL_CASES, runRegistryEvals } from '@/lib/registry-evals'
import { buildSkillEvalProfile, formatSkillEvalText } from '@/lib/skill-evals'
import { getSkillBySlugOrFallback, isCuratedSkillFallback, normalizeSkillSlug } from '@/lib/skill-fallbacks'

export const dynamic = 'force-dynamic'

const EVAL_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
}

type TaskEvalStatus = 'passed' | 'review' | 'failed'
type TaskEvalCheckStatus = 'pass' | 'warn' | 'fail' | 'info'

function parseBatchSlugs(params: URLSearchParams) {
  const rawValues = [
    ...params.getAll('slugs'),
    ...params.getAll('skill_slugs'),
    params.get('candidates') || '',
  ]
  const seen = new Set<string>()
  const slugs: string[] = []

  for (const raw of rawValues) {
    for (const value of raw.split(',')) {
      const normalized = normalizeSkillSlug(value)
      if (!normalized || seen.has(normalized)) continue
      seen.add(normalized)
      slugs.push(normalized)
      if (slugs.length >= 12) return slugs
    }
  }

  return slugs
}

function taskEvalCheck(
  id: string,
  label: string,
  status: TaskEvalCheckStatus,
  required: boolean,
  detail: string,
  evidence: string[] = []
) {
  return {
    id,
    label,
    status,
    required_for_agent_install: required,
    detail,
    evidence: evidence.filter(Boolean).slice(0, 4),
  }
}

function taskEvalStatus(checks: ReturnType<typeof taskEvalCheck>[], selectedBlocked: boolean) {
  if (selectedBlocked || checks.some((check) => check.required_for_agent_install && check.status === 'fail')) return 'failed'
  if (checks.some((check) => check.required_for_agent_install && check.status === 'warn')) return 'review'
  return 'passed'
}

function scoreTaskEval(checks: ReturnType<typeof taskEvalCheck>[]) {
  if (checks.length === 0) return 0

  const weights: Record<TaskEvalCheckStatus, number> = {
    pass: 100,
    info: 82,
    warn: 62,
    fail: 18,
  }
  const total = checks.reduce((sum, check) => sum + weights[check.status], 0)
  return Math.round(total / checks.length)
}

function buildBatchEvalSummary(evals: Array<ReturnType<typeof buildSkillEvalProfile>>, missing: Array<{ slug: string; normalized_slug: string }>) {
  const recommended = evals[0] || null

  return {
    total_requested: evals.length + missing.length,
    evaluated: evals.length,
    missing: missing.length,
    passed: evals.filter((item) => item.status === 'passed').length,
    review: evals.filter((item) => item.status === 'review').length,
    failed: evals.filter((item) => item.status === 'failed').length,
    auto_install_allowed: evals.filter((item) => item.decision.auto_install_allowed).length,
    highest_score: recommended?.score || 0,
    recommended: recommended
      ? {
          slug: recommended.slug,
          name: recommended.name,
          status: recommended.status,
          score: recommended.score,
          risk_level: recommended.risk_level,
          install_command: recommended.install.command,
          eval_url: recommended.endpoints.eval,
          audit_url: recommended.endpoints.audit,
        }
      : null,
  }
}

function buildBatchEvalText({
  evals,
  missing,
  task,
}: {
  evals: Array<ReturnType<typeof buildSkillEvalProfile>>
  missing: Array<{ slug: string; normalized_slug: string }>
  task: string | undefined
}) {
  const summary = buildBatchEvalSummary(evals, missing)

  return `OpenAgentSkill Batch Skill Eval
===============================

Task: ${task || 'Evaluate candidate skills before installation'}
Evaluated: ${summary.evaluated}/${summary.total_requested}
Recommended: ${summary.recommended ? `${summary.recommended.name} (${summary.recommended.slug})` : 'No installable candidate'}

Candidates:
${evals.length
  ? evals
      .map(
        (item, index) =>
          `${index + 1}. ${item.name} (${item.slug})
   Status: ${item.status} | Score: ${item.score}/100 | Risk: ${item.risk_level}
   Decision: ${item.decision.recommendation}
   Install: ${item.install.command}
   Audit: ${item.endpoints.audit}
   Eval: ${item.endpoints.eval}`
      )
      .join('\n')
  : '- No valid candidates found'}

Missing:
${missing.length ? missing.map((item) => `- ${item.slug}`).join('\n') : '- None'}

Agent rule:
Use the highest-scoring passed candidate. If the best candidate is review or failed, ask for human approval or compare alternatives before installing.
`
}

function buildTaskEvalText(evalProfile: ReturnType<typeof buildTaskEvalProfile>) {
  return `OpenAgentSkill Task Eval
========================

Task: ${evalProfile.task}
Status: ${evalProfile.status}
Score: ${evalProfile.score}/100
Policy: ${evalProfile.policy_decision.status}

Selected:
${evalProfile.selected_skill ? `${evalProfile.selected_skill.name} (${evalProfile.selected_skill.slug})
Install: ${evalProfile.install.command}
Trust: ${evalProfile.trust.score}/100 ${evalProfile.trust.label}
Audit: ${evalProfile.audit.score}/100 ${evalProfile.audit.risk_label}
Safety: ${evalProfile.safety_gate.score}/100 ${evalProfile.safety_gate.label}
Auto-install allowed: ${evalProfile.safety_gate.auto_install_allowed ? 'yes' : 'no'}
Human review required: ${evalProfile.safety_gate.human_review_required ? 'yes' : 'no'}
Audit URL: ${evalProfile.endpoints.audit}
Eval URL: ${evalProfile.endpoints.eval}` : 'No selected skill'}

Checks:
${evalProfile.checks.map((check) => `- ${check.status.toUpperCase()} ${check.label}: ${check.detail}`).join('\n')}

Alternatives:
${evalProfile.alternatives.length
  ? evalProfile.alternatives.map((item) => `- ${item.name} (${item.slug}) — Trust ${item.trust_score}/100, Audit ${item.audit_score}/100`).join('\n')
  : '- No alternatives in current shortlist'}

Agent next steps:
${evalProfile.agent_next_steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}
`
}

function buildTaskEvalProfile(resolvePayload: Awaited<ReturnType<typeof resolveAgentSkill>>) {
  const selected = resolvePayload.selected
  const recommendation = resolvePayload.recommendation
  const checks = [
    taskEvalCheck(
      'match_found',
      'Task match found',
      selected ? 'pass' : 'fail',
      true,
      selected
        ? `Selected ${selected.skill.name} with match score ${selected.match_score}.`
        : 'No skill matched the task well enough.',
      [selected?.skill.slug || '']
    ),
    taskEvalCheck(
      'install_handoff',
      'Install handoff',
      selected?.install_plan.command ? 'pass' : 'fail',
      true,
      selected?.install_plan.command
        ? 'Install command and handoff are available.'
        : 'No install command or handoff was generated.',
      [selected?.install_plan.command || '']
    ),
    taskEvalCheck(
      'safety_gate',
      'Safety gate',
      selected
        ? selected.safety.blocked
          ? 'fail'
          : selected.safety.auto_install_allowed
            ? 'pass'
            : 'warn'
        : 'fail',
      true,
      selected
        ? selected.safety.safety_tier.recommended_action
        : 'No safety profile was generated.',
      selected?.safety.policy_warnings || []
    ),
    taskEvalCheck(
      'trust_score',
      'Trust Score',
      selected
        ? selected.trust.score >= 80
          ? 'pass'
          : selected.trust.score >= 60
            ? 'warn'
            : 'fail'
        : 'fail',
      true,
      selected
        ? `${selected.trust.score}/100 ${selected.trust.label}`
        : 'No trust score was generated.',
      selected ? [selected.trust.evidence.stars, selected.trust.evidence.license, selected.trust.evidence.lastPushed] : []
    ),
    taskEvalCheck(
      'audit_score',
      'Audit score',
      selected
        ? selected.audit.audit_score >= 82
          ? 'pass'
          : selected.audit.audit_score >= 60
            ? 'warn'
            : 'fail'
        : 'fail',
      true,
      selected
        ? `${selected.audit.audit_score}/100 ${selected.audit.risk_label}`
        : 'No audit score was generated.',
      selected?.audit.warnings || []
    ),
    taskEvalCheck(
      'preinstall_eval_url',
      'Pre-install eval URL',
      selected?.urls.eval ? 'pass' : 'fail',
      true,
      selected?.urls.eval
        ? 'A per-skill eval contract is available before install.'
        : 'No per-skill eval endpoint was generated.',
      [selected?.urls.eval || '']
    ),
    taskEvalCheck(
      'alternatives',
      'Alternatives available',
      resolvePayload.alternatives.length > 0 ? 'pass' : 'info',
      false,
      resolvePayload.alternatives.length > 0
        ? 'Alternative skills are available if policy or audit warnings are unacceptable.'
        : 'No close alternatives were returned for this task.',
      resolvePayload.alternatives.map((item) => item.skill.slug)
    ),
    taskEvalCheck(
      'blocked_candidates',
      'Blocked candidates filtered',
      resolvePayload.blocked_candidates.length > 0 ? 'info' : 'pass',
      false,
      resolvePayload.blocked_candidates.length > 0
        ? `${resolvePayload.blocked_candidates.length} blocked candidates were excluded from install recommendation.`
        : 'No blocked candidates appeared in the shortlist.',
      resolvePayload.blocked_candidates.map((item) => item.skill.slug)
    ),
  ]
  const status = taskEvalStatus(checks, Boolean(selected?.safety.blocked))
  const score = scoreTaskEval(checks)

  return {
    version: 'openagentskill-task-eval-v1',
    task: resolvePayload.task,
    agent: resolvePayload.agent,
    generated_at: new Date().toISOString(),
    status: status as TaskEvalStatus,
    score,
    policy_decision: resolvePayload.policy_decision,
    selected_skill: selected
      ? {
          slug: selected.skill.slug,
          name: selected.skill.name,
          url: selected.urls.web,
          repository: selected.urls.repository,
          category: selected.skill.category,
          match_score: selected.match_score,
        }
      : null,
    install: {
      command: selected?.install_plan.command || '',
      target: selected?.install_plan.target || '',
      policy: selected?.safety.safety_tier.auto_install_policy || 'block',
      ready: Boolean(selected?.install_plan.command),
    },
    trust: {
      score: selected?.trust.score || 0,
      label: selected?.trust.label || 'No trust score',
      version: selected?.trust.version || 'unknown',
    },
    audit: {
      score: selected?.audit.audit_score || 0,
      risk_label: selected?.audit.risk_label || 'No audit',
      warnings: selected?.audit.warnings || [],
    },
    safety_gate: {
      score: selected?.safety.score || 0,
      tier: selected?.safety.safety_tier.tier || 'blocked',
      label: selected?.safety.safety_tier.label || 'No safety gate',
      auto_install_policy: selected?.safety.safety_tier.auto_install_policy || 'block',
      auto_install_allowed: Boolean(selected?.safety.auto_install_allowed),
      human_review_required: selected?.safety.human_review_required ?? true,
      blocked: Boolean(selected?.safety.blocked),
    },
    checks,
    alternatives: resolvePayload.alternatives.slice(0, 5).map((candidate) => ({
      slug: candidate.skill.slug,
      name: candidate.skill.name,
      url: candidate.urls.web,
      install_command: candidate.install_plan.command,
      trust_score: candidate.trust.score,
      audit_score: candidate.audit.audit_score,
      safety_score: candidate.safety.score,
    })),
    blocked_candidates: resolvePayload.blocked_candidates.map((candidate) => ({
      slug: candidate.skill.slug,
      name: candidate.skill.name,
      reason: candidate.safety.safety_tier.recommended_action,
    })),
    agent_next_steps: resolvePayload.agent_workflow?.review_checklist
      ? [
          'Read the selected skill audit and per-skill eval before installing.',
          selected?.safety.auto_install_allowed
            ? 'Install only in a sandbox or low-risk workspace first.'
            : 'Ask for human approval before installing this skill.',
          'Run one narrow verification task and report files touched, commands run, network access, warnings, and output.',
          'Use an alternative if any required check failed or the workspace cannot accept the listed risks.',
        ]
      : ['Resolve a task first, then fetch the selected skill eval and audit before installing.'],
    endpoints: {
      resolve: `${resolvePayload.meta.endpoint}?task=${encodeURIComponent(resolvePayload.task)}`,
      web: selected?.urls.web || '',
      api: selected?.urls.api || '',
      audit: selected?.urls.audit || '',
      eval: selected?.urls.eval || '',
      install: selected?.urls.install_api || '',
    },
    recommendation,
  }
}

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug') || request.nextUrl.searchParams.get('skill_slug')
    const batchSlugs = parseBatchSlugs(request.nextUrl.searchParams)
    const format = request.nextUrl.searchParams.get('format') || 'json'
    const task = request.nextUrl.searchParams.get('task') || undefined
    const maxRisk = request.nextUrl.searchParams.get('max_risk') || 'medium'
    const agent = request.nextUrl.searchParams.get('agent') || 'auto'
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 5), 1), 10)
    const minStars = Math.max(Number(request.nextUrl.searchParams.get('min_stars') || 0), 0)

    if (!slug && batchSlugs.length > 0) {
      const results = await Promise.all(
        batchSlugs.map(async (candidateSlug) => {
          const skill = await getSkillBySlugOrFallback(candidateSlug)

          if (!skill) {
            return {
              missing: {
                slug: candidateSlug,
                normalized_slug: normalizeSkillSlug(candidateSlug),
              },
            }
          }

          const [eventStats, relatedSkills] = isCuratedSkillFallback(skill)
            ? [null, []]
            : await Promise.all([
                getSkillEventStats(skill.slug).catch(() => null),
                getRelatedSkills(skill.id, skill.category, 4).catch(() => []),
              ])

          return {
            eval: buildSkillEvalProfile(skill, {
              eventStats,
              alternatives: relatedSkills,
              task,
              maxRisk,
            }),
          }
        })
      )
      const evals = results
        .flatMap((item) => ('eval' in item && item.eval ? [item.eval] : []))
        .sort((a, b) => {
          const statusRank = { passed: 3, review: 2, failed: 1 }
          const statusDelta = statusRank[b.status] - statusRank[a.status]
          return statusDelta || b.score - a.score
        })
      const missing = results.flatMap((item) => ('missing' in item && item.missing ? [item.missing] : []))
      const summary = buildBatchEvalSummary(evals, missing)

      if (format === 'text') {
        return new NextResponse(buildBatchEvalText({ evals, missing, task }), {
          headers: {
            ...EVAL_CACHE_HEADERS,
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Agent-Friendly': 'true',
          },
        })
      }

      return NextResponse.json(
        {
          summary,
          evals,
          missing,
          meta: {
            endpoint: '/api/agent/evals',
            mode: 'batch_skill_eval',
            purpose:
              'Batch pre-install Trust + Eval comparison for candidate skills. Agents should use this after resolve/search and before choosing a skill to install.',
            generated_at: new Date().toISOString(),
            max_candidates: 12,
            examples: {
              json: '/api/agent/evals?slugs=crawl4ai,markitdown&task=parse%20PDFs',
              text: '/api/agent/evals?slugs=crawl4ai,markitdown&task=parse%20PDFs&format=text',
            },
          },
        },
        { headers: EVAL_CACHE_HEADERS }
      )
    }

    if (slug) {
      const skill = await getSkillBySlugOrFallback(slug)

      if (!skill) {
        return NextResponse.json(
          {
            error: `Skill not found: ${slug}`,
            normalized_slug: normalizeSkillSlug(slug),
          },
          { status: 404 }
        )
      }

      const [eventStats, relatedSkills] = isCuratedSkillFallback(skill)
        ? [null, []]
        : await Promise.all([
            getSkillEventStats(skill.slug).catch(() => null),
            getRelatedSkills(skill.id, skill.category, 4).catch(() => []),
          ])
      const evalProfile = buildSkillEvalProfile(skill, {
        eventStats,
        alternatives: relatedSkills,
        task,
        maxRisk,
      })

      if (format === 'text') {
        return new NextResponse(formatSkillEvalText(evalProfile), {
          headers: {
            ...EVAL_CACHE_HEADERS,
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Agent-Friendly': 'true',
          },
        })
      }

      return NextResponse.json(
        {
          eval: evalProfile,
          meta: {
            endpoint: '/api/agent/evals',
            mode: 'skill_eval',
            purpose:
              'Pre-install eval contract for a single skill. Agents should read this before installing a reusable skill.',
            generated_at: new Date().toISOString(),
          },
        },
        { headers: EVAL_CACHE_HEADERS }
      )
    }

    if (task) {
      const resolvePayload = await resolveAgentSkill({
        task,
        agent,
        limit,
        constraints: {
          max_risk: maxRisk,
          needs_install_command: true,
          min_stars: Number.isFinite(minStars) ? minStars : 0,
        },
        live: request.nextUrl.searchParams.get('live') === 'true',
      })
      const evalProfile = buildTaskEvalProfile(resolvePayload)

      if (format === 'text') {
        return new NextResponse(buildTaskEvalText(evalProfile), {
          headers: {
            ...EVAL_CACHE_HEADERS,
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Agent-Friendly': 'true',
          },
        })
      }

      return NextResponse.json(
        {
          eval: evalProfile,
          meta: {
            endpoint: '/api/agent/evals',
            mode: 'task_eval',
            purpose:
              'Task-level pre-install gate. Agents should run this before installing the skill selected by /api/agent/resolve.',
            generated_at: new Date().toISOString(),
          },
        },
        { headers: EVAL_CACHE_HEADERS }
      )
    }

    const skills = await getAllSkills('quality')
    const evals = runRegistryEvals(skills, REGISTRY_EVAL_CASES)

    return NextResponse.json(
      {
        ...evals,
        total_cases: evals.total,
        meta: {
          endpoint: '/api/agent/evals',
          purpose:
            'Registry regression checks. Add ?slug={skill} for a per-skill pre-install Trust + Eval contract.',
          examples: {
            per_skill_json: '/api/agent/evals?slug=crawl4ai',
            per_skill_text: '/api/agent/evals?slug=crawl4ai&format=text',
            task_specific: '/api/agent/evals?slug=crawl4ai&task=scrape%20pricing%20pages&max_risk=medium',
          },
          skills_evaluated: skills.length,
          generated_at: new Date().toISOString(),
        },
      },
      { headers: EVAL_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('Registry eval API error:', error)
    return NextResponse.json({ error: 'Failed to run registry evals' }, { status: 500 })
  }
}
