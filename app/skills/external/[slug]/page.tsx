import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { EXTERNAL_SKILLS, externalSkillHref, getExternalSkill } from '@/lib/skills/external-catalog'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string | string[] }> }
const base = 'https://www.openagentskill.com'
// Catalog releases define the route set. The proxy also rejects unknown entries
// before streaming, since this page reads dynamic language parameters.
export const dynamicParams = false
export function generateStaticParams() { return EXTERNAL_SKILLS.map(({ slug }) => ({ slug })) }
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const entry = getExternalSkill((await params).slug)
  if (!entry) return { title: 'External skill not found', robots: { index: false, follow: false } }
  const query = await searchParams
  const lang = query.lang === 'zh' ? 'zh' : 'en'
  const url = base + externalSkillHref(entry.slug)
  return {
    title: entry.title[lang], description: entry.description[lang],
    alternates: { canonical: url }, robots: { index: !query.lang, follow: true },
    openGraph: { type: 'website', title: entry.title[lang], description: entry.description[lang], url,
      ...(entry.runtimeDemo ? { images: [{ url: base + entry.runtimeDemo.poster, width: 1280, height: 720, alt: entry.title[lang] }] } : {}) },
    twitter: { card: entry.runtimeDemo ? 'summary_large_image' : 'summary', title: entry.title[lang], description: entry.description[lang],
      ...(entry.runtimeDemo ? { images: [base + entry.runtimeDemo.poster] } : {}) },
  }
}
export default async function ExternalSkillPage({ params, searchParams }: Props) {
  const entry = getExternalSkill((await params).slug)
  if (!entry) notFound()
  const zh = (await searchParams).lang === 'zh'
  const lang = zh ? 'zh' : 'en'
  const suffix = zh ? '?lang=zh' : ''
  const url = base + externalSkillHref(entry.slug)
  const demo = entry.runtimeDemo
  const jsonLd = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebPage', '@id': url, url, name: entry.title[lang], description: entry.description[lang], inLanguage: lang,
        about: { '@type': 'CreativeWork', name: entry.skillName, version: entry.version, license: entry.licenseUrl,
          author: { '@type': 'Person', name: entry.author.name, url: entry.author.url }, url: entry.sourcePostUrl } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Skills', item: base + '/skills' },
        { '@type': 'ListItem', position: 2, name: 'External Skills', item: base + '/skills/external' },
        { '@type': 'ListItem', position: 3, name: entry.title[lang], item: url },
      ] },
      ...(demo ? [{ '@type': 'VideoObject', '@id': url + '#runtime-demo',
        name: `${entry.title[lang]} — ${zh ? '本地实测录像' : 'Local runtime recording'}`,
        description: demo.scope[lang], thumbnailUrl: [base + demo.poster],
        contentUrl: base + demo.video, uploadDate: demo.publishedAt,
        duration: `PT${demo.durationSeconds}S`, inLanguage: 'en',
        creator: { '@type': 'Organization', name: 'OpenAgentSkill', url: base },
        creditText: `Skill by ${entry.author.name}; runtime recording by OpenAgentSkill. CC BY-NC 4.0.`,
        license: entry.licenseUrl, isPartOf: { '@id': url },
      }] : []),
    ],
  }
  return <div className="min-h-screen bg-background text-foreground">
    <SiteHeader />
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-10" lang={lang} data-external-skill={entry.slug}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav aria-label={zh ? '面包屑导航' : 'Breadcrumb'} className="flex flex-wrap gap-3 text-sm text-secondary">
        <Link href={zh ? '/zh/skills' : '/skills'}>{zh ? '技能' : 'Skills'}</Link><span>/</span>
        <Link href={`/skills/external${suffix}`}>{zh ? '外部平台' : 'External platforms'}</Link><span>/ RedSkill</span>
      </nav>
      <header className="border-b border-border py-12 sm:py-16">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#006b4f]">RedSkill / p5.js / {zh ? '站长收录' : 'Owner curated'}</p>
        <h1 className="mt-6 max-w-4xl text-balance font-display text-4xl leading-tight sm:text-6xl">{entry.title[lang]}</h1>
        <p className="mt-6 max-w-3xl text-base leading-8 text-secondary sm:text-lg">{entry.description[lang]}</p>
        <p className="mt-5 text-sm">{zh ? '作者' : 'By'} <a href={entry.author.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{entry.author.name} ↗</a></p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center bg-[#006b4f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#00533d]">{zh ? '打开作者原帖' : 'Open the author’s post'} ↗</a>
          <p className="text-xs text-secondary">{demo ? (zh ? '仅限非商业用途 · 附本地实测录像' : 'Noncommercial use only · Local runtime recording') : (zh ? '仅限非商业用途 · 未运行验证' : 'Noncommercial use only · Not runtime-verified')}</p>
        </div>
      </header>
      {demo && <section className="border-b border-border py-10 sm:py-12" aria-labelledby="runtime-heading">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="font-mono text-xs uppercase tracking-[0.18em] text-[#006b4f]">{zh ? '本地实测 · 非模拟效果' : 'Local runtime · Actual output'}</p>
            <h2 id="runtime-heading" className="mt-3 font-display text-3xl sm:text-4xl">{zh ? '先看效果，再开始创作。' : 'See it run. Then make it yours.'}</h2></div>
          <span className="text-xs text-secondary">21s · 720p · {zh ? '无声' : 'Silent'}</span>
        </div>
        <figure>
          <video controls playsInline preload="none" poster={demo.poster} width={1280} height={720}
            aria-label={zh ? '雨帘、花枝与飞燕实测视频' : 'Rain, branches and swallows runtime video'} aria-describedby="runtime-caption"
            className="aspect-video w-full border border-border bg-[#f7f5ee]">
            <source src={demo.video} type="video/mp4" />
            <track src="/media/external/p5-animation/captions-en.vtt" kind="captions" srcLang="en" label="English" />
            <track src="/media/external/p5-animation/captions-zh.vtt" kind="captions" srcLang="zh" label="中文" default={zh} />
            <a href={demo.video}>{zh ? '打开 MP4 视频' : 'Open the MP4 video'}</a>
          </video>
          <figcaption id="runtime-caption" className="mt-4 grid gap-3 text-xs leading-6 text-secondary sm:grid-cols-[minmax(0,1fr)_260px]">
            <p>{demo.scope[lang]}</p>
            <p>{zh ? '技能作者：' : 'Skill by '}<a href={entry.author.url} className="underline underline-offset-4">{entry.author.name}</a><br />
              {zh ? '录制：OpenAgentSkill · 2026-09-11' : 'Recorded by OpenAgentSkill · 2026-09-11'}<br />{demo.environment}<br />
              <a href={entry.licenseUrl} className="underline underline-offset-4">CC BY-NC 4.0</a></p>
          </figcaption>
        </figure>
      </section>}
      <div className="grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <section aria-labelledby="animation-types">
            <h2 id="animation-types" className="font-display text-3xl">{zh ? '三种动画，一句话定制。' : 'Three animations. Your direction.'}</h2>
            <p className="mt-3 text-sm text-secondary">{zh ? '以下为技能包的功能说明；自定义参数的效果需在自己的环境中检查。' : 'Package capabilities are described below; test custom parameters in your own environment.'}</p>
            {entry.examples.map(example => <div key={example.title.en} className="grid gap-3 border-b border-border py-7 sm:grid-cols-[140px_1fr]">
              <h3 className="font-display text-xl">{example.title[lang]}</h3><p className="text-sm leading-7 text-secondary">{example.description[lang]}</p>
            </div>)}
          </section>
          <section className="mt-10" aria-labelledby="external-use">
            <h2 id="external-use" className="font-display text-3xl">{zh ? '如何使用' : 'How to use it'}</h2>
            <p className="mt-4 text-sm leading-8 text-secondary">{entry.usage[lang]}</p>
            <p className="mt-4 text-sm leading-8 text-secondary">{entry.limitations[lang]}</p>
          </section>
          <section className="mt-10 border-t border-border pt-8" aria-labelledby="external-source">
            <h2 id="external-source" className="font-display text-3xl">{zh ? '来源与版本记录' : 'Source & version record'}</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div><dt className="text-secondary">{zh ? '平台标识' : 'Platform identifier'}</dt><dd className="mt-1 break-all font-mono text-xs">{entry.identifier}</dd></div>
              <div><dt className="text-secondary">{zh ? '收录时版本' : 'Version at listing'}</dt><dd>{entry.version} · RedSkill manifest</dd></div>
              <div><dt className="text-secondary">{zh ? '包校验值（不代表安全认证）' : 'Bundle checksum (not a safety certification)'}</dt><dd className="mt-1 break-all font-mono text-xs">SHA-256 {entry.bundleSha256}</dd></div>
            </dl>
            <p className="mt-5 text-xs leading-6 text-secondary">{zh ? '版本为收录时快照，当前不自动同步外部平台。实测录像仅说明所列环境中的示例效果，不代表 AI 审核、安全认证或创作者身份认证。' : 'Version is a listing-time snapshot, not automatically synchronized. A runtime recording demonstrates only the examples in the stated environment, not AI review, security certification or creator-identity verification.'}</p>
            <Link href={`/api/external-skills/${entry.slug}`} className="mt-4 inline-block text-sm text-[#006b4f] underline underline-offset-4">{zh ? '查看只读元数据' : 'Read-only metadata'} →</Link>
          </section>
        </div>
        <aside className="self-start border-t-2 border-[#006b4f] pt-6 lg:sticky lg:top-24" aria-label={zh ? '使用与许可' : 'Access & license'}>
          <p className="font-mono text-xs text-secondary">{zh ? '前往原平台使用' : 'USE ON THE SOURCE PLATFORM'}</p>
          <p className="mt-3 text-xs leading-6 text-secondary">{zh ? '帖内提供 RedSkill 入口，可能需要小红书 App 或登录。' : 'Use the RedSkill entry in the post. Xiaohongshu may require its app or sign-in.'}</p>
          <div className="mt-7 border-t border-border pt-6">
            <h2 className="text-base font-semibold">{zh ? '仅限非商业用途' : 'Noncommercial use only'}</h2>
            <a href={entry.licenseUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm underline underline-offset-4">CC BY-NC 4.0 ↗</a>
            <p className="mt-4 text-xs leading-7 text-secondary">{entry.licenseNote[lang]}</p>
          </div>
          <p className="mt-7 border-t border-border pt-5 text-xs leading-6 text-secondary">{zh ? '独立外部条目，不计入 GitHub Star 排行或自动安装推荐。本站不托管技能源代码或技能包。录像按站长确认的授权作非商业展示，原技能许可不变。' : 'An independent external listing, excluded from GitHub Star rankings and automatic install recommendations. We do not host the skill source or bundle. The recording is displayed noncommercially with permission confirmed by the site owner; the original skill license is unchanged.'}</p>
        </aside>
      </div>
    </main>
    <SiteFooter />
  </div>
}
