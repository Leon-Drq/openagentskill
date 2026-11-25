'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { Bookmark, FolderOpen, Receipt, X } from 'lucide-react'
import { STORE_PRODUCTS, storeHref, storeMoney } from '@/lib/storefront/catalog'
import { storeCopy } from '@/lib/storefront/copy'
import { useStoreLocale } from './shell'
import { useDemoStore } from './state'
import { WorkflowArtwork } from './artwork'
import { WorkflowCard } from './catalog'
import { DeliveryActions } from './delivery'
import styles from './storefront.module.css'

export function StoreLibrary({ tab }: { tab: 'acquired' | 'saved' | 'orders' }) {
  const locale = useStoreLocale(), c = storeCopy(locale), { ready, state, reset } = useDemoStore(), dialog = useRef<HTMLDialogElement>(null)
  const saved = STORE_PRODUCTS.filter(p => state.saved.includes(p.slug))
  const count = tab === 'acquired' ? state.items.length : tab === 'saved' ? saved.length : state.orders.length
  return <main className={styles.container}><header className={styles.pageHeading}><p className={styles.eyebrow}>{c.library}</p><h1>{c.libraryTitle}</h1><p>{c.libraryIntro}</p></header>
    <nav className={styles.libraryTabs} aria-label={c.library}>{(['acquired','saved','orders'] as const).map(key => <Link key={key} href={storeHref('/library', locale, { tab: key })} scroll={false} aria-current={tab === key ? 'page' : undefined}>{c[key]} {ready && (key === 'acquired' ? state.items.length : key === 'saved' ? saved.length : state.orders.length) || ''}</Link>)}</nav>
    {!ready ? <p className={styles.empty} role="status">{c.loading}</p> : !count ? <div className={styles.empty}>{tab === 'saved' ? <Bookmark size={32} /> : tab === 'orders' ? <Receipt size={32} /> : <FolderOpen size={32} />}<h2>{tab === 'saved' ? c.savedEmpty : tab === 'orders' ? c.noOrders : c.libraryEmpty}</h2><p>{tab === 'saved' ? c.savedHint : c.libraryEmptyHint}</p><Link className={styles.primary} href={storeHref('', locale)}>{c.browse}</Link></div>
      : tab === 'saved' ? <div className={styles.cardGrid}>{saved.map(p => <WorkflowCard key={p.slug} product={p} />)}</div>
      : tab === 'orders' ? <table className={styles.orderTable}><caption className="sr-only">{c.orders}</caption><thead><tr><th scope="col">{c.workflow}</th><th scope="col">{c.total}</th><th scope="col">{c.status}</th></tr></thead><tbody>{[...state.orders].reverse().map(order => <tr key={order.id}><td><Link href={storeHref('/success', locale, { order: order.id })}>{STORE_PRODUCTS.find(p => p.slug === order.slug)?.title[locale]}</Link><small>{order.id}</small></td><td>{storeMoney(order.price, locale)}</td><td>{c.demoOnly}<small>{new Date(order.createdAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}</small></td></tr>)}</tbody></table>
      : <div>{[...state.items].reverse().map(item => { const p = STORE_PRODUCTS.find(p => p.slug === item.slug)!; return <article key={item.slug} className={styles.libraryItem}><WorkflowArtwork art={p.art} /><div><h2><Link href={storeHref(`/workflows/${p.slug}`, locale)}>{p.title[locale]}</Link></h2><p>{item.edition === 'basic' ? c.basic : c.full} · v{p.version} · {c.demoOnly}</p><p>{c.added} {new Date(item.acquiredAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}</p>{item.edition === 'basic' && <Link className={styles.textButton} href={storeHref(`/checkout/${p.slug}`, locale)}>{c.buyPlus} · {storeMoney(p.price, locale)}</Link>}</div><div className={styles.actions}><DeliveryActions product={p} edition={item.edition} /></div></article> })}</div>}
    <div className={styles.libraryFooter}><p>{c.storageNote}</p><button className={styles.textButton} type="button" onClick={() => dialog.current?.showModal()}>{c.clearDemo}</button></div>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="reset-title"><div className={styles.dialogHeading}><h2 id="reset-title">{c.resetTitle}</h2><button type="button" aria-label={locale === 'zh' ? '关闭' : 'Close'} onClick={() => dialog.current?.close()}><X size={18} /></button></div><p>{c.resetNote}</p><div className={styles.actions}><button className={styles.secondary} autoFocus onClick={() => dialog.current?.close()}>{c.keep}</button><button className={styles.primary} onClick={() => { reset(); dialog.current?.close() }}>{c.reset}</button></div></dialog>
  </main>
}
