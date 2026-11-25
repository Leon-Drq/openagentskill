'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { ArrowRight, Bookmark, Search, X } from 'lucide-react'
import { NativeSelect } from '@/components/ui/native-select'
import { STORE_CATEGORIES, STORE_ACCESS, filterStoreProducts, storeHref, storeMoney, type StoreFilters, type StoreProduct } from '@/lib/storefront/catalog'
import { storeCopy } from '@/lib/storefront/copy'
import { useStoreLocale } from './shell'
import { useDemoStore } from './state'
import { WorkflowArtwork } from './artwork'
import styles from './storefront.module.css'

export function SaveWorkflow({ slug }: { slug: string }) {
  const { state, toggleSaved } = useDemoStore(), c = storeCopy(useStoreLocale()), saved = state.saved.includes(slug)
  return <button type="button" className={`${styles.bookmark} ${saved ? styles.bookmarked : ''}`} onClick={() => toggleSaved(slug)} aria-pressed={saved} aria-label={saved ? c.unsave : c.save}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /></button>
}
export function WorkflowCard({ product }: { product: StoreProduct }) {
  const locale = useStoreLocale(), c = storeCopy(locale), { state } = useDemoStore()
  const href = storeHref(`/workflows/${product.slug}`, locale)
  return <article className={styles.card}>
    <div className={styles.cardVisual}><Link href={href} aria-label={`${c.details}: ${product.title[locale]}`} tabIndex={-1}><WorkflowArtwork art={product.art} /></Link><SaveWorkflow slug={product.slug} /><span className={styles.artBadge}>{c.sample}</span></div>
    <div className={styles.cardBody}><div className={styles.cardEyebrow}><span>{c[product.category]}</span>{state.items.some(i => i.slug === product.slug) && <span className={styles.owned}>{c.owned}</span>}</div>
      <h2><Link href={href}>{product.title[locale]}</Link></h2><p>{product.description[locale]}</p>
      <div className={styles.cardBottom}><span>{product.access === 'free' ? <strong className={styles.freePrice}>{c.free}</strong> : product.access === 'freemium' ? <><strong className={styles.freePrice}>{c.free}</strong><small> / {c.plus} {storeMoney(product.price, locale)}</small></> : <><strong>{storeMoney(product.price, locale)}</strong><small> / {c.once}</small></>}</span><Link href={href} aria-label={`${c.details}: ${product.title[locale]}`}><ArrowRight size={19} /></Link></div>
    </div>
  </article>
}
export function StoreCatalog({ filters }: { filters: StoreFilters }) {
  const locale = useStoreLocale(), c = storeCopy(locale), router = useRouter(), [pending, startTransition] = useTransition()
  const products = filterStoreProducts(filters)
  function href(change: Partial<StoreFilters>) {
    const next = { ...filters, ...change }
    return storeHref('', locale, Object.fromEntries(Object.entries(next).filter(([key, value]) => value && value !== 'all' && !(key === 'sort' && value === 'featured'))))
  }
  const navigate = (change: Partial<StoreFilters>) => startTransition(() => router.push(href(change), { scroll: false }))
  const filtered = Boolean(filters.q || filters.category !== 'all' || filters.access !== 'all')
  return <main className={styles.container} aria-busy={pending}>
    <header className={styles.hero}><div><p className={styles.eyebrow}>OPENAGENTSKILL / {locale === 'zh' ? '精选工作流' : 'WORKFLOWS'}</p><h1>{c.title} <em>{c.titleAccent}</em></h1><p className={styles.intro}>{c.intro}</p>
      <form role="search" className={styles.search} onSubmit={e => { e.preventDefault(); navigate({ q: String(new FormData(e.currentTarget).get('q') || '').trim() }) }}><Search size={18} /><input key={filters.q} name="q" type="search" maxLength={120} defaultValue={filters.q} placeholder={c.placeholder} aria-label={c.search} /><button aria-label={c.search}>{locale === 'zh' ? '搜索' : 'Search'}</button></form>
      <p className={styles.agentLine}><span>Works with</span> Claude Code <i /> Codex <i /> Cursor</p>
    </div></header>
    <section className={styles.collection} aria-label={c.catalog}>
      <div className={styles.filterTop}><nav className={styles.categories} aria-label={c.category}>{STORE_CATEGORIES.map(category => <Link key={category} href={href({ category })} scroll={false} aria-current={filters.category === category ? 'page' : undefined}>{c[category]}</Link>)}</nav></div>
      <div className={styles.filterRow}><div className={styles.accessFilters} role="group" aria-label={c.access}>{STORE_ACCESS.map(access => <button key={access} type="button" onClick={() => navigate({ access })} aria-pressed={filters.access === access}>{c[access]}</button>)}</div><label className={styles.sortLabel}><span className="sr-only">{c.sort}</span><NativeSelect value={filters.sort} onChange={e => navigate({ sort: e.target.value })}><option value="featured">{c.recommended}</option><option value="price-asc">{c.low}</option><option value="price-desc">{c.high}</option></NativeSelect></label></div>
      <div className={styles.resultLine}><p role="status">{products.length} {c.results}{filters.q && <> · “{filters.q}”</>}</p>{filtered && <Link href={storeHref('', locale)} scroll={false}>{c.clear}<X size={13} /></Link>}</div>
      {products.length ? <div className={styles.cardGrid}>{products.map(product => <WorkflowCard key={product.slug} product={product} />)}</div> : <div className={styles.empty}><Search size={32} /><h2>{c.empty}</h2><p>{c.emptyHint}</p><Link className={styles.primary} href={storeHref('', locale)}>{c.clear}</Link></div>}
    </section>
    <div className={styles.bottomNote}><span>OpenAgentSkill</span><p>{locale === 'zh' ? '寻找更多开源技能？探索完整技能目录。' : 'Looking for more open-source skills? Explore the full registry.'}</p><a href={`https://www.openagentskill.com${locale === 'zh' ? '/zh/skills' : '/skills'}`} target="_blank" rel="noreferrer">{c.registry}<ArrowRight size={16} /><span className="sr-only">{locale === 'zh' ? '（在新标签页打开）' : ' (opens in a new tab)'}</span></a></div>
  </main>
}
