// Explicit extension keeps the standalone Node regression test executable.
// @ts-expect-error TS5097 is expected; the application build does not emit TypeScript.
import { analyzeCode } from '../security/static-analysis.ts'

const EXECUTABLE_EXTENSIONS = new Set([
  '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd', '.js', '.mjs', '.cjs',
  '.ts', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.exe',
])

const DOCUMENT_RISKS: Array<{ pattern: RegExp; reason: string; level: 'medium' | 'high' | 'critical' }> = [
  { pattern: /(?:curl|wget)[^\n|]{0,300}\|\s*(?:sh|bash|zsh|powershell|pwsh)/i, reason: 'Remote download is piped directly into a shell', level: 'critical' },
  { pattern: /\brm\s+-rf\b|\bRemove-Item\b[^\n]{0,120}\b-Recurse\b/i, reason: 'Destructive recursive deletion instruction detected', level: 'critical' },
  { pattern: /(?:seed phrase|private key|wallet key|browser cookies?|\.ssh\/|\.aws\/credentials)/i, reason: 'Sensitive credential or browser data access is requested', level: 'high' },
  { pattern: /(?:read|collect|upload|send|exfiltrat)[^\n]{0,120}(?:api[_ -]?key|token|secret|password|\.env)/i, reason: 'Credential collection or transmission instruction detected', level: 'high' },
  { pattern: /\b(?:sudo|runas|administrator privileges?|root privileges?)\b/i, reason: 'Elevated privilege instruction detected', level: 'high' },
  { pattern: /\b(?:curl|wget|webhook|axios\.|requests\.(?:get|post)|fetch\s*\()\b/i, reason: 'Network execution requires deeper review', level: 'medium' },
  { pattern: /\b(?:subprocess|child_process|os\.system|exec\s*\(|eval\s*\()\b/i, reason: 'Command execution requires deeper review', level: 'high' },
]

const RISK_ORDER = { low: 0, medium: 1, high: 2, critical: 3 } as const

function fileExtension(path: string) {
  const file = path.slice(path.lastIndexOf('/') + 1)
  const dot = file.lastIndexOf('.')
  return dot >= 0 ? file.slice(dot).toLowerCase() : ''
}

export interface FastTrackInput {
  stars: number
  licenseStatus: 'unknown' | 'missing' | 'restricted' | 'detected'
  updatedAt: string | null | undefined
  document: string
  files: Array<{ path: string; content: string }>
  packageTruncated?: boolean
  hasUnreviewedFiles?: boolean
  now?: Date
}

export interface FastTrackDecision {
  eligible: boolean
  requiresAiReview: boolean
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  reasons: string[]
  hasExecutableFiles: boolean
  ageDays: number | null
}

export function evaluateFastTrackCandidate(input: FastTrackInput): FastTrackDecision {
  const reasons: string[] = []
  const now = input.now || new Date()
  const updatedTime = Date.parse(input.updatedAt || '')
  const ageDays = Number.isFinite(updatedTime)
    ? Math.max(0, Math.floor((now.getTime() - updatedTime) / 86_400_000))
    : null
  const hasExecutableFiles = input.files.some((file) => EXECUTABLE_EXTENSIONS.has(fileExtension(file.path)))
  const staticAnalysis = analyzeCode(input.files)
  let riskLevel: FastTrackDecision['riskLevel'] = staticAnalysis.riskLevel

  if (input.stars < 100) reasons.push('Fewer than 100 GitHub stars')
  if (input.licenseStatus !== 'detected') reasons.push(`License status is ${input.licenseStatus}`)
  if (ageDays === null || ageDays > 365) reasons.push('Repository has not been updated within 12 months')
  if (hasExecutableFiles) reasons.push('Executable or script files require deeper review')
  if (input.packageTruncated) reasons.push('Package exceeds deterministic fast-track scan bounds')
  if (input.hasUnreviewedFiles) reasons.push('Package contains file types outside the deterministic scanner')
  if (!staticAnalysis.passed) reasons.push(...staticAnalysis.issues.slice(0, 4))

  const searchableText = [input.document, ...input.files.map((file) => file.content)].join('\n')
  for (const finding of DOCUMENT_RISKS) {
    if (!finding.pattern.test(searchableText)) continue
    reasons.push(finding.reason)
    if (RISK_ORDER[finding.level] > RISK_ORDER[riskLevel]) riskLevel = finding.level
  }

  const uniqueReasons = Array.from(new Set(reasons))
  const eligible =
    input.stars >= 100 &&
    input.licenseStatus === 'detected' &&
    ageDays !== null &&
    ageDays <= 365 &&
    !hasExecutableFiles &&
    !input.packageTruncated &&
    !input.hasUnreviewedFiles &&
    staticAnalysis.passed &&
    riskLevel === 'low' &&
    uniqueReasons.length === 0

  return {
    eligible,
    requiresAiReview: !eligible,
    riskLevel,
    reasons: uniqueReasons,
    hasExecutableFiles,
    ageDays,
  }
}
