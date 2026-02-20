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
- 总分 < 28/40，建议拒绝
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
    // Fallback: reject if AI review fails
    return {
      approved: false,
      scores: {
        security: 0,
        quality: 0,
        usefulness: 0,
        compliance: 0,
      },
      totalScore: 0,
      issues: ['AI review failed - please try again'],
      suggestions: [],
      reasoning: 'Technical error during AI review',
      reviewedAt: new Date().toISOString(),
      reviewModel: 'gpt-4o-mini',
    }
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
