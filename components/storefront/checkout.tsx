'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, FlaskConical } from 'lucide-react'
import { storeHref, storeMoney, type StoreProduct } from '@/lib/storefront/catalog'
import { storeCopy } from '@/lib/storefront/copy'
import { useStoreLocale } from './shell'
import { useDemoStore } from './state'
import { WorkflowArtwork } from './artwork'
import { DeliveryActions } from './delivery'
import styles from './storefront.module.css'

export function StoreCheckout({ product }: { product: StoreProduct }) {
  const locale = useStoreLocale(), c = storeCopy(locale), router = useRouter(), { ready, state, acquire } = useDemoStore()
  const [agreed, setAgreed] = useState(false), [submitting, setSubmitting] = useState(false), submitted = useRef(false)
  const owned = state.items.some(item => item.slug === product.slug && item.edition === 'full')
  return <main className={styles.container}>
    <nav className={styles.breadcrumb} aria-label={c.back}><Link href={storeHref(`/workflows/${product.slug}`, locale)}><ArrowLeft size={13} />{c.cancel}</Link></nav>
    <header className={styles.pageHeading} style={{ paddingTop: 0 }}><p className={styles.eyebrow}>{c.preview}</p><h1>{c.checkout}</h1><p>{c.checkoutIntro}</p></header>
    <div className={styles.checkoutGrid}><section><div className={styles.checkoutProduct}><WorkflowArtwork art={product.art} /><div><h2>{product.title[locale]}</h2><p>{c[product.category]} · v{product.version} · {product.access === 'freemium' ? c.plus : c.full}</p></div></div>
      <section className={styles.section}><h2>{c.included}</h2><ul className={styles.includedList}>{product.includes.map((v,i) => <li key={i}><Check size={16} />{v[locale]}</li>)}</ul></section>
      <section className={styles.section}><dl className={styles.facts}><div><dt>{c.runtime}</dt><dd>{product.runtime[locale]}</dd></div><div><dt>{c.license}</dt><dd>{c.licenseNote}</dd></div></dl></section>
      <div className={styles.notice}><FlaskConical size={18} /><span>{c.demoCheckout}</span></div>
    </section><form className={styles.checkoutSummary} onSubmit={e => {
      e.preventDefault(); if (!agreed || !ready || owned || submitted.current) return
      submitted.current = true; setSubmitting(true)
      const id = `DEMO-${crypto.randomUUID()}`
      acquire(product.slug, 'full', id)
      router.replace(storeHref('/success', locale, { order: id }))
    }}><h2>{c.order}</h2><div className={styles.summaryRow}><span>{product.title[locale]}</span><span>{storeMoney(product.price, locale)}</span></div><div className={`${styles.summaryRow} ${styles.summaryTotal}`}><strong>{c.total}</strong><strong>{storeMoney(product.price, locale)}</strong></div>
      {owned ? <Link className={styles.primary} href={storeHref('/library', locale)}>{c.inLibrary}</Link> : <><label className={styles.agreement}><input type="checkbox" required checked={agreed} onChange={e => setAgreed(e.target.checked)} /><span>{c.agreement}</span></label><button type="submit" className={styles.primary} disabled={!ready || !agreed || submitting}>{submitting ? c.confirming : c.confirm}</button></>}
      <p className={styles.microcopy}>{c.previewBuy}</p>
    </form></div>
  </main>
}
export function StoreSuccess({ orderId }: { orderId: string }) {
  const locale = useStoreLocale(), c = storeCopy(locale), { ready, state } = useDemoStore()
  const order = state.orders.find(order => order.id === orderId)
  // Product catalog is deliberately static and contains no protected assets.
  return <SuccessContent ready={ready} order={order} locale={locale} copy={c} />
}
import { STORE_PRODUCTS, type StoreLocale } from '@/lib/storefront/catalog'
import type { DemoOrder } from '@/lib/storefront/demo-state'
function SuccessContent({ ready, order, locale, copy: c }: { ready: boolean; order?: DemoOrder; locale: StoreLocale; copy: ReturnType<typeof storeCopy> }) {
  const product = STORE_PRODUCTS.find(p => p.slug === order?.slug)
  if (!ready) return <main className={styles.container}><p className={styles.empty} role="status">{c.loading}</p></main>
  return <main className={styles.container}><section className={styles.success}>
    {product && order ? <><div className={styles.successMark}><Check size={28} /></div><h1>{c.success}</h1><p>{c.successIntro}</p><p className={styles.receipt}>{c.receipt} · {order.id}</p><h2>{product.title[locale]}</h2><div className={styles.actions}><DeliveryActions product={product} edition="full" /></div><Link className={styles.textButton} href={storeHref('/library', locale)}>{c.inLibrary}</Link></>
      : <><h1>{c.returnCheckout}</h1><p>{c.returnHint}</p><div className={styles.actions}><Link className={styles.primary} href={storeHref('/library', locale)}>{c.library}</Link><Link className={styles.secondary} href={storeHref('', locale)}>{c.browse}</Link></div></>}
  </section></main>
}
