'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, Copy, X } from 'lucide-react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useI18n } from '@/lib/i18n/context'
import { submissionCopy } from '@/lib/i18n/submission-copy'
import { submissionFlowCopy } from '@/lib/i18n/submission-flow-copy'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { isSubmissionPending, receiptPageUrl, receiptStatusUrl, submissionShare, type SubmissionReceipt, type SubmissionState } from '@/lib/skills/submission-contract'
import { trackAnalyticsEvent } from '@/lib/analytics'

export function SubmissionReceiptPanel({ receipt, celebrate, onClose }: { receipt: SubmissionReceipt; celebrate: boolean; onClose: () => void }) {
  const { locale } = useI18n()
  const c = (key: Parameters<typeof submissionFlowCopy>[1]) => submissionFlowCopy(locale, key)
  const [state, setState] = useState<SubmissionState>({ id: receipt.id, status: receipt.status, skill: receipt.skill })
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [delayed, setDelayed] = useState(false)
  const [copied, setCopied] = useState('')
  const refreshButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0
    let controller: AbortController | undefined
    async function poll() {
      attempts++
      controller = new AbortController()
      const timeout = setTimeout(() => controller?.abort(), 12_000)
      setLoading(true)
      try {
        const response = await fetch(receiptStatusUrl(receipt), { cache: 'no-store', headers: { Authorization: `Bearer ${receipt.token}` }, signal: controller.signal })
        if (!response.ok) throw new Error('Status unavailable')
        const data = await response.json() as { submission: SubmissionState }
        if (cancelled) return
        setState(data.submission); setUnavailable(false)
        if (!isSubmissionPending(data.submission.status)) { setDelayed(false); return }
        setDelayed(Boolean(data.submission.queue?.stalled) || attempts >= 20)
      } catch {
        if (!cancelled) setUnavailable(true)
      } finally {
        clearTimeout(timeout)
        if (!cancelled) setLoading(false)
      }
      if (!cancelled && attempts < 30) timer = setTimeout(poll, Math.min(2000 + attempts * 1000, 15_000))
      else if (!cancelled) setDelayed(true)
    }
    timer = setTimeout(poll, 0)
    const resume = () => {
      if (document.visibilityState === 'visible') setRefresh(value => value + 1)
    }
    document.addEventListener('visibilitychange', resume)
    return () => { cancelled = true; clearTimeout(timer); controller?.abort(); document.removeEventListener('visibilitychange', resume) }
  }, [receipt, refresh])

  const share = submissionShare(state)
  const restricted = state.status === 'quarantined' || state.status === 'rejected'
  const headline = restricted ? submissionCopy(locale, 'Quarantined and not public', '已隔离，暂不公开')
    : share?.published ? c('published') : state.status === 'listed' ? c('manual') : c('saved')
  async function copy(kind: 'share' | 'private') {
    try {
      await navigator.clipboard.writeText(kind === 'share' && share ? `${share.text}\n${share.url}` : `${window.location.origin}${receiptPageUrl(receipt)}`)
      setCopied(kind)
    } catch { setCopied('failed') }
  }
  const shareButtons = share && <div className="grid gap-2 sm:grid-cols-2">
    <a href={share.intent} target="_blank" rel="noopener noreferrer" onClick={() => trackAnalyticsEvent('skill_submission_share_open', { source: 'submission', status: state.status })} className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#006b4f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#00543e]">{c('share')}<ArrowUpRight className="size-4" /></a>
    <button type="button" onClick={() => copy('share')} className="inline-flex min-h-11 items-center justify-center gap-2 border border-border px-4 py-3 text-sm"><Copy className="size-4" />{copied === 'share' ? c('copied') : c('copy')}</button>
  </div>

  return <>
    <section className="mx-auto max-w-2xl border border-border bg-card p-6 sm:p-8" aria-label={c('receipt')}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><p className="font-mono text-[11px] uppercase tracking-[.18em] text-primary">{c('receipt')}</p><span className="font-mono text-[10px] text-secondary">#{receipt.id.slice(0, 8)}</span></div>
      <div aria-live="polite"><h2 className="mt-6 font-display text-3xl">{headline}</h2><p className="mt-3 break-words text-lg font-semibold">{state.skill.name}</p><p className="mt-2 break-all font-mono text-xs text-secondary">{state.skill.path || receipt.skill.path}</p>
        {!share?.published && !restricted && <p className="mt-4 text-sm leading-6 text-secondary">{c('pending')}</p>}
        {state.review?.method === 'static' && <p className="mt-4 text-sm text-primary">{c('static')}</p>}
        {(delayed || unavailable) && <p role="status" className="mt-4 border-l-2 border-primary pl-3 text-sm leading-6">{unavailable ? c('statusError') : c('delayed')}</p>}
      </div>
      {!!state.review?.issues?.length && <div className="mt-6 border-t pt-5"><h3 className="font-semibold">{submissionCopy(locale, 'Review notes', '发现的问题')}</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-secondary">{state.review.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></div>}
      {!!state.review?.suggestions?.length && <div className="mt-4"><h3 className="font-semibold">{submissionCopy(locale, 'Suggestions', '改进建议')}</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-secondary">{state.review.suggestions.map((suggestion, i) => <li key={i}>{suggestion}</li>)}</ul></div>}
      <div className="mt-6 flex flex-wrap gap-2">
        <button ref={refreshButton} type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)} className="border px-4 py-2.5 text-sm disabled:opacity-50">{c('retry')}</button>
        {share?.published && state.skill.slug && <Link href={getLocalizedNavigationHref(`/skills/${state.skill.slug}`, locale)} className="border px-4 py-2.5 text-sm">{submissionCopy(locale, 'View skill', '查看 Skill')}</Link>}
        <button type="button" onClick={() => copy('private')} className="border px-4 py-2.5 text-sm">{copied === 'private' ? c('copied') : c('privateLink')}</button>
      </div>
      <p className="mt-3 text-xs leading-5 text-secondary">{c('privateHint')}</p>
      {copied === 'failed' && <p role="alert" className="mt-2 text-xs text-destructive">{c('copyError')}</p>}
      <div className="mt-6">{shareButtons}</div>
      <a href={`mailto:qudongqi2023@gmail.com?subject=${encodeURIComponent(`Skill submission ${receipt.id}`)}`} className="mt-5 inline-block text-xs text-secondary underline underline-offset-4">{c('support')}</a>
    </section>
    <Dialog open={celebrate && !restricted} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent showCloseButton={false} onCloseAutoFocus={event => { event.preventDefault(); refreshButton.current?.focus() }} className="max-h-[90dvh] overflow-y-auto rounded-none border-t-4 border-t-[#006b4f] p-7 sm:max-w-xl sm:p-9 motion-reduce:animate-none">
        <DialogClose aria-label={c('close')} className="absolute right-4 top-4 p-2 text-secondary"><X className="size-4" /></DialogClose>
        <p className="font-mono text-xs uppercase tracking-[.18em] text-primary">OpenAgentSkill / {c('receipt')}</p>
        <div className="mt-2 inline-flex size-12 items-center justify-center rounded-full border border-[#006b4f]/25 bg-[#006b4f]/5 text-[#006b4f]"><Check className="size-6" /></div>
        <DialogTitle className="font-display text-4xl font-normal leading-tight">{headline}</DialogTitle>
        <DialogDescription className="text-sm leading-6 text-secondary">{share?.published ? state.skill.name : c('pending')}</DialogDescription>
        <div className="my-2 border-y border-border py-5"><p className="break-words text-lg font-semibold">{state.skill.name}</p><p className="mt-2 break-all font-mono text-xs text-secondary">{state.skill.path || receipt.skill.path}</p>{share && <p className="mt-4 text-sm leading-6 text-secondary">{share.text}</p>}</div>
        {shareButtons}
        <button type="button" onClick={onClose} className="py-2 text-sm text-secondary underline underline-offset-4">{c('continue')}</button>
      </DialogContent>
    </Dialog>
  </>
}
