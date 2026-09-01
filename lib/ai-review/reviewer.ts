import { generateText } from 'ai'
import type { AIReviewResult } from '../schema/skill-schema'
import { SUBMISSION_REVIEW_MODEL } from '@/lib/ai/models'
import { reconcileLicenseReviewFeedback } from '@/lib/skills/license-review'

export interface SkillReviewData {
  repository: string
  readmeContent: string
  codeFiles: { path: string; content: string }[]
  manifestData?: object & { license?: unknown }
  githubStats: {
    stars: number
    forks: number
    lastUpdated: string
    license?: string
    language?: string
  }
}

function clampScore(score: number) {
  return Math.max(0, Math.min(10, Math.round(score)))
}

function includesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text))
}

function heuristicReview(data: SkillReviewData, reason: string): AIReviewResult {
  const documentation = data.readmeContent || ''
  const combinedCode = data.codeFiles.map((file) => file.content).join('\n')
  const allText = `${documentation}\n${combinedCode}`.toLowerCase()
  const hasCriticalPattern = includesAny(allText, [
    /rm\s+-rf/,
    /base64\.b64decode[\s\S]{0,120}exec/,
    /curl[\s\S]{0,80}\|\s*(bash|sh)/,
  ])
  const hasExecutionSurface = includesAny(allText, [
    /child_process/,
    /\bexec\s*\(/,
    /subprocess/,
    /os\.system\s*\(/,
  ])
  const hasEnvSurface = includesAny(allText, [
    /process\.env/,
    /os\.environ/,
    /\.env\b/,
    /load_dotenv/,
  ])
  const hasInstallDocs = includesAny(documentation.toLowerCase(), [
    /install/,
    /npx\s+skills\s+add/,
    /usage/,
    /quickstart/,
    /getting started/,
  ])
  const hasExamples = includesAny(documentation.toLowerCase(), [/example/, /demo/, /usage/, /```/])
  const hasAgentLanguage = includesAny(documentation.toLowerCase(), [
    /agent/,
    /skill/,
    /codex/,
    /claude code/,
    /cursor/,
    /workflow/,
    /automation/,
  ])
  const hasOpenLicense =
    Boolean(data.githubStats.license && data.githubStats.license !== 'NOASSERTION') ||
    Boolean(data.manifestData?.license)

  const security = clampScore(9 - (hasCriticalPattern ? 7 : 0) - (hasExecutionSurface ? 2 : 0) - (hasEnvSurface ? 1 : 0))
  const quality = clampScore(
    4 +
      (documentation.length > 1000 ? 2 : documentation.length > 400 ? 1 : 0) +
      (hasInstallDocs ? 1 : 0) +
      (hasExamples ? 1 : 0) +
      (data.manifestData ? 1 : 0) +
      (data.codeFiles.length > 0 ? 1 : 0)
  )
  const usefulness = clampScore(
    5 +
      (data.githubStats.stars >= 10 ? 1 : 0) +
      (data.githubStats.stars >= 50 ? 1 : 0) +
      (hasAgentLanguage ? 2 : 0) +
      (data.githubStats.forks > 0 ? 1 : 0)
  )
  const compliance = clampScore(5 + (hasOpenLicense ? 3 : 0) + (data.repository.includes('/') ? 1 : 0))
  const totalScore = security + quality + usefulness + compliance

  return {
    approved: false,
    scores: { security, quality, usefulness, compliance },
    totalScore,
    issues: [
      'AI model review was unavailable; heuristic scoring was used and manual review is required',
      ...(hasCriticalPattern ? ['Critical shell or encoded execution pattern detected'] : []),
      ...(hasExecutionSurface ? ['Command execution surface detected'] : []),
      ...(hasEnvSurface ? ['Environment variable access detected'] : []),
      ...(!hasInstallDocs ? ['SKILL.md should include clearer install or usage instructions'] : []),
      ...(!hasOpenLicense ? ['License metadata should be explicit'] : []),
    ],
    suggestions: [
      'Add complete SKILL.md frontmatter and operating instructions',
      'Document setup, inputs, outputs, and safe operating boundaries',
      'Request manual review before automatic publishing',
    ],
    reasoning: `AI review failed (${reason}). Conservative heuristic scores cannot approve automatic publishing.`,
    reviewedAt: new Date().toISOString(),
    reviewModel: 'heuristic-static-v2',
  }
}

export async function reviewSkill(data: SkillReviewData): Promise<AIReviewResult> {
  const codePreview = data.codeFiles
    .slice(0, 6)
    .map((file) => `// ${file.path}\n${file.content.slice(0, 1600)}`)
    .join('\n\n---\n\n')

  const prompt = `You review Agent Skills submitted to OpenAgentSkill.

Repository: ${data.repository}
GitHub adoption: ${data.githubStats.stars} stars, ${data.githubStats.forks} forks
Last updated: ${data.githubStats.lastUpdated}
Repository license detected by GitHub: ${data.githubStats.license || 'Unknown'}

SKILL.md and documentation excerpt:
${data.readmeContent.slice(0, 5000)}

${data.manifestData ? `Parsed SKILL.md metadata:
${JSON.stringify(data.manifestData, null, 2)}` : ''}

Files from the submitted skill directory:
${codePreview}

Score each dimension from 0 to 10:
1. Security: prompt injection, destructive commands, secret access, exfiltration,
   unsafe downloads, hidden execution, and excessive permissions.
2. Quality: purpose, inputs, workflow, outputs, setup, limitations, and safe
   operating boundaries are clear in SKILL.md.
3. Usefulness: this is a concrete reusable agent workflow, not a generic
   repository, link list, placeholder, or thin prompt.
4. Compliance: license clarity, attribution, and authorized lawful use.

Policy:
- GitHub stars are only an adoption signal. Never reject a skill because it has
  zero or few stars.
- A missing repository README is acceptable when SKILL.md is complete.
- approved=true requires security >= 7, every dimension >= 6, total >= 32,
  and no critical risk.
- Quality shortcomings should produce actionable issues and suggestions.
- Automated review never verifies publisher identity.

Return only JSON without markdown fences:
{
  "approved": boolean,
  "scores": {"security": number, "quality": number, "usefulness": number, "compliance": number},
  "issues": string[],
  "suggestions": string[],
  "reasoning": string
}`

  try {
    const result = await generateText({
      model: SUBMISSION_REVIEW_MODEL,
      prompt,
      temperature: 0.2,
      abortSignal: AbortSignal.timeout(20_000),
    })
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid AI response format')

    const reviewData = JSON.parse(jsonMatch[0]) as {
      approved?: boolean
      scores?: Record<string, unknown>
      issues?: unknown
      suggestions?: unknown
      reasoning?: unknown
    }
    const scores = {
      security: clampScore(Number(reviewData.scores?.security || 0)),
      quality: clampScore(Number(reviewData.scores?.quality || 0)),
      usefulness: clampScore(Number(reviewData.scores?.usefulness || 0)),
      compliance: clampScore(Number(reviewData.scores?.compliance || 0)),
    }
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0)
    const meetsAutomaticGate =
      scores.security >= 7 &&
      scores.quality >= 6 &&
      scores.usefulness >= 6 &&
      scores.compliance >= 6 &&
      totalScore >= 32

    const issues = Array.isArray(reviewData.issues)
      ? reviewData.issues.filter((item): item is string => typeof item === 'string').slice(0, 20)
      : []
    const suggestions = Array.isArray(reviewData.suggestions)
      ? reviewData.suggestions.filter((item): item is string => typeof item === 'string').slice(0, 20)
      : []
    const reconciledFeedback = reconcileLicenseReviewFeedback(
      data.githubStats.license || (typeof data.manifestData?.license === 'string' ? data.manifestData.license : null),
      issues,
      suggestions
    )

    return {
      approved: Boolean(reviewData.approved) && meetsAutomaticGate,
      scores,
      totalScore,
      issues: reconciledFeedback.issues,
      suggestions: reconciledFeedback.suggestions,
      reasoning: typeof reviewData.reasoning === 'string' ? reviewData.reasoning.slice(0, 4000) : '',
      reviewedAt: new Date().toISOString(),
      reviewModel: SUBMISSION_REVIEW_MODEL,
    }
  } catch (error) {
    console.error('[submission-review] AI review error:', error)
    return heuristicReview(data, error instanceof Error ? error.message : 'technical error')
  }
}

export function quickSecurityCheck(codeContent: string): {
  safe: boolean
  issues: string[]
} {
  const issues: string[] = []
  const dangerousPatterns = [
    { pattern: /eval\s*\(/gi, message: 'Uses eval() - potential code injection risk' },
    { pattern: /exec\s*\(/gi, message: 'Uses exec() - potential command injection risk' },
    { pattern: /child_process/gi, message: 'Uses child_process - review command execution' },
    { pattern: /rm\s+-rf/gi, message: 'Contains destructive file operations' },
    { pattern: /\$\{.*process\.env/gi, message: 'Accesses environment variables' },
  ]

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(codeContent)) issues.push(message)
  }

  return { safe: issues.length === 0, issues }
}
