'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SkillSubmitForm, SubmitFormData } from '@/components/skill-submit-form'

export default function SubmitPage() {
  const [submitted, setSubmitted] = useState(false)
  const [reviewResult, setReviewResult] = useState<any>(null)

  const handleSubmit = async (data: SubmitFormData) => {
    console.log('[v0] Submitting skill:', data)

    const response = await fetch('/api/skills/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '提交失败')
    }

    const result = await response.json()
    console.log('[v0] Submission result:', result)

    setReviewResult(result)
    setSubmitted(true)
  }

  if (submitted && reviewResult) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-background">
          <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex items-baseline justify-between">
              <Link href="/" className="flex items-center gap-2 hover:opacity-60 transition-opacity">
                <span className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-foreground rounded-full flex items-center justify-center font-display font-bold text-xs sm:text-sm">
                  O
                </span>
                <span className="text-xl sm:text-2xl font-display font-bold text-foreground">
                  Open Agent Skill
                </span>
              </Link>
            </div>
          </div>
        </header>

        {/* Result */}
        <main className="container mx-auto px-4 sm:px-6 py-12">
          <div className="max-w-2xl mx-auto text-center">
            {reviewResult.approved ? (
              <>
                <h1 className="font-display text-4xl font-bold mb-4">
                  技能审核通过！
                </h1>
                <p className="text-lg text-secondary mb-8">
                  您的技能已成功发布到 Open Agent Skill 平台
                </p>
                <div className="border border-border p-6 mb-8 text-left">
                  <h2 className="font-semibold text-xl mb-4">审核详情</h2>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-secondary">安全性:</span>{' '}
                      <span className="font-mono">{reviewResult.review.scores.security}/10</span>
                    </p>
                    <p>
                      <span className="text-secondary">质量:</span>{' '}
                      <span className="font-mono">{reviewResult.review.scores.quality}/10</span>
                    </p>
                    <p>
                      <span className="text-secondary">实用性:</span>{' '}
                      <span className="font-mono">{reviewResult.review.scores.usefulness}/10</span>
                    </p>
                    <p>
                      <span className="text-secondary">合规性:</span>{' '}
                      <span className="font-mono">{reviewResult.review.scores.compliance}/10</span>
                    </p>
                    <p className="pt-2 border-t border-border mt-2">
                      <span className="text-secondary">总分:</span>{' '}
                      <span className="font-mono font-semibold">{reviewResult.review.totalScore}/40</span>
                    </p>
                  </div>
                  {reviewResult.review.suggestions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h3 className="font-semibold mb-2">改进建议</h3>
                      <ul className="list-disc list-inside text-sm text-secondary space-y-1">
                        {reviewResult.review.suggestions.map((suggestion: string, i: number) => (
                          <li key={i}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <Link
                  href={`/skills/${reviewResult.skill.slug}`}
                  className="inline-block px-6 py-3 border-2 border-foreground font-semibold hover:bg-foreground hover:text-background transition-colors"
                >
                  查看技能详情
                </Link>
              </>
            ) : (
              <>
                <h1 className="font-display text-4xl font-bold mb-4">
                  技能未通过审核
                </h1>
                <p className="text-lg text-secondary mb-8">
                  您的技能需要改进后重新提交
                </p>
                <div className="border border-destructive p-6 mb-8 text-left">
                  <h2 className="font-semibold text-xl mb-4">审核问题</h2>
                  <ul className="list-disc list-inside text-sm space-y-2">
                    {reviewResult.review.issues.map((issue: string, i: number) => (
                      <li key={i} className="text-destructive">{issue}</li>
                    ))}
                  </ul>
                  {reviewResult.review.suggestions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h3 className="font-semibold mb-2">改进建议</h3>
                      <ul className="list-disc list-inside text-sm text-secondary space-y-1">
                        {reviewResult.review.suggestions.map((suggestion: string, i: number) => (
                          <li key={i}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-border text-sm text-secondary">
                    <p>{reviewResult.review.reasoning}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSubmitted(false)}
                  className="inline-block px-6 py-3 border-2 border-foreground font-semibold hover:bg-foreground hover:text-background transition-colors"
                >
                  重新提交
                </button>
              </>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-baseline justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-60 transition-opacity">
              <span className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-foreground rounded-full flex items-center justify-center font-display font-bold text-xs sm:text-sm">
                O
              </span>
              <span className="text-xl sm:text-2xl font-display font-bold text-foreground">
                Open Agent Skill
              </span>
            </Link>
            <nav className="flex gap-3 sm:gap-6 text-xs sm:text-sm">
              <Link href="/skills" className="text-secondary hover:text-foreground">
                浏览技能
              </Link>
              <Link href="/docs" className="text-secondary hover:text-foreground">
                文档
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
            提交 Agent Skill
          </h1>
          <p className="text-lg text-secondary max-w-2xl mx-auto">
            分享您的 Agent Skill 到开放平台。我们使用 AI 自动审核，确保质量和安全性。
          </p>
        </div>

        <SkillSubmitForm onSubmit={handleSubmit} />

        {/* Info */}
        <div className="max-w-2xl mx-auto mt-12 pt-8 border-t border-border">
          <h2 className="font-semibold text-xl mb-4">提交须知</h2>
          <ul className="space-y-2 text-sm text-secondary">
            <li>• 技能必须托管在 GitHub 公开仓库</li>
            <li>• 建议在仓库中包含 skill.json 清单文件</li>
            <li>• README 应包含清晰的安装说明和使用示例</li>
            <li>• 代码必须遵循开源协议（MIT、Apache 2.0 等）</li>
            <li>• AI 会自动审核代码安全性、质量和实用性</li>
            <li>• 审核通过后技能将立即发布到平台</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
