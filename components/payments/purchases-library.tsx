'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, CreditCard, RefreshCw, ArrowUpRight } from 'lucide-react'
import Link from '@/components/crawl-link'
import type { Locale } from '@/lib/i18n/config'
import { studioPrice } from '@/lib/studio/catalog'
import { paymentMessage } from '@/lib/payments/copy'
import { paymentAction } from './purchase-actions'
import styles from './payments.module.css'

interface Library {
  configured: boolean
  billing: boolean
  packages: { slug: string; name: string; version: string; path: string; kind: string }[]
  orders: { id: string; name: string; slug: string | null; plan: string; amount: number; status: string; createdAt: string }[]
  membership: { until: string; cancelAtPeriodEnd: boolean } | null
  next: string | null
}
export function PurchasesLibrary({ locale, checkout }: { locale: Locale; checkout?: string }) {
  const zh = locale === 'zh'
  const [library, setLibrary] = useState<Library | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState('')
  const [after, setAfter] = useState<string | null>(null)
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`/api/payments/library${after ? `?after=${after}` : ''}`, { cache: 'no-store', signal })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'temporarily_unavailable')
    setLibrary(body); setError('')
  }, [after])
  useEffect(() => {
    const controller = new AbortController()
    let attempts = 0
    // The return URL is never proof of payment. Poll the webhook-backed library
    // for at most a minute, then leave an explicit manual refresh control.
    const refresh = () => load(controller.signal).catch(error => { if (error.name !== 'AbortError') setError(error.message) })
    void refresh()
    const interval = checkout === 'processing' ? setInterval(() => { if (++attempts < 12) void refresh(); else clearInterval(interval) }, 5000) : undefined
    return () => { controller.abort(); clearInterval(interval) }
  }, [load, checkout])
  async function act(kind: 'download' | 'portal' | 'cancel', slug?: string) {
    setBusy(slug || kind); setError('')
    try {
      const data = await paymentAction(kind, kind === 'download' ? { slug } : kind === 'cancel' ? { orderId: slug } : { locale })
      if (data.url) window.location.assign(data.url)
      else await load()
    } catch (error) { setError(error instanceof Error ? error.message : 'temporarily_unavailable') }
    finally { setBusy('') }
  }
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value))
  const statuses: Record<string, string> = zh ? { pending: '待支付 / 确认中', paid: '已支付', expired: '已关闭', failed: '支付失败', refunded: '已退款', disputed: '付款争议处理中' }
    : { pending: 'Awaiting payment / confirmation', paid: 'Paid', expired: 'Closed', failed: 'Payment failed', refunded: 'Refunded', disputed: 'Payment disputed' }
  return <div className={styles.library} data-purchases-library>
    <div className={styles.toolbar}>
      <p className={styles.note}>{zh ? '付款确认后，可在这里打开提示词或下载 Skill。' : 'Read your prompts and download Skills here after payment is confirmed.'}</p>
      <button className={styles.secondary} disabled={Boolean(busy)} onClick={async () => { setBusy('refresh'); try { await load() } catch { setError('temporarily_unavailable') } finally { setBusy('') } }}><RefreshCw size={15} aria-hidden="true" />{zh ? '刷新状态' : 'Refresh'}</button>
    </div>
    {error && <p role="alert" className={styles.error}>{paymentMessage(error, locale)}</p>}
    {!library && !error && <p role="status" className={styles.note}>{zh ? '正在读取购买记录…' : 'Loading your purchases…'}</p>}
    {checkout === 'processing' && (!library || library.orders.some(order => order.status === 'pending')) && <p role="status" className={styles.notice}>{zh ? '正在等待支付确认，请不要重复付款。若已完成支付，稍后刷新即可查看下载。' : 'Waiting for payment confirmation. Please do not pay again; refresh shortly to see your download.'}</p>}
    {checkout === 'canceled' && <p className={styles.notice}>{zh ? '你已离开结算，未完成的订单可以在下方取消。' : 'You left checkout. You can cancel an unfinished order below.'}</p>}
    {library && <>
      {library.membership && <div className={styles.notice}><strong>Pro {zh ? '会员' : 'membership'}</strong><p>{zh ? '有效期至' : 'Access until'} {date(library.membership.until)} · {library.membership.cancelAtPeriodEnd ? (zh ? '已取消自动续费' : 'Renewal canceled') : (zh ? '自动续费' : 'Renews automatically')}</p></div>}
      {library.billing && <div><button className={styles.secondary} disabled={Boolean(busy)} onClick={() => act('portal')}><CreditCard size={16} aria-hidden="true" />{zh ? '管理订阅与账单' : 'Manage subscription & billing'}</button></div>}
      <section className={styles.section}>
        <h2 className={styles.heading}>{zh ? '已解锁的内容' : 'Your unlocked content'}</h2>
        {library.packages.length ? <div className={styles.packages}>{library.packages.map(item => <article key={item.slug} className={styles.package}>
          <div><Link href={locale === 'zh' ? `/zh${item.path}` : item.path}><h3>{item.name}</h3></Link><small>v{item.version} · {item.kind === 'package' ? 'ZIP' : item.kind === 'skill-instructions' ? 'SKILL.md · TXT' : 'Prompt · TXT'}</small></div>
          {item.kind !== 'package' && <Link className={styles.primary} href={locale === 'zh' ? `/zh${item.path}` : item.path}>{zh ? '查看与复制' : 'Read & copy'}<ArrowUpRight size={16} aria-hidden="true" /></Link>}
          <button className={item.kind === 'package' ? styles.primary : styles.secondary} disabled={Boolean(busy)} onClick={() => act('download', item.slug)}><Download size={16} aria-hidden="true" />{busy === item.slug ? (zh ? '正在准备…' : 'Preparing…') : `${zh ? '下载' : 'Download'} ${item.kind === 'package' ? 'ZIP' : 'TXT'}`}</button>
        </article>)}</div> : <div className={styles.empty}><p>{zh ? '这里还没有可下载的 Skill。' : 'No Skill downloads on this page yet.'}</p><Link className={styles.link} href={locale === 'zh' ? '/zh/skills?access=paid' : '/skills?access=paid'}>{zh ? '浏览付费 Skill' : 'Browse paid Skills'}</Link></div>}
      </section>
      <section className={styles.section}>
        <h2 className={styles.heading}>{zh ? '购买记录' : 'Orders'}</h2>
        {library.orders.length ? <div className={styles.orders}>{library.orders.map(order => <div className={styles.order} key={order.id}>
          <div><strong>{order.slug ? order.name : (zh ? 'Pro 会员' : order.name)}</strong><small>{date(order.createdAt)} · {order.plan === 'monthly' ? (zh ? '月付' : 'Monthly') : order.plan === 'yearly' ? (zh ? '年付' : 'Yearly') : (zh ? '单独购买' : 'One-time')}</small><small>#{order.id.slice(0, 8)}</small></div>
          <div className={styles.orderState}><strong>{studioPrice(order.amount, locale)}</strong><span>{statuses[order.status] || order.status}</span>{order.status === 'pending' && <button className={styles.secondary} disabled={Boolean(busy)} onClick={() => act('cancel', order.id)}>{zh ? '取消待支付订单' : 'Cancel pending order'}</button>}</div>
        </div>)}</div> : <p className={styles.note}>{zh ? '尚无购买记录。' : 'No orders yet.'}</p>}
        <div className={styles.toolbar}>{after && <button className={styles.secondary} onClick={() => setAfter(null)}>{zh ? '返回最新' : 'Latest orders'}</button>}{library.next && <button className={styles.secondary} onClick={() => setAfter(library.next)}>{zh ? '更早的订单' : 'Older orders'}</button>}</div>
      </section>
    </>}
  </div>
}
