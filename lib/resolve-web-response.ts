import type { resolveAgentSkill } from './agent-resolve'

type Result = Awaited<ReturnType<typeof resolveAgentSkill>>
type Candidate = NonNullable<Result['selected']>

// A web view, not a replacement for the versioned machine contract. Never
// recompute eligibility or strip the source/risk decisions to save bytes.
function webCandidate(candidate: Candidate) {
  return {
    skill: {
      slug: candidate.skill.slug,
      name: candidate.skill.name,
      description: candidate.skill.description,
      repository: candidate.skill.repository,
      github_repo: candidate.skill.github_repo,
      github_stars: candidate.skill.github_stars,
    },
    recommendation_reasons: candidate.recommendation_reasons,
    source_evidence: candidate.source_evidence,
    safety: candidate.safety,
    use_cases: candidate.use_cases.map(({ slug, title }) => ({ slug, title })),
  }
}

export function toResolveWebResponse(result: Result) {
  return {
    selected: result.selected ? webCandidate(result.selected) : null,
    alternatives: result.alternatives.map(webCandidate),
    review_candidates: result.review_candidates.map(({ skill }) => ({ skill: { slug: skill.slug, name: skill.name } })),
    policy_decision: result.policy_decision,
    meta: { registry_status: result.meta.registry_status },
  }
}

export type ResolveWebResponse = ReturnType<typeof toResolveWebResponse>
