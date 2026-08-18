'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SkillSubmitForm, SubmitFormData } from '@/components/skill-submit-form'
import { useI18n } from '@/lib/i18n/context'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { trackAnalyticsEvent } from '@/lib/analytics'

type SubmissionStatus = 'submitted' | 'processing' | 'listed' | 'reviewed' | 'duplicate' | 'quarantined'

type Review = {
  totalScore?: number
  scores?: { security?: number; quality?: number; usefulness?: number; compliance?: number }
  issues?: string[]
  suggestions?: string[]
  reasoning?: string
}

type SubmissionReceipt = {
  id: string
  token: string
  status: SubmissionStatus
  statusUrl: string
  skill: { name: string; description: string; path: string; sourceUrl: string }
}

type SubmissionState = {
  id: string
  status: SubmissionStatus
  skill: { name: string; slug?: string | null; sourceUrl?: string }
  review?: Review | null
}

export default function SubmitPage() {
  const { locale } = useI18n()
  const zh = locale === 'zh'
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null)
  const [result, setResult] = useState<SubmissionState | null>(null)

  useEffect(() => {
    if (!receipt || !['submitted', 'processing'].includes(result?.status || receipt.status)) return
    let cancelled = false
    let attempts = 0

    async function poll() {
      attempts += 1
      try {
        const response = await fetch(receipt!.statusUrl, { cache: 'no-store' })
        if (response.ok && !cancelled) {
          const data = await response.json() as { submission: SubmissionState }
          setResult(data.submission)
          if (!['submitted', 'processing'].includes(data.submission.status)) return
        }
      } catch {
        // Keep the receipt on screen; the user can return to the private status URL.
      }
      if (!cancelled && attempts < 30) window.setTimeout(poll, 2000)
    }

    const timer = window.setTimeout(poll, 1200)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [receipt, result?.status])

  async function handleSubmit(data: SubmitFormData) {
    const response = await fetch('/api/skills/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || (zh ? '提交失败。' : 'Submission failed.'))

    const nextReceipt = payload.submission as SubmissionReceipt
    setReceipt(nextReceipt)
    setResult({ id: nextReceipt.id, status: nextReceipt.status, skill: nextReceipt.skill })
    trackAnalyticsEvent('skill_submission_accepted', {
      category: data.category || 'auto',
      status: nextReceipt.status,
      has_github_identity: Boolean(data.makerGithub),
      has_x_identity: Boolean(data.makerX),
    })
  }

  const status = result?.status || receipt?.status
  const finished = status && !['submitted', 'processing'].includes(status)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="brand-grain pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative mx-auto max-w-6xl px-6 py-14 text-center sm:py-16 lg:py-20">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-secondary">
              {zh ? '开放提交 · 0 STAR 可用' : 'OPEN SUBMISSION · ZERO STARS OK'}
            </p>
            <h1 className="mx-auto mt-5 max-w-4xl font-display text-4xl font-normal leading-[0.98] text-balance sm:text-5xl lg:text-6xl">
              {zh ? '粘贴一个链接，让 Skill 被发现' : 'Paste one link. Make your skill discoverable.'}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-secondary sm:text-lg">
              {zh
                ? '支持仓库、子目录和 SKILL.md 链接。先进入社区队列，再异步审核；不再要求 Star、README、分类或标签。'
                : 'Repository, subdirectory, and SKILL.md URLs are supported. We save first and review asynchronously—no star, README, category, or tag gate.'}
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-4xl px-6 py-10 sm:py-12">
          {!receipt ? (
            <SkillSubmitForm onSubmit={handleSubmit} />
          ) : (
            <section className="mx-auto max-w-2xl border border-border bg-card p-6 sm:p-8">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">
                {finished ? (zh ? '处理完成' : 'PROCESSING COMPLETE') : (zh ? '已保存' : 'SAVED')}
              </p>
              <h1 className="mt-3 font-display text-3xl">
                {status === 'reviewed' && (zh ? '已通过审核并发布' : 'Reviewed and published')}
                {status === 'listed' && (zh ? '已进入社区待审队列' : 'Listed for community review')}
                {status === 'duplicate' && (zh ? '这个 Skill 已经收录' : 'This skill is already listed')}
                {status === 'quarantined' && (zh ? '已隔离，暂不公开' : 'Quarantined and not public')}
                {(!finished || !status) && (zh ? '正在执行安全与质量审核' : 'Security and quality review in progress')}
              </h1>
              <p className="mt-4 text-sm leading-6 text-secondary">
                {result?.skill.name || receipt.skill.name} · <span className="font-mono">{receipt.skill.path}</span>
              </p>

              {result?.review?.issues && result.review.issues.length > 0 && (
                <div className="mt-6 border border-border p-4">
                  <p className="font-semibold">{zh ? '发现的问题' : 'Review notes'}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-secondary">
                    {result.review.issues.map((issue) => <li key={issue}>{issue}</li>)}
                  </ul>
                </div>
              )}
              {result?.review?.suggestions && result.review.suggestions.length > 0 && (
                <div className="mt-4 border border-border p-4">
                  <p className="font-semibold">{zh ? '改进建议' : 'Suggestions'}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-secondary">
                    {result.review.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
                  </ul>
                </div>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                {result?.skill.slug && (
                  <Link href={`/skills/${result.skill.slug}`} className="bg-foreground px-5 py-2.5 text-sm font-semibold text-background">
                    {zh ? '查看 Skill' : 'View skill'}
                  </Link>
                )}
                {status === 'listed' && (
                  <Link href="/skills/new" className="border border-foreground px-5 py-2.5 text-sm font-semibold">
                    {zh ? '查看社区队列' : 'View community queue'}
                  </Link>
                )}
                <button type="button" onClick={() => { setReceipt(null); setResult(null) }} className="border border-border px-5 py-2.5 text-sm">
                  {zh ? '再提交一个' : 'Submit another'}
                </button>
              </div>
              <p className="mt-6 break-all font-mono text-[11px] leading-5 text-secondary">
                {zh ? '私密状态链接：' : 'Private status URL: '}{receipt.statusUrl}
              </p>
            </section>
          )}

          <section className="mx-auto mt-10 max-w-2xl border-t border-border pt-8">
            <h2 className="font-display text-2xl">{zh ? '新的收录规则' : 'How listing now works'}</h2>
            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              {[
                zh ? '1. 有效 SKILL.md 即可提交' : '1. Submit any valid SKILL.md',
                zh ? '2. 先保存，再异步审核' : '2. Save first, review async',
                zh ? '3. 高风险内容隔离，其余进入社区队列' : '3. Quarantine critical risk; queue the rest',
              ].map((item) => <div key={item} className="border border-border p-4 leading-6">{item}</div>)}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
