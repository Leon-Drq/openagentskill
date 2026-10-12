'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, ShoppingBag, ArrowUpRight } from 'lucide-react'
import Link from '@/components/crawl-link'
import type { Locale } from '@/lib/i18n/config'
import type { PurchasePlan } from '@/lib/payments/policy'
import { paymentMessage } from '@/lib/payments/copy'
import styles from './payments.module.css'

export async function paymentAction(path: string, body: unknown) {
  const response = await fetch(`/api/payments/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'temporarily_unavailable')
  return data
}
export function PurchaseActions({ slug, plan, locale, onAvailability }: { slug?: string; plan: PurchasePlan; locale: Locale; onAvailability?: (ready: boolean) => void }) {
  const zh = locale === 'zh'
  const router = useRouter()
  const [state, setState] = useState<{ ready: boolean; membershipReady: boolean; owned: boolean; reason?: string } | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/payments/status${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error('temporarily_unavailable'); return response.json() })
      .then(setState).catch(error => { if (error.name !== 'AbortError') setError('temporarily_unavailable') })
    return () => controller.abort()
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
  return <div className={styles.actions} data-purchase-actions>
    {state?.owned && slug ? <button type="button" className={styles.primary} disabled={busy} onClick={() => act(true)}><Download size={16} aria-hidden="true" />{busy ? (zh ? '正在准备…' : 'Preparing…') : (zh ? '下载 Skill ZIP' : 'Download Skill ZIP')}</button>
      : <button type="button" className={styles.primary} disabled={!ready || busy} onClick={() => act()}><ShoppingBag size={16} aria-hidden="true" />{busy ? (zh ? '正在前往结算…' : 'Opening checkout…') : ready ? (plan === 'single' ? (zh ? '购买此 Skill' : 'Buy this Skill') : (zh ? '订阅 Pro 会员' : 'Subscribe to Pro')) : (zh ? '购买暂未开放' : 'Not yet available')}</button>}
    <p className={styles.note}>{state?.owned ? (zh ? '已获得访问权限，可在我的购买中管理。' : 'Access is available in your purchases.') : ready ? (zh ? '在 Stripe 安全结算。付款确认后，文件将出现在我的购买中。' : 'Secure checkout with Stripe. Downloads unlock in your purchases after payment is confirmed.') : paymentMessage(state?.reason || 'checkout_unavailable', locale)}</p>
    {error && <p className={styles.error} role="alert">{paymentMessage(error, locale)}</p>}
    <Link href={`/profile?tab=purchases&lang=${locale}`} className={styles.link} prefetch={false}>{zh ? '我的购买与下载' : 'My purchases & downloads'}<ArrowUpRight size={14} aria-hidden="true" /></Link>
  </div>
}
