'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, FolderOpen } from 'lucide-react'
import { storeHref, storeMoney, type StoreProduct } from '@/lib/storefront/catalog'
import { storeCopy } from '@/lib/storefront/copy'
import { useStoreLocale } from './shell'
import { useDemoStore } from './state'
import { WorkflowArtwork } from './artwork'
import { SaveWorkflow } from './catalog'
import styles from './storefront.module.css'

export function StoreDetail({ product }: { product: StoreProduct }) {
  const locale = useStoreLocale(), c = storeCopy(locale), router = useRouter(), { state, ready, acquire } = useDemoStore()
  const [variant, setVariant] = useState(0)
  const item = state.items.find(i => i.slug === product.slug), owned = Boolean(item?.edition === 'full')
  function getFree() {
    acquire(product.slug, product.access === 'freemium' ? 'basic' : 'full')
    router.push(storeHref('/library', locale))
  }
  return <main className={styles.container}>
    <nav className={styles.breadcrumb} aria-label={locale === 'zh' ? '面包屑导航' : 'Breadcrumb'}><Link href={storeHref('', locale)}><ArrowLeft size={13} />{c.catalog}</Link><span>/</span><Link href={storeHref('', locale, { category: product.category })}>{c[product.category]}</Link><span>/</span><span>{product.title[locale]}</span></nav>
    <div className={styles.detailGrid}>
      <div className={styles.detailMedia}><WorkflowArtwork art={product.art} variant={variant} /><p className={styles.mediaCaption}>{c.example}</p><div className={styles.thumbnails}>{[0,1].map(value => <button key={value} type="button" aria-label={`${c.sample} ${value + 1}`} aria-pressed={variant === value} onClick={() => setVariant(value)}><WorkflowArtwork art={product.art} variant={value} /></button>)}</div></div>
      <section className={styles.purchasePanel} aria-label={c.access}>
        <div className={styles.panelMeta}><span>{c[product.category]} · v{product.version}</span><SaveWorkflow slug={product.slug} /></div>
        <h1>{product.title[locale]}</h1><p className={styles.description}>{product.description[locale]}</p><p className={styles.creator}>{c.creator}</p>
        <div className={styles.priceBlock}><small>{product.access === 'free' ? c.free : c.priceLabel}</small><div className={styles.priceLine}><strong>{product.access === 'free' ? c.free : storeMoney(product.price, locale)}</strong><span>{product.access === 'freemium' ? c.plus + ' · ' + c.once : product.access === 'paid' ? c.once : c.basic}</span></div>
          {owned ? <Link className={styles.primary} href={storeHref('/library', locale)}><FolderOpen size={17} />{c.inLibrary}</Link>
            : product.access === 'free' ? <button type="button" className={styles.primary} disabled={!ready} onClick={getFree}>{c.get}<ArrowRight size={16} /></button>
              : <Link className={styles.primary} href={storeHref(`/checkout/${product.slug}`, locale)}>{product.access === 'freemium' ? c.buyPlus : c.buy}<ArrowRight size={16} /></Link>}
          {!owned && product.access === 'freemium' && (item ? <Link className={styles.secondary} href={storeHref('/library', locale)}>{c.inLibrary} · {c.basic}</Link> : <button className={styles.secondary} type="button" disabled={!ready} onClick={getFree}>{c.freeBasic}</button>)}
          <p className={styles.microcopy}>{product.access === 'free' ? c.setupNote : c.previewBuy}<br />{c.noCredits}</p>
        </div>
        <div className={styles.accessNote}><FolderOpen size={26} /><div><strong>{c.accessNote}</strong><p>{c.accessDescription}</p></div></div>
        <div className={styles.smallFacts}><span>Claude Code</span><span>Codex</span><span>Cursor</span><span>ZIP / SKILL.md</span></div>
      </section>
    </div>
    <div className={styles.detailBelow}><div><section className={styles.section}><h2>{c.included}</h2><ul className={styles.includedList}>{product.includes.map((item, i) => <li key={i}><Check size={16} />{item[locale]}</li>)}</ul></section><section className={`${styles.section} ${styles.faq}`}><h2>{c.faq}</h2>{[[c.q1,c.a1],[c.q2,c.a2],[c.q3,c.a3]].map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section></div>
      <section className={styles.section}><h2>{c.before}</h2><dl className={styles.facts}>{[[c.input,product.input[locale]],[c.output,product.output[locale]],[c.runtime,product.runtime[locale]],[c.license,c.licenseNote]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section></div>
  </main>
}
