/**
 * Layer 1 — Static Analysis
 * Scans code for known dangerous patterns before AI review.
 * Fast, deterministic, zero cost.
 */

interface AnalysisResult {
  passed: boolean
  issues: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

const DANGEROUS_PATTERNS = [
  { pattern: /eval\s*\(/, label: 'eval() usage detected', risk: 'high' as const },
  { pattern: /exec\s*\(/, label: 'exec() usage detected', risk: 'high' as const },
  { pattern: /subprocess/, label: 'subprocess module usage', risk: 'medium' as const },
  { pattern: /child_process/, label: 'child_process module usage', risk: 'medium' as const },
  { pattern: /os\.system\s*\(/, label: 'os.system() call detected', risk: 'high' as const },
  { pattern: /os\.remove\s*\(/, label: 'os.remove() call detected', risk: 'high' as const },
  { pattern: /shutil\.rmtree/, label: 'shutil.rmtree() usage', risk: 'critical' as const },
  { pattern: /rm\s+-rf/, label: 'rm -rf command detected', risk: 'critical' as const },
  { pattern: /base64\.b64decode.*exec/, label: 'Encoded execution pattern', risk: 'critical' as const },
  { pattern: /process\.env\[/, label: 'Environment variable access', risk: 'low' as const },
  { pattern: /\.env/, label: 'Possible .env file access', risk: 'low' as const },
  { pattern: /crypto\.createCipher/, label: 'Weak crypto usage', risk: 'medium' as const },
  { pattern: /innerHTML\s*=/, label: 'innerHTML assignment (XSS risk)', risk: 'medium' as const },
  { pattern: /document\.write/, label: 'document.write() usage', risk: 'medium' as const },
  { pattern: /\bfetch\s*\([^)]*\$\{/, label: 'Dynamic URL in fetch (injection risk)', risk: 'medium' as const },
]

export function analyzeCode(codeFiles: { path: string; content: string }[]): AnalysisResult {
  const issues: string[] = []
  let maxRisk: AnalysisResult['riskLevel'] = 'low'
  const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 }

  for (const file of codeFiles) {
    for (const { pattern, label, risk } of DANGEROUS_PATTERNS) {
      if (pattern.test(file.content)) {
        issues.push(`${file.path}: ${label}`)
        if (riskOrder[risk] > riskOrder[maxRisk]) {
          maxRisk = risk
        }
      }
    }
  }

  return {
    passed: maxRisk !== 'critical',
    issues,
    riskLevel: maxRisk,
  }
}

/**
 * Determine trust level based on submission history
 */
export function calculateTrustLevel(
  authorName: string,
  existingSkillCount: number,
  source: string
): 'unverified' | 'trusted' | 'verified' {
  if (source === 'agent') return 'unverified'
  if (existingSkillCount >= 3) return 'trusted'
  return 'unverified'
}
