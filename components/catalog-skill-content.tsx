import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { externalSkillHref, getExternalSkill, EXTERNAL_SKILLS } from '@/lib/skills/external-catalog'
import { externalSourceHref, externalSourceRel } from '@/lib/skills/external-outbound'
import { SkillPreviewImage } from '@/components/skill-preview-image'
import { ProviderVideoPreview } from './provider-video-preview'
import { SkillryLogo } from './skillry-logo'
import { SkillActions, SkillEngagementProvider } from '@/components/skill-engagement'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string | string[] }> }
const base = 'https://www.openagentskill.com'
const externalOutputLabels = { image: { en: 'Images', zh: '图像' }, presentation: { en: 'Presentations', zh: '演示文稿' }, html: { en: 'Web & HTML', zh: '网页与 HTML' }, video: { en: 'Video', zh: '视频' } }
export async function buildCatalogSkillMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const entry = getExternalSkill((await params).slug)
  if (!entry) return { title: 'External skill not found', robots: { index: false, follow: false } }
  const query = await searchParams
  const lang = query.lang === 'zh' ? 'zh' : 'en'
  const url = base + externalSkillHref(entry.slug)
  const socialImage = entry.provider === 'skillry' ? entry.previewImages[0] : entry.runtimeDemo ? base + entry.runtimeDemo.poster : null
  return {
    title: entry.title[lang], description: entry.description[lang],
    alternates: { canonical: url }, robots: { index: Object.keys(query).length === 0 && (entry.provider !== 'skillry' || (entry.active && entry.seoIndexable)), follow: true },
    openGraph: { type: 'website', title: entry.title[lang], description: entry.description[lang], url,
      ...(socialImage ? { images: [{ url: socialImage, alt: entry.title[lang] }] } : {}) },
    twitter: { card: socialImage ? 'summary_large_image' : 'summary', title: entry.title[lang], description: entry.description[lang],
      ...(socialImage ? { images: [socialImage] } : {}) },
  }
}
export default async function CatalogSkillContent({ params, searchParams }: Props) {
  const entry = getExternalSkill((await params).slug)
  if (!entry) notFound()
  const zh = (await searchParams).lang === 'zh'
  const lang = zh ? 'zh' : 'en'
  const url = base + externalSkillHref(entry.slug)
  const demo = entry.runtimeDemo
  const skillry = entry.provider === 'skillry'
  const provider = skillry ? 'Skillry' : 'RedSkill'
  const price = skillry ? entry.listingEvidence.priceUsdCents === 0 ? (zh ? '免费' : 'Free') : new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US', { style: 'currency', currency: 'USD' }).format(entry.listingEvidence.priceUsdCents / 100) + (zh ? ' · 单次购买' : ' · one-time') : ''
  const related = skillry ? EXTERNAL_SKILLS.filter(item => item.provider === 'skillry' && item.active && item.slug !== entry.slug && item.outputType === entry.outputType).slice(0, 4) : []
  const output = skillry ? externalOutputLabels[entry.outputType][lang] : 'p5.js'
  const jsonLd = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebPage', '@id': url, url, name: entry.title[lang], description: entry.description[lang], inLanguage: lang,
        about: { '@type': 'CreativeWork', name: entry.skillName, ...(entry.version ? { version: entry.version } : {}), license: entry.licenseUrl,
          ...(skillry ? { publisher: { '@type': 'Organization', name: entry.author.name, url: entry.author.url } }
            : { author: { '@type': 'Person', name: entry.author.name, url: entry.author.url } }), url: entry.sourcePostUrl } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Skills', item: base + '/skills' },
        { '@type': 'ListItem', position: 2, name: entry.title[lang], item: url },
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
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-10" lang={lang} data-catalog-skill={entry.slug}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav aria-label={zh ? '面包屑导航' : 'Breadcrumb'} className="flex flex-wrap gap-3 text-sm text-secondary">
        <Link href={zh ? '/zh/skills' : '/skills'}>{zh ? '技能' : 'Skills'}</Link><span>/</span>
        <span>{entry.title[lang]}</span>
      </nav>
      <header className="border-b border-border py-12 sm:py-16">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#006b4f]">{provider} / {output} / {zh ? '站长收录' : 'Owner curated'}</p>
        <h1 className="mt-6 max-w-4xl text-balance font-display text-4xl leading-tight sm:text-6xl">{skillry ? entry.skillName : entry.title[lang]}</h1>
        {skillry && zh && entry.title.zh !== entry.skillName && <p className="mt-3 text-lg text-secondary">{entry.title.zh}</p>}
        <p className="mt-6 max-w-3xl text-base leading-8 text-secondary sm:text-lg">{entry.description[lang]}</p>
        <div className="mt-5 flex items-center gap-3 text-sm">{skillry && <SkillryLogo size={32} />}<p>{skillry ? (zh ? '发布平台' : 'Published on') : (zh ? '作者' : 'By')} <a href={externalSourceHref(entry.author.url)} target="_blank" rel={externalSourceRel(entry.author.url)} className="underline underline-offset-4">{entry.author.name} ↗</a></p></div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <SkillEngagementProvider slugs={[entry.slug]} untrackedSlugs={[entry.slug]}><SkillActions slug={entry.slug} name={entry.title[lang]} /></SkillEngagementProvider>
          <a href={externalSourceHref(entry.sourceUrl)} target="_blank" rel={externalSourceRel(entry.sourceUrl)} className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#006b4f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#00533d]">{skillry ? (zh ? '获取技能' : 'Get skill') : (zh ? '打开作者原帖' : 'Open the author’s post')} ↗</a>
          <p className="text-xs text-secondary">{skillry ? `${price} · ${zh ? '在 Skillry 获取' : 'Available on Skillry'}` : demo ? (zh ? '仅限非商业用途 · 附本地实测录像' : 'Noncommercial use only · Local runtime recording') : (zh ? '仅限非商业用途 · 未运行验证' : 'Noncommercial use only · Not runtime-verified')}</p>
        </div>
      </header>
      {skillry && <section id="showcase" className="scroll-mt-24 border-b border-border py-10" aria-labelledby="source-examples">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="source-examples" className="font-display text-3xl">{zh ? '案例预览' : 'Example previews'}</h2>
          <a href={externalSourceHref(entry.sourceUrl)} target="_blank" rel={externalSourceRel(entry.sourceUrl)} className="inline-flex min-h-11 items-center text-sm text-[#006b4f] underline underline-offset-4">{zh ? '在 Skillry 查看案例' : 'View examples on Skillry'} ↗</a>
        </div>
        <p className="mb-6 text-sm leading-7 text-secondary">{zh ? 'Skillry 原站公开案例，图片从原站加载。本站未执行技能，原始提示词、模型和制作耗时未核实。' : 'Public examples from Skillry, loaded from the source. We have not run the skill or verified the original prompts, model or production time.'}</p>
        {entry.previewVideo && <div className="mb-6"><ProviderVideoPreview key={entry.previewVideo} src={entry.previewVideo} poster={entry.previewImages[0]} title={entry.skillName} zh={zh} /><p className="mt-3 text-xs text-secondary">{zh ? '原站案例视频 · 点击后加载' : 'Source video example · Loads when played'}</p></div>}
        <div className="grid gap-4 sm:grid-cols-2">
          {entry.previewImages.map((src, index) => <figure key={src} className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
            <div className="relative aspect-video"><SkillPreviewImage locale={lang} src={src} alt={`${entry.title[lang]} — ${zh ? '原站案例' : 'source example'} ${index + 1}`} fill unoptimized sizes="(max-width: 639px) 100vw, 560px" className="object-contain" /></div>
            <figcaption className="px-4 py-3 text-xs text-secondary">Skillry · {zh ? '原站案例' : 'Source example'} {index + 1}</figcaption>
          </figure>)}
        </div>
      </section>}
      {demo && <section id="showcase" className="scroll-mt-24 border-b border-border py-10 sm:py-12" aria-labelledby="runtime-heading">
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
          {entry.examples.length > 0 && <section aria-labelledby="animation-types">
            <h2 id="animation-types" className="font-display text-3xl">{zh ? '三种动画，一句话定制。' : 'Three animations. Your direction.'}</h2>
            <p className="mt-3 text-sm text-secondary">{zh ? '以下为技能包的功能说明；自定义参数的效果需在自己的环境中检查。' : 'Package capabilities are described below; test custom parameters in your own environment.'}</p>
            {entry.examples.map(example => <div key={example.title.en} className="grid gap-3 border-b border-border py-7 sm:grid-cols-[140px_1fr]">
              <h3 className="font-display text-xl">{example.title[lang]}</h3><p className="text-sm leading-7 text-secondary">{example.description[lang]}</p>
            </div>)}
          </section>}
          <section className={entry.examples.length > 0 ? 'mt-10' : ''} aria-labelledby="external-use">
            <h2 id="external-use" className="font-display text-3xl">{zh ? '如何使用' : 'How to use it'}</h2>
            <p className="mt-4 text-sm leading-8 text-secondary">{entry.usage[lang]}</p>
            <p className="mt-4 text-sm leading-8 text-secondary">{entry.limitations[lang]}</p>
          </section>
          {related.length > 0 && <section className="mt-10" aria-labelledby="related-skills"><h2 id="related-skills" className="font-display text-3xl">{zh ? '相关技能' : 'Related skills'}</h2><ul className="mt-4 grid gap-3 sm:grid-cols-2">{related.map(item => <li key={item.slug}><Link prefetch={false} href={externalSkillHref(item.slug) + (zh ? '?lang=zh' : '')} className="inline-flex min-h-11 items-center text-sm text-[#006b4f] underline underline-offset-4">{item.skillName} →</Link></li>)}</ul></section>}
          <section className="mt-10 border-t border-border pt-8" aria-labelledby="external-source">
            <h2 id="external-source" className="font-display text-3xl">{zh ? '来源与版本记录' : 'Source & version record'}</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div><dt className="text-secondary">{zh ? '平台标识' : 'Platform identifier'}</dt><dd className="mt-1 break-all font-mono text-xs">{entry.identifier}</dd></div>
              {entry.version && <div><dt className="text-secondary">{zh ? '核对时版本' : 'Version when checked'}</dt><dd>{entry.version} · {skillry ? `${zh ? 'Skillry 产品页面' : 'Skillry product page'} · ${entry.versionObservedAt?.slice(0, 10)}` : 'RedSkill manifest'}</dd></div>}
              {skillry && <>
                <div><dt className="text-secondary">{zh ? '核对时价格' : 'Price when checked'}</dt><dd>{price} · {entry.listingEvidence.observedAt.slice(0, 10)} UTC</dd></div>
                <div><dt className="text-secondary">{zh ? '原站累计下载量' : 'Downloads on Skillry'}</dt><dd>{entry.listingEvidence.downloadCount} · {entry.listingEvidence.observedAt.slice(0, 10)} UTC</dd></div>
                <div><dt className="text-secondary">{zh ? '成果类型' : 'Output'}</dt><dd>{output}</dd></div>
              </>}
              {entry.bundleSha256 && <div><dt className="text-secondary">{zh ? '包校验值（不代表安全认证）' : 'Bundle checksum (not a safety certification)'}</dt><dd className="mt-1 break-all font-mono text-xs">SHA-256 {entry.bundleSha256}</dd></div>}
            </dl>
            <p className="mt-5 text-xs leading-6 text-secondary">{skillry ? (zh ? '目录每周核对下载量、价格和案例。版本只在产品页面核实后记录。本站提供原站入口，当前价格、获取条件和条款以 Skillry 为准。' : 'Downloads, prices and examples are checked weekly. Package versions are recorded only when verified on a product page. Skillry’s current pricing, access requirements and terms apply.') : (zh ? '版本为收录时快照，当前不自动同步外部平台。实测录像仅说明所列环境中的示例效果，不代表 AI 审核、安全认证或创作者身份认证。' : 'Version is a listing-time snapshot, not automatically synchronized. A runtime recording demonstrates only the examples in the stated environment, not AI review, security certification or creator-identity verification.')}</p>
            <Link href={`/api/external-skills/${entry.slug}`} className="mt-4 inline-block text-sm text-[#006b4f] underline underline-offset-4">{zh ? '查看只读元数据' : 'Read-only metadata'} →</Link>
          </section>
        </div>
        <aside className="self-start border-t-2 border-[#006b4f] pt-6 lg:sticky lg:top-24" aria-label={zh ? '使用与许可' : 'Access & license'}>
          <p className="font-mono text-xs text-secondary">{zh ? '前往原平台使用' : 'USE ON THE SOURCE PLATFORM'}</p>
          <p className="mt-3 text-xs leading-6 text-secondary">{skillry ? (zh ? '在 Skillry 产品页面获取技能包，可能需要登录。按原站说明查看文件并设置你的 Agent。' : 'Obtain the package from the Skillry product page; sign-in may be required. Review its files and configure your agent using the provider’s instructions.') : (zh ? '帖内提供 RedSkill 入口，可能需要小红书 App 或登录。' : 'Use the RedSkill entry in the post. Xiaohongshu may require its app or sign-in.')}</p>
          <div className="mt-7 border-t border-border pt-6">
            <h2 className="text-base font-semibold">{skillry ? (zh ? '原站使用条款' : 'Provider terms') : (zh ? '仅限非商业用途' : 'Noncommercial use only')}</h2>
            <a href={externalSourceHref(entry.licenseUrl)} target="_blank" rel={externalSourceRel(entry.licenseUrl)} className="mt-2 inline-block text-sm underline underline-offset-4">{skillry ? (zh ? 'Skillry 服务条款' : 'Skillry terms of service') : 'CC BY-NC 4.0'} ↗</a>
            <p className="mt-4 text-xs leading-7 text-secondary">{entry.licenseNote[lang]}</p>
          </div>
          <p className="mt-7 border-t border-border pt-5 text-xs leading-6 text-secondary">{skillry ? (zh ? '外部平台条目，不计入 GitHub Star 排行或自动安装推荐。本站介绍由我们编写，不代表原平台认证。' : 'An external platform listing, excluded from GitHub Star rankings and automatic install recommendations. Our descriptions are independently written, without provider certification.') : (zh ? '独立外部条目，不计入 GitHub Star 排行或自动安装推荐。本站不托管技能源代码或技能包。录像按站长确认的授权作非商业展示，原技能许可不变。' : 'An independent external listing, excluded from GitHub Star rankings and automatic install recommendations. We do not host the skill source or bundle. The recording is displayed noncommercially with permission confirmed by the site owner; the original skill license is unchanged.')}</p>
        </aside>
      </div>
    </main>
    <SiteFooter />
  </div>
}
