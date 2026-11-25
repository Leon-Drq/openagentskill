'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ArrowUpRight, Library, Sparkles } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { I18nProvider, useI18n } from '@/lib/i18n/context'
import { storeCopy } from '@/lib/storefront/copy'
import { storeHref, type StoreLocale } from '@/lib/storefront/catalog'
import { DemoStoreProvider, useDemoStore } from './state'
import styles from './storefront.module.css'

export function useStoreLocale(): StoreLocale { return useI18n().locale === 'zh' ? 'zh' : 'en' }
function StoreNavigation() {
  const locale = useStoreLocale(), c = storeCopy(locale), pathname = usePathname(), params = useSearchParams()
  const { state, ready, storageFailed } = useDemoStore()
  const languageHref = (lang: StoreLocale) => {
    const query = new URLSearchParams(params.toString())
    if (lang === 'zh') query.set('lang', 'zh'); else query.delete('lang')
    return `${pathname}${query.size ? '?' + query : ''}`
  }
  return <>
    <div className={styles.previewBar}><span className={styles.previewDot} /><strong>{c.preview}</strong><span>{c.previewNote}</span></div>
    <div className={styles.subnav}>
      <nav aria-label={locale === 'zh' ? '工作流导航' : 'Workflow navigation'}>
        <a href={`https://www.openagentskill.com${locale === 'zh' ? '/zh/skills' : '/skills'}`} target="_blank" rel="noreferrer">{c.registry}<ArrowUpRight size={13} /><span className="sr-only">{locale === 'zh' ? '（在新标签页打开线上目录）' : ' (opens the live registry in a new tab)'}</span></a>
        <Link href={storeHref('', locale)} aria-current={pathname === '/marketplace' || pathname.includes('/workflows/') ? 'page' : undefined}><Sparkles size={15} />{c.catalog}</Link>
        <Link href={storeHref('/library', locale)} aria-current={pathname.includes('/library') ? 'page' : undefined}><Library size={15} />{c.library}{ready && state.items.length > 0 && <span className={styles.count}>{state.items.length}</span>}</Link>
      </nav>
      <div className={styles.subnavRight}><Link href={storeHref('/publish', locale)} className={styles.publishLink}>{c.publish}<ArrowUpRight size={13} /></Link><div className={styles.language} aria-label={c.language}><Link href={languageHref('en')} aria-current={locale === 'en' ? 'page' : undefined} lang="en">EN</Link><Link href={languageHref('zh')} aria-current={locale === 'zh' ? 'page' : undefined} lang="zh">中文</Link></div></div>
    </div>
    {storageFailed && <p role="status" className={styles.storageWarning}>{c.storageError}</p>}
  </>
}
export function StoreShell({ children }: { children: React.ReactNode }) {
  const params = useSearchParams()
  const initialLocale = params.get('lang') === 'zh' ? 'zh' : 'en'
  return <I18nProvider initialLocale={initialLocale}><DemoStoreProvider><div className={styles.root}><SiteHeader /><StoreNavigation />{children}<SiteFooter /></div></DemoStoreProvider></I18nProvider>
}
