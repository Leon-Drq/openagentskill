'use client'

import { useRef, useState } from 'react'
import { BookOpen, Copy, Download, X } from 'lucide-react'
import type { StoreProduct } from '@/lib/storefront/catalog'
import { storeCopy } from '@/lib/storefront/copy'
import { createSampleZip, sampleFiles, starterPrompt } from '@/lib/storefront/sample-package'
import { useStoreLocale } from './shell'
import styles from './storefront.module.css'

export function DeliveryActions({ product, edition }: { product: StoreProduct; edition: 'basic' | 'full' }) {
  const locale = useStoreLocale(), c = storeCopy(locale), dialog = useRef<HTMLDialogElement>(null)
  const [copyState, setCopyState] = useState(''), [error, setError] = useState('')
  function download() {
    try {
      const bytes = createSampleZip(sampleFiles(product, locale, edition))
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' }))
      const a = document.createElement('a'); a.href = url; a.download = `${product.slug}-${edition}-DEMO.zip`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { setError(locale === 'zh' ? '下载未成功，请重试。' : 'Download failed. Please try again.') }
  }
  return <>
    <button type="button" className={styles.primary} onClick={() => { setCopyState(''); dialog.current?.showModal() }}><BookOpen size={16} />{c.install}</button>
    <button type="button" className={styles.secondary} onClick={download}><Download size={16} />{c.download}</button>
    {error && <p role="alert">{error}</p>}
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={`setup-${product.slug}`} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close() }}>
      <div className={styles.dialogHeading}><h2 id={`setup-${product.slug}`}>{c.setupTitle}</h2><button type="button" aria-label={locale === 'zh' ? '关闭' : 'Close'} onClick={() => dialog.current?.close()}><X size={20} /></button></div>
      <p>{product.title[locale]} · {c.sample}</p><ol><li>{c.step1}</li><li>{c.step2}</li><li>{c.step3}</li></ol>
      <div className={styles.notice}>{c.setupNote}</div>
      <label><span className="sr-only">{c.copy}</span><textarea readOnly value={starterPrompt(product, locale)} onFocus={e => e.currentTarget.select()} /></label>
      <div className={styles.actions}><button type="button" className={styles.primary} onClick={async () => { try { await navigator.clipboard.writeText(starterPrompt(product, locale)); setCopyState(c.copied) } catch { setCopyState(c.copyError) } }}><Copy size={15} />{c.copy}</button><button type="button" className={styles.secondary} onClick={download}><Download size={15} />{c.download}</button></div>
      <p role="status">{copyState}</p>
    </dialog>
  </>
}
