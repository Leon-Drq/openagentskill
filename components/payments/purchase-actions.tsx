'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, ShoppingBag, ArrowUpRight, Copy, LockKeyhole, Check } from 'lucide-react'
import Link from '@/components/crawl-link'
import type { Locale } from '@/lib/i18n/config'
import type { PurchasePlan, DeliveryKind } from '@/lib/payments/policy'
import { paymentMessage } from '@/lib/payments/copy'
import styles from './payments.module.css'

export async function paymentAction(path: string, body: unknown) {
  const response = await fetch(`/api/payments/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'temporarily_unavailable')
  return data
}
export function PurchaseActions({ slug, plan, locale, delivery = 'package', onAvailability }: { slug?: string; plan: PurchasePlan; locale: Locale; delivery?: DeliveryKind; onAvailability?: (ready: boolean) => void }) {
  const zh = locale === 'zh'
  const isText = delivery !== 'package'
  const contentLabel = delivery === 'skill-instructions' ? (zh ? 'Skill 指令' : 'Skill instructions') : (zh ? '原始提示词' : 'Original prompt')
  const router = useRouter()
  const [state, setState] = useState<{ ready: boolean; membershipReady: boolean; owned: boolean; reason?: string } | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [content, setContent] = useState(''), [copied, setCopied] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    let attempts = 0
    const refresh = () => fetch(`/api/payments/status${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error('temporarily_unavailable'); return response.json() })
      .then(next => { setState(next); if (!next.owned) { setContent(''); setCopied(false) } })
      .catch(error => { if (error.name !== 'AbortError') setError('temporarily_unavailable') })
    const onFocus = () => { void refresh() }
    void refresh()
    const interval = new URLSearchParams(window.location.search).get('checkout') === 'processing'
      ? setInterval(() => { if (++attempts < 12) void refresh(); else clearInterval(interval) }, 5000) : undefined
    window.addEventListener('focus', onFocus)
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [slug])
  const ready = Boolean(plan === 'single' ? state?.ready : state?.membershipReady)
  useEffect(() => { onAvailability?.(ready) }, [ready, onAvailability])
  async function act(download = false) {
    setBusy(true); setError('')
    try {
      const data = await paymentAction(download ? 'download' : 'checkout', download ? { slug } : { slug, plan, locale })
      window.location.assign(data.url)
    } catch (error) {
      const code = error instanceof Error ? error.message : 'temporarily_unavailable'
      if (code === 'sign_in_required') router.push(`/auth/login?lang=${locale}&next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      else setError(code)
    } finally { setBusy(false) }
  }
  async function copyContent() {
    setBusy(true); setError(''); setCopied(false)
    try {
      const data = await paymentAction('content', { slug })
      setContent(data.text)
      try { await navigator.clipboard.writeText(data.text); setCopied(true) }
      catch { setError('copy_manually') }
    } catch (error) { setContent(''); setError(error instanceof Error ? error.message : 'temporarily_unavailable') }
    finally { setBusy(false) }
  }
  return <div className={styles.actions} data-purchase-actions>
    {isText && <div className={styles.promptBox} data-paid-content>
      <div className={styles.toolbar}><strong>{contentLabel}</strong>{state?.owned ? <span className={styles.unlocked}>{zh ? '已解锁' : 'Unlocked'}</span> : <LockKeyhole size={16} aria-hidden="true" />}</div>
      {content ? <textarea className={styles.promptText} aria-label={contentLabel} value={content} readOnly spellCheck={false} />
        : <p className={styles.note}>{state?.owned ? (zh ? '点击下方按钮，读取并复制完整内容。' : 'Use the button below to read and copy the full text.') : (zh ? '付款确认后解锁完整正文，可直接复制到你的 AI 工具中使用。' : 'Payment unlocks the full text, ready to copy into your AI tool.')}</p>}
    </div>}
    {state?.owned && slug ? <button type="button" className={styles.primary} disabled={busy} onClick={() => isText ? copyContent() : act(true)}>{isText ? (copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />) : <Download size={16} aria-hidden="true" />}{busy ? (zh ? '正在读取…' : 'Loading…') : isText ? (copied ? (zh ? '已复制' : 'Copied') : (zh ? `查看并复制${contentLabel}` : `Read & copy ${contentLabel.toLowerCase()}`)) : (zh ? '下载 Skill ZIP' : 'Download Skill ZIP')}</button>
      : <button type="button" className={styles.primary} disabled={!ready || busy} onClick={() => act()}><ShoppingBag size={16} aria-hidden="true" />{busy ? (zh ? '正在前往结算…' : 'Opening checkout…') : ready ? (plan === 'single' ? (isText ? (zh ? '购买并解锁' : 'Buy & unlock') : (zh ? '购买此 Skill' : 'Buy this Skill')) : (zh ? '订阅 Pro 会员' : 'Subscribe to Pro')) : !state ? (zh ? '正在确认购买状态…' : 'Checking availability…') : (zh ? '购买暂未开放' : 'Not yet available')}</button>}
    <p className={styles.note}>{!state ? (zh ? '正在读取安全购买状态…' : 'Checking secure purchase status…') : state.owned ? (zh ? '已获得访问权限，可在我的购买中管理。' : 'Access is available in your purchases.') : ready ? (isText ? (zh ? '在 Stripe 安全结算。付款确认后返回本页，即可读取与复制。' : 'Secure checkout with Stripe. Return here after payment to read and copy.') : (zh ? '在 Stripe 安全结算。付款确认后，文件将出现在我的购买中。' : 'Secure checkout with Stripe. Downloads unlock in your purchases after payment is confirmed.')) : paymentMessage(state.reason || 'checkout_unavailable', locale)}</p>
    {error && <p className={styles.error} role="alert">{paymentMessage(error, locale)}</p>}
    <Link href={`/profile?tab=purchases&lang=${locale}`} className={styles.link} prefetch={false}>{zh ? '我的购买与下载' : 'My purchases & downloads'}<ArrowUpRight size={14} aria-hidden="true" /></Link>
  </div>
}
