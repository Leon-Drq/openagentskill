import type { AIReviewResult } from '@/lib/schema/skill-schema'

export const SKILL_SUBMISSION_MIN_STARS = 10
export const SKILL_SUBMISSION_MIN_TOTAL_SCORE = 32
export const SKILL_SUBMISSION_VERIFIED_SCORE = 35
export const SKILL_SUBMISSION_MIN_SECURITY_SCORE = 7
export const SKILL_SUBMISSION_MIN_DIMENSION_SCORE = 6

type StaticRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface SubmissionStaticAnalysis {
  passed: boolean
  issues: string[]
  riskLevel: StaticRiskLevel
}

export interface SubmissionGateCheck {
  id: string
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
  score?: number
}

export interface SubmissionPolicyGate {
  approved: boolean
  verified: boolean
  status: 'approved' | 'manual_review' | 'rejected'
  min_stars: number
  min_total_score: number
  min_security_score: number
  min_dimension_score: number
  checks: SubmissionGateCheck[]
  issues: string[]
  suggestions: string[]
}

function score(review: AIReviewResult, key: keyof AIReviewResult['scores']) {
  return Number(review.scores?.[key] ?? 0)
}

function checkStatus(pass: boolean, warn = false): SubmissionGateCheck['status'] {
  if (pass) return 'pass'
  return warn ? 'warn' : 'fail'
}

export function evaluateSkillSubmissionPolicy(input: {
  stars: number
  hasReadme: boolean
  staticAnalysis: SubmissionStaticAnalysis
  review: AIReviewResult
}): SubmissionPolicyGate {
  const security = score(input.review, 'security')
  const quality = score(input.review, 'quality')
  const usefulness = score(input.review, 'usefulness')
  const compliance = score(input.review, 'compliance')
  const total = Number(input.review.totalScore || 0)
  const highStaticRisk = input.staticAnalysis.riskLevel === 'high' || input.staticAnalysis.riskLevel === 'critical'

  const checks: SubmissionGateCheck[] = [
    {
      id: 'github_stars',
      label: 'GitHub adoption',
      status: checkStatus(input.stars >= SKILL_SUBMISSION_MIN_STARS),
      detail: `${input.stars} stars, minimum ${SKILL_SUBMISSION_MIN_STARS}`,
      score: input.stars,
    },
    {
      id: 'readme',
      label: 'README presence',
      status: checkStatus(input.hasReadme),
      detail: input.hasReadme ? 'README detected' : 'README is required',
    },
    {
      id: 'static_security',
      label: 'Static security scan',
      status: checkStatus(input.staticAnalysis.passed && !highStaticRisk, input.staticAnalysis.riskLevel === 'high'),
      detail:
        input.staticAnalysis.issues.length > 0
          ? `${input.staticAnalysis.riskLevel} risk: ${input.staticAnalysis.issues.slice(0, 2).join('; ')}`
          : 'No blocked static-analysis patterns detected',
    },
    {
      id: 'ai_security',
      label: 'AI security score',
      status: checkStatus(security >= SKILL_SUBMISSION_MIN_SECURITY_SCORE),
      detail: `${security}/10, minimum ${SKILL_SUBMISSION_MIN_SECURITY_SCORE}`,
      score: security,
    },
    {
      id: 'ai_quality',
      label: 'AI quality score',
      status: checkStatus(quality >= SKILL_SUBMISSION_MIN_DIMENSION_SCORE),
      detail: `${quality}/10, minimum ${SKILL_SUBMISSION_MIN_DIMENSION_SCORE}`,
      score: quality,
    },
    {
      id: 'ai_usefulness',
      label: 'AI usefulness score',
      status: checkStatus(usefulness >= SKILL_SUBMISSION_MIN_DIMENSION_SCORE),
      detail: `${usefulness}/10, minimum ${SKILL_SUBMISSION_MIN_DIMENSION_SCORE}`,
      score: usefulness,
    },
    {
      id: 'ai_compliance',
      label: 'AI compliance score',
      status: checkStatus(compliance >= SKILL_SUBMISSION_MIN_DIMENSION_SCORE),
      detail: `${compliance}/10, minimum ${SKILL_SUBMISSION_MIN_DIMENSION_SCORE}`,
      score: compliance,
    },
    {
      id: 'ai_total',
      label: 'AI total score',
      status: checkStatus(total >= SKILL_SUBMISSION_MIN_TOTAL_SCORE),
      detail: `${total}/40, minimum ${SKILL_SUBMISSION_MIN_TOTAL_SCORE}`,
      score: total,
    },
  ]

  const failedChecks = checks.filter((check) => check.status === 'fail')
  const warnChecks = checks.filter((check) => check.status === 'warn')
  const modelRejected = !input.review.approved
  const approved = failedChecks.length === 0 && warnChecks.length === 0 && !modelRejected
  const status: SubmissionPolicyGate['status'] =
    approved ? 'approved' : warnChecks.length > 0 && failedChecks.length === 0 ? 'manual_review' : 'rejected'

  const issues = [
    ...failedChecks.map((check) => `${check.label}: ${check.detail}`),
    ...warnChecks.map((check) => `${check.label}: ${check.detail}`),
    ...(modelRejected ? ['AI reviewer did not approve this skill for automatic publishing'] : []),
    ...input.review.issues,
  ]

  return {
    approved,
    verified: approved && total >= SKILL_SUBMISSION_VERIFIED_SCORE,
    status,
    min_stars: SKILL_SUBMISSION_MIN_STARS,
    min_total_score: SKILL_SUBMISSION_MIN_TOTAL_SCORE,
    min_security_score: SKILL_SUBMISSION_MIN_SECURITY_SCORE,
    min_dimension_score: SKILL_SUBMISSION_MIN_DIMENSION_SCORE,
    checks,
    issues: Array.from(new Set(issues)),
    suggestions: input.review.suggestions,
  }
}
