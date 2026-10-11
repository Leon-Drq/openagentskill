import Link from '@/components/crawl-link'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import type { ExternalSkill } from '@/lib/skills/external-catalog'

/** A font asset is discoverable beside Skills without inventing an installer. */
export function FontResourceContent({ entry, zh }: { entry: Extract<ExternalSkill, { provider: 'resource' }>; zh: boolean }) {
  const lang = zh ? 'zh' : 'en'
  const url = `https://www.openagentskill.com/skills/${entry.slug}`
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', url, name: entry.title[lang], description: entry.description[lang], inLanguage: lang,
      about: { '@type': 'CreativeWork', name: entry.skillName, url: entry.sourceUrl, license: entry.licenseUrl, version: entry.version,
        creator: { '@type': 'Person', name: entry.author.name, url: entry.author.url }, isAccessibleForFree: true } },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Skills', item: 'https://www.openagentskill.com/skills' },
      { '@type': 'ListItem', position: 2, name: entry.title[lang], item: url },
    ] },
  ] }
  return <div className="min-h-screen bg-background text-foreground">
    <SiteHeader />
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6" lang={lang} data-font-resource={entry.slug}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
      <nav aria-label={zh ? '面包屑导航' : 'Breadcrumb'} className="flex flex-wrap gap-3 text-sm text-secondary">
        <Link href={zh ? '/zh/skills' : '/skills'} className="underline underline-offset-4">Skills</Link><span>/</span><span>{entry.title[lang]}</span>
      </nav>
      <header className="border-b border-border py-12">
        <p className="text-sm text-[#006b4f]">{zh ? '免费字体资源 · 站长收录' : 'Free font resource · Owner curated'}</p>
        <h1 className="mt-5 font-display text-[32px] leading-tight sm:text-[40px] lg:text-[48px]">{entry.title[lang]}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-secondary">{entry.description[lang]}</p>
        <p className="mt-4 text-sm text-secondary">{zh ? '整理者' : 'Curated by'} <a className="underline underline-offset-4" href={entry.author.url} rel="noopener noreferrer" target="_blank">{entry.author.name} ↗</a></p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg bg-[#006b4f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#00533d]">{zh ? '在 GitHub 获取字库' : 'Get fonts on GitHub'} ↗</a>
          <Link href={entry.articlePath} className="inline-flex min-h-11 items-center rounded-lg border border-border px-5 py-3 text-sm hover:bg-muted">{zh ? '阅读配图与视频使用教程（英文）' : 'Read the image & video guide'} →</Link>
        </div>
      </header>
      <div className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-10">
          <section><h2 className="font-display text-3xl">{zh ? '从底图到准确的中文排版' : 'From an image to deliberate typography'}</h2><p className="mt-4 text-base leading-8 text-secondary">{entry.usage[lang]}</p></section>
          <section><h2 className="font-display text-3xl">{zh ? '格式与适用范围' : 'Formats & limitations'}</h2><p className="mt-4 text-base leading-8 text-secondary">{entry.limitations[lang]}</p></section>
          <section><h2 className="font-display text-3xl">{zh ? '来源与版本' : 'Source & version'}</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div><dt className="text-secondary">{zh ? '目录版本' : 'Manifest version'}</dt><dd className="mt-1">{entry.version}</dd></div>
              <div><dt className="text-secondary">Git commit</dt><dd className="mt-1 break-all font-mono text-xs">{entry.sourceCommit}</dd></div>
              <div><dt className="text-secondary">{zh ? '收录日期' : 'Listed on'}</dt><dd className="mt-1">{entry.publishedAt.slice(0, 10)}</dd></div>
            </dl>
            <a className="mt-5 inline-flex min-h-11 items-center text-sm text-[#006b4f] underline underline-offset-4" href={entry.manifestUrl} target="_blank" rel="noopener noreferrer">{zh ? '查看固定版本目录' : 'View pinned font manifest'} ↗</a>
            <p className="mt-3 text-sm leading-7 text-secondary">{zh ? '来源记录不代表兼容性测试或安全认证；版本更新需重新核对。本站不托管字体包。' : 'Source records are not compatibility tests or safety certifications. Updates require a new check. We do not host the font package.'}</p>
            <Link href={`/api/external-skills/${entry.slug}`} className="mt-3 inline-flex min-h-11 items-center text-sm text-[#006b4f] underline underline-offset-4">{zh ? '查看只读资源元数据' : 'Read resource metadata'} →</Link>
          </section>
        </div>
        <aside className="self-start rounded-xl border border-border bg-card p-6" aria-label={zh ? '许可与获取方式' : 'License & access'}>
          <p className="text-sm font-semibold">{zh ? '免费使用 · 遵守字体许可' : 'Free to use · Font terms apply'}</p>
          <a href={entry.licenseUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center text-sm text-[#006b4f] underline underline-offset-4">SIL OFL 1.1 ↗</a>
          <p className="mt-3 text-sm leading-7 text-secondary">{entry.licenseNote[lang]}</p>
          <p className="mt-6 text-sm leading-7 text-secondary">{zh ? '字体资源不是 Agent Skill：不提供自动安装，不赋予 AI 审核或创作者认证标记，不参与 Skill 安装成功率及 GitHub Star 排名。' : 'A font resource is not an Agent Skill: no automatic installation, AI review or creator-verification badge, and no inclusion in Skill install-success metrics or GitHub Star rankings.'}</p>
        </aside>
      </div>
    </main>
    <SiteFooter />
  </div>
}
