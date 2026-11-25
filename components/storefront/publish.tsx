'use client'

import { useEffect, useState } from 'react'
import { NativeSelect } from '@/components/ui/native-select'
import { STORE_CATEGORIES, storeMoney } from '@/lib/storefront/catalog'
import { storeCopy } from '@/lib/storefront/copy'
import { useStoreLocale } from './shell'
import { WorkflowArtwork } from './artwork'
import styles from './storefront.module.css'

const KEY = 'oas.storefront.listing-draft.v1'
const emptyDraft = { name: '', description: '', category: 'web', access: 'free', price: '', runtime: '', rights: false }
export function StorePublish() {
  const locale = useStoreLocale(), c = storeCopy(locale), [draft, setDraft] = useState(emptyDraft), [status, setStatus] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const value = JSON.parse(localStorage.getItem(KEY) || 'null')
        if (value && typeof value === 'object') setDraft({ ...emptyDraft,
          name: typeof value.name === 'string' ? value.name.slice(0,80) : '',
          description: typeof value.description === 'string' ? value.description.slice(0,500) : '',
          category: STORE_CATEGORIES.includes(value.category) && value.category !== 'all' ? value.category : 'web',
          access: ['free','paid','freemium'].includes(value.access) ? value.access : 'free',
          price: typeof value.price === 'string' ? value.price.slice(0,8) : '',
          runtime: typeof value.runtime === 'string' ? value.runtime.slice(0,500) : '', rights: value.rights === true,
        })
      } catch { /* The form remains usable without storage. */ }
    },0)
    return () => clearTimeout(timer)
  }, [])
  function change(key: keyof typeof draft, value: string | boolean) { setDraft(d => ({ ...d, [key]: value })); setStatus('') }
  const art = ({ web: 'portfolio', slides: 'deck', video: 'video', image: 'visual', writing: 'article', research: 'research' } as Record<string,string>)[draft.category]
  return <main className={styles.container}><header className={styles.pageHeading}><p className={styles.eyebrow}>{c.draft}</p><h1>{c.publishTitle}</h1><p>{c.publishIntro}</p></header><div className={styles.publishGrid}>
    <form className={styles.form} onSubmit={e => { e.preventDefault(); try { localStorage.setItem(KEY, JSON.stringify(draft)); setStatus(c.draftSaved) } catch { setStatus(c.storageError) } }}>
      <label>{c.productName}<input value={draft.name} onChange={e => change('name', e.target.value)} required maxLength={80} /></label>
      <label>{c.description}<textarea value={draft.description} onChange={e => change('description', e.target.value)} required maxLength={500} /></label>
      <div className={styles.formRow}><label>{c.category}<NativeSelect value={draft.category} onChange={e => change('category', e.target.value)}>{STORE_CATEGORIES.filter(v => v !== 'all').map(v => <option key={v} value={v}>{c[v]}</option>)}</NativeSelect></label><label>{c.access}<NativeSelect value={draft.access} onChange={e => change('access', e.target.value)}>{(['free','freemium','paid'] as const).map(v => <option key={v} value={v}>{c[v]}</option>)}</NativeSelect></label></div>
      {draft.access !== 'free' && <label>{c.price}<input type="number" min="1" max="9999" step="1" required value={draft.price} onChange={e => change('price',e.target.value)} /></label>}
      <label>{c.runtimeLabel}<textarea value={draft.runtime} onChange={e => change('runtime',e.target.value)} placeholder={c.runtimePlaceholder} maxLength={500} required /></label>
      <label className={styles.agreement}><input type="checkbox" required checked={draft.rights} onChange={e => change('rights',e.target.checked)} /><span>{c.rights}</span></label>
      <div className={styles.notice}>{c.draftNote}</div><button className={styles.primary} type="submit">{c.saveDraft}</button><p role="status">{status}</p>
    </form><aside className={styles.draftPreview} aria-label={c.sample}><p>{c.sample}</p><article className={styles.card}><div className={styles.cardVisual}><WorkflowArtwork art={art} /></div><div className={styles.cardBody}><div className={styles.cardEyebrow}>{c[draft.category as 'web']}</div><h2>{draft.name || c.productName}</h2><p>{draft.description || c.description}</p><div className={styles.cardBottom}><strong>{draft.access === 'free' ? c.free : draft.price ? storeMoney(Number(draft.price),locale) : '—'}</strong><small>{draft.access === 'freemium' ? c.freemium : c.once}</small></div></div></article></aside>
  </div></main>
}
