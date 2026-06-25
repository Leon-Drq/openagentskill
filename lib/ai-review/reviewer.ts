import { generateText } from 'ai'
import { AIReviewResult } from '../schema/skill-schema'

export interface SkillReviewData {
  repository: string
  readmeContent: string
  codeFiles: { path: string; content: string }[]
  manifestData?: any
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
  const readme = data.readmeContent || ''
  const combinedCode = data.codeFiles.map((file) => file.content).join('\n')
  const allText = `${readme}\n${combinedCode}`.toLowerCase()
  const hasCriticalPattern = includesAny(allText, [/rm\s+-rf/, /base64\.b64decode[\s\S]{0,120}exec/, /curl[\s\S]{0,80}\|\s*(bash|sh)/])
  const hasExecutionSurface = includesAny(allText, [/child_process/, /\bexec\s*\(/, /subprocess/, /os\.system\s*\(/])
  const hasEnvSurface = includesAny(allText, [/process\.env/, /os\.environ/, /\.env\b/, /load_dotenv/])
  const hasInstallDocs = includesAny(readme.toLowerCase(), [/install/, /npx\s+skills\s+add/, /usage/, /quickstart/, /getting started/])
  const hasExamples = includesAny(readme.toLowerCase(), [/example/, /demo/, /usage/, /```/])
  const hasAgentLanguage = includesAny(readme.toLowerCase(), [/agent/, /skill/, /codex/, /claude code/, /cursor/, /workflow/, /automation/])
  const hasOpenLicense =
    Boolean(data.githubStats.license && data.githubStats.license !== 'NOASSERTION') ||
    Boolean(data.manifestData?.license)

  const security = clampScore(9 - (hasCriticalPattern ? 7 : 0) - (hasExecutionSurface ? 2 : 0) - (hasEnvSurface ? 1 : 0))
  const quality = clampScore(
    4 +
      (readme.length > 1000 ? 2 : readme.length > 400 ? 1 : 0) +
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
  const issues = [
    'AI model review was unavailable; heuristic scoring was used and manual review is required',
    ...(hasCriticalPattern ? ['Critical shell or encoded execution pattern detected'] : []),
    ...(hasExecutionSurface ? ['Command execution surface detected'] : []),
    ...(hasEnvSurface ? ['Environment variable access detected'] : []),
    ...(!hasInstallDocs ? ['README should include clearer install or usage instructions'] : []),
    ...(!hasOpenLicense ? ['License metadata should be explicit'] : []),
  ]

  return {
    approved: false,
    scores: {
      security,
      quality,
      usefulness,
      compliance,
    },
    totalScore,
    issues,
    suggestions: [
      'Add a clear SKILL.md or skill.json manifest',
      'Document install, usage, inputs, outputs, and safe operating boundaries',
      'Request manual review before automatic publishing',
    ],
    reasoning: `AI review failed (${reason}). A conservative heuristic review produced scores but cannot approve automatic publishing.`,
    reviewedAt: new Date().toISOString(),
    reviewModel: 'heuristic-static-v1',
  }
}

export async function reviewSkill(data: SkillReviewData): Promise<AIReviewResult> {
  const codePreview = data.codeFiles
    .slice(0, 3)
    .map(f => `// ${f.path}\n${f.content.slice(0, 1000)}`)
    .join('\n\n---\n\n')

  const prompt = `你是一个专业的代码审核 AI，负责审核提交到 Open Agent Skill 平台的技能。

Repository: ${data.repository}
GitHub Stats: ${data.githubStats.stars} stars, ${data.githubStats.forks} forks
Last Updated: ${data.githubStats.lastUpdated}

README 内容（前 2000 字符）：
${data.readmeContent.slice(0, 2000)}

${data.manifestData ? `Skill Manifest:
${JSON.stringify(data.manifestData, null, 2)}` : ''}

主要代码文件预览：
${codePreview}

请从以下四个维度评分（0-10分）：

1. **安全性** (Security)
   - 是否有恶意代码（eval, exec, subprocess 等）
   - 是否有可疑的网络请求
   - 是否泄露敏感信息（API keys, tokens）
   - 依赖是否安全

2. **质量** (Quality)
   - 代码结构是否清晰
   - README 文档是否完整（包含安装说明、示例、API 文档）
   - 是否遵循最佳实践
   - 测试覆盖情况

3. **实用性** (Usefulness)
   - 功能是否有价值
   - 是否解决真实问题
   - 是否与现有 skills 重复
   - 适用场景是否明确

4. **合规性** (Compliance)
   - License 是否明确且为开源协议
   - 版权信息是否完整
   - 是否有违规内容（政治敏感、色情暴力等）

**评分标准：**
- 9-10: 优秀，无明显问题
- 7-8: 良好，有小问题但可接受
- 5-6: 一般，有明显问题需改进
- 3-4: 较差，有严重问题
- 0-2: 很差，不可接受

**审核规则：**
- 安全性 < 7 分，必须拒绝
- 任一维度 < 6 分，必须拒绝
- 总分 < 32/40，必须拒绝
- 总分 32-34/40 仅可进入人工复核，不应自动标记为 verified
- 总分 >= 35/40 且无安全问题，才适合自动发布为 verified
- 如果发现恶意代码，直接拒绝且安全性给 0 分

请返回 JSON 格式（不要包含 markdown 代码块标记）：
{
  "approved": boolean,
  "scores": {
    "security": number,
    "quality": number,
    "usefulness": number,
    "compliance": number
  },
  "issues": string[],
  "suggestions": string[],
  "reasoning": string
}

只返回 JSON，不要其他说明。`

  try {
    const result = await generateText({
      model: 'openai/gpt-4o-mini',
      prompt,
      temperature: 0.3, // Lower temperature for more consistent reviews
    })

    // Parse JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid AI response format')
    }

    const reviewData = JSON.parse(jsonMatch[0])

    // Calculate total score
    const totalScore = Object.values(reviewData.scores).reduce(
      (sum: number, score) => sum + (score as number),
      0
    ) as number

    return {
      approved: reviewData.approved,
      scores: reviewData.scores,
      totalScore,
      issues: reviewData.issues || [],
      suggestions: reviewData.suggestions || [],
      reasoning: reviewData.reasoning || '',
      reviewedAt: new Date().toISOString(),
      reviewModel: 'gpt-4o-mini',
    }
  } catch (error) {
    console.error('[v0] AI review error:', error)
    return heuristicReview(data, error instanceof Error ? error.message : 'technical error')
  }
}

// Quick security check for obvious red flags
export function quickSecurityCheck(codeContent: string): {
  safe: boolean
  issues: string[]
} {
  const issues: string[] = []
  
  // Dangerous patterns
  const dangerousPatterns = [
    { pattern: /eval\s*\(/gi, message: 'Uses eval() - potential code injection risk' },
    { pattern: /exec\s*\(/gi, message: 'Uses exec() - potential command injection risk' },
    { pattern: /child_process/gi, message: 'Uses child_process - review command execution' },
    { pattern: /rm\s+-rf/gi, message: 'Contains destructive file operations' },
    { pattern: /\$\{.*process\.env/gi, message: 'Accesses environment variables' },
  ]

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(codeContent)) {
      issues.push(message)
    }
  }

  return {
    safe: issues.length === 0,
    issues,
  }
}
