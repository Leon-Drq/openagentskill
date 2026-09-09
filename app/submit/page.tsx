'use client'

import { useEffect, useRef, useState } from 'react'
import { SkillSubmitForm, type SubmitFormData } from '@/components/skill-submit-form'
import { SubmissionReceiptPanel } from '@/components/submission-receipt'
import { useI18n } from '@/lib/i18n/context'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { submissionCopy } from '@/lib/i18n/submission-copy'
import { submissionFlowCopy } from '@/lib/i18n/submission-flow-copy'
import { ACTIVE_RECEIPT_KEY, PENDING_STORAGE_KEY, RECEIPT_STORAGE_KEY, receiptFromFragment, validReceipt, type SubmissionReceipt } from '@/lib/skills/submission-contract'

function loadReceipts(): SubmissionReceipt[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECEIPT_STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value.filter(validReceipt).slice(0, 20) : []
  } catch { return [] }
}

export default function SubmitPage() {
  const { locale } = useI18n()
  const c = (key: Parameters<typeof submissionFlowCopy>[1]) => submissionFlowCopy(locale, key)
  const [receipts, setReceipts] = useState<SubmissionReceipt[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(true)
  const [celebrate, setCelebrate] = useState(false)
  const [batchErrors, setBatchErrors] = useState<string[]>([])
  const pending = useRef<Record<string, string>>({})
  const receipt = receipts.find(item => item.id === activeId) || null

  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = loadReceipts()
      const browserWindow = window as Window & { __oasReceiptFragment?: string }
      const tracked = receiptFromFragment(browserWindow.__oasReceiptFragment || window.location.hash)
      delete browserWindow.__oasReceiptFragment
      if (tracked) {
        // Remove capability-bearing fragments before any application analytics event.
        history.replaceState(null, '', `${location.pathname}${location.search}`)
        const restored = saved.find(item => item.id === tracked.id && item.token === tracked.token) || {
          ...tracked, status: 'submitted' as const, statusUrl: '', skill: { name: 'Skill', path: '', sourceUrl: '' },
        }
        const merged = [restored, ...saved.filter(item => item.id !== restored.id)].slice(0, 20)
        setReceipts(merged)
        try { localStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(merged)); sessionStorage.setItem(ACTIVE_RECEIPT_KEY, restored.id) } catch { /* Optional storage. */ }
        setActiveId(restored.id); setShowForm(false)
      } else {
        setReceipts(saved)
        try {
          const active = sessionStorage.getItem(ACTIVE_RECEIPT_KEY)
          if (saved.some(item => item.id === active)) { setActiveId(active); setShowForm(false) }
        } catch { /* Saved history is still available. */ }
      }
      try {
        const value = JSON.parse(localStorage.getItem(PENDING_STORAGE_KEY) || '{}')
        if (value && typeof value === 'object' && !Array.isArray(value)) pending.current = Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && /^[a-f0-9]{48}$/.test(entry[1])).slice(-50))
      } catch { /* In-memory retry still works. */ }
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  function tokenFor(data: SubmitFormData) {
    const key = JSON.stringify(data)
    if (!pending.current[key]) {
      pending.current[key] = Array.from(crypto.getRandomValues(new Uint8Array(24)), byte => byte.toString(16).padStart(2, '0')).join('')
      pending.current = Object.fromEntries(Object.entries(pending.current).slice(-50))
      try { localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending.current)) } catch { /* Private browsing. */ }
    }
    return pending.current[key]
  }

  function selectReceipt(id: string | null) {
    setActiveId(id)
    try { if (id) sessionStorage.setItem(ACTIVE_RECEIPT_KEY, id); else sessionStorage.removeItem(ACTIVE_RECEIPT_KEY) } catch { /* Optional storage. */ }
  }

  async function handleSubmit(batch: SubmitFormData[]) {
    const accepted: SubmissionReceipt[] = []
    const failures: string[] = []
    setBatchErrors([])
    for (const data of batch) {
      try {
        const response = await fetch('/api/skills/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, receiptToken: tokenFor(data) }), signal: AbortSignal.timeout(60_000) })
        const payload = await response.json()
        if (!response.ok) {
          const fieldIssues = Array.isArray(payload.issues) ? payload.issues.map((issue: { path: string }) => issue.path === 'makerGithub' ? c('githubError') : issue.path === 'makerX' ? c('xError') : issue.path.startsWith('tags') ? c('tagsError') : c('failed')) : []
          throw new Error(response.status === 429 ? c('rate') : fieldIssues.length ? [...new Set(fieldIssues)].join(' ') : c('failed'), { cause: 'submission-feedback' })
        }
        if (!validReceipt(payload.submission)) throw new Error(c('failed'))
        accepted.push(payload.submission)
        // Persist every item immediately, including a partial batch or a closed tab.
        const merged = [payload.submission, ...loadReceipts().filter(item => item.id !== payload.submission.id)].slice(0, 20)
        try { localStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(merged)) } catch { /* Private link remains available. */ }
        trackAnalyticsEvent('skill_submission_accepted', { status: payload.submission.status, category: data.category || 'auto', has_github_identity: Boolean(data.makerGithub), has_x_identity: Boolean(data.makerX) })
      } catch (error) {
        failures.push(`${data.skillPath}: ${error instanceof Error && error.cause === 'submission-feedback' ? error.message : c('failed')}`)
      }
    }
    if (accepted.length) {
      setReceipts(previous => [...accepted, ...previous.filter(item => !accepted.some(next => next.id === item.id))].slice(0, 20))
      selectReceipt(accepted[0].id)
      setCelebrate(accepted[0].status !== 'quarantined')
      setShowForm(failures.length > 0)
    }
    setBatchErrors(failures)
    if (failures.length) throw new Error(c('failed'))
  }

  return <div className="min-h-screen bg-background text-foreground">
    <SiteHeader />
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <div className="brand-grain pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-6xl px-6 py-12 text-center sm:py-16">
          <p className="font-mono text-xs uppercase tracking-[.24em] text-secondary">{submissionCopy(locale, 'OPEN SUBMISSION · ZERO STARS OK', '开放提交 · 0 STAR 可用')}</p>
          <h1 className="mx-auto mt-5 max-w-4xl font-display text-4xl font-normal leading-tight text-balance sm:text-5xl">{submissionCopy(locale, 'Paste one link. Make your skill discoverable.', '粘贴一个链接，让 Skill 被发现')}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-secondary">{submissionCopy(locale, 'Repository, subdirectory, and SKILL.md URLs are supported. We save first and review asynchronously—no star, README, category, or tag gate.', '支持仓库、子目录和 SKILL.md 链接。先进入社区队列，再异步审核；不再要求 Star、README、分类或标签。')}</p>
        </div>
      </section>
      <div className="mx-auto max-w-4xl space-y-8 px-6 py-10 sm:py-12">
        {receipt && <SubmissionReceiptPanel key={receipt.id} receipt={receipt} celebrate={celebrate} onClose={() => setCelebrate(false)} />}
        {!!batchErrors.length && <div role="alert" className="mx-auto max-w-2xl border border-destructive/30 p-4 text-sm text-destructive"><ul className="space-y-2">{batchErrors.map((error, i) => <li key={i}>{error}</li>)}</ul></div>}
        {showForm ? <SkillSubmitForm onSubmit={handleSubmit} /> : <div className="text-center"><button type="button" onClick={() => { setShowForm(true); selectReceipt(null); setCelebrate(false); setBatchErrors([]) }} className="border border-border px-5 py-3 text-sm">{submissionCopy(locale, 'Submit another', '再提交一个')}</button></div>}
        {!!receipts.length && <section className="mx-auto max-w-2xl border-t border-border pt-6"><h2 className="text-sm font-semibold">{c('recent')}</h2><div className="mt-3 divide-y divide-border">{receipts.map(item => <button key={item.id} type="button" onClick={() => { selectReceipt(item.id); setShowForm(false); setCelebrate(false) }} className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm hover:text-primary"><span className="min-w-0 truncate">{item.skill.name}</span><span className="shrink-0 font-mono text-xs text-secondary">#{item.id.slice(0, 8)}</span></button>)}</div></section>}
      </div>
    </main>
    <SiteFooter />
  </div>
}
