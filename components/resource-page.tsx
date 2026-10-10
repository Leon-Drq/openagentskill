import type { ReactNode } from 'react'
import Link from '@/components/crawl-link'
import { MarketingPageShell } from '@/components/marketing-page'
import { breadcrumbData, jsonLd, RESOURCE_PAGES, RESOURCE_SITE, type ResourcePageKey } from '@/lib/seo/resource-pages'
import styles from './resource-page.module.css'

const labels = {
  en: ['Home', 'Docs', 'API', 'Continue exploring', 'Breadcrumb', 'Related resources'],
  zh: ['首页', '文档', 'API', '继续探索', '面包屑导航', '相关资源'],
  ja: ['ホーム', 'ドキュメント', 'API', 'さらに探す', 'パンくずリスト', '関連リソース'],
  ko: ['홈', '문서', 'API', '더 알아보기', '탐색 경로', '관련 리소스'],
  es: ['Inicio', 'Documentación', 'API', 'Sigue explorando', 'Ruta de navegación', 'Recursos relacionados'],
  de: ['Startseite', 'Dokumentation', 'API', 'Weiter entdecken', 'Brotkrumennavigation', 'Weitere Ressourcen'],
  fr: ['Accueil', 'Documentation', 'API', 'Continuer à explorer', 'Fil d’Ariane', 'Ressources associées'],
  id: ['Beranda', 'Dokumentasi', 'API', 'Jelajahi lebih lanjut', 'Navigasi halaman', 'Sumber terkait'],
} as const

export function ResourcePageShell({ page, children, detail, locale = 'en' }: {
  page: ResourcePageKey; children: ReactNode; detail?: { title: string; path: string }; locale?: keyof typeof labels
}) {
  const definition = RESOURCE_PAGES[page]
  const copy = labels[locale]
  const localPath = (key: ResourcePageKey) => `${locale !== 'en' && (key === 'docs' || key === 'api') ? `/${locale}` : ''}${RESOURCE_PAGES[key].path}`
  const name = page === 'docs' ? copy[1] : page === 'api' ? copy[2] : definition.label
  const crumbs = [
    { name: copy[0], path: locale === 'en' ? '/' : `/${locale}` },
    { name, path: localPath(page) },
    ...(detail ? [{ name: detail.title, path: detail.path }] : []),
  ]
  const related: ResourcePageKey[] = locale === 'en'
    ? page === 'weekly' || page === 'monthly' || page === 'research'
      ? ['weekly', 'monthly', 'research', 'guides']
      : page === 'blog' || page === 'guides' ? ['blog', 'guides', 'weekly', 'docs'] : ['docs', 'agent', 'api', 'cli']
    : ['docs', 'api']
  const schema = [breadcrumbData(crumbs), ...(!detail ? [{
    '@context': 'https://schema.org', '@type': definition.collection ? 'CollectionPage' : 'WebPage',
    '@id': `${RESOURCE_SITE}${localPath(page)}#webpage`, url: `${RESOURCE_SITE}${localPath(page)}`,
    name: locale === 'en' ? definition.title : name,
    ...(locale === 'en' ? { description: definition.description } : {}),
    inLanguage: locale === 'zh' ? 'zh-CN' : locale,
    isPartOf: { '@id': `${RESOURCE_SITE}/#website` },
  }] : [])]
  return <MarketingPageShell mainClassName={styles.page} language={locale === 'zh' ? 'zh-CN' : locale}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
    <nav aria-label={copy[4]} className={styles.breadcrumb}>
      <ol>{crumbs.map((crumb, index) => <li key={crumb.path}>
        {index > 0 && <span aria-hidden="true">/</span>}
        {index === crumbs.length - 1 ? <span aria-current="page">{crumb.name}</span> : <Link href={crumb.path}>{crumb.name}</Link>}
      </li>)}</ol>
    </nav>
    {children}
    <aside className={styles.related} aria-label={copy[5]}>
      <h2>{copy[3]}</h2>
      <nav aria-label={copy[5]}>{related.filter((key) => key !== page || detail).map((key) =>
        <Link key={key} href={localPath(key)}>{key === 'docs' ? copy[1] : key === 'api' ? copy[2] : RESOURCE_PAGES[key].label}<span aria-hidden="true">→</span></Link>
      )}</nav>
    </aside>
  </MarketingPageShell>
}

export function ResourceContents({ items }: { items: readonly { id: string; label: string }[] }) {
  return <nav className={styles.contents} aria-label="On this page">
    <p>On this page</p>
    <ul>{items.map(({ id, label }) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ul>
  </nav>
}

export function ReportMethod({ count, days, generatedAt }: { count: number; days: number; generatedAt: string }) {
  return <section className={styles.method} aria-labelledby="report-method">
    <h2 id="report-method">About this snapshot</h2>
    <p>Generated <time dateTime={generatedAt}>{new Date(generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })} (UTC)</time> from {count.toLocaleString()} records in a quality-ranked sample of up to 1,200 skills. This is a curated snapshot, not a census of the registry.</p>
    <p>New and maintained lists use the preceding {days} days. Counts describe the entries shown; lists are capped. Trust and quality scores reflect the current snapshot. Views and install-command copies are cumulative observed events, not totals for this period or verified installs.</p>
    {count === 0 && <p>Source records are unavailable in this snapshot. A blank list does not mean there was no activity.</p>}
    <Link href="/reports/state-of-agent-skills-2026">Read the research methods and download the dataset →</Link>
  </section>
}
