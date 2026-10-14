import Link from '@/components/crawl-link'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { SkillActionLink } from './skill-action-link'
import { SkillActions, SkillEngagementProvider } from './skill-engagement'
import { ProviderVideoPreview } from './provider-video-preview'
import { externalSkillHref, type ExternalSkill } from '@/lib/skills/external-catalog'

export function ScenarioSkillContent({ entry, zh }: { entry: Extract<ExternalSkill, { provider: 'scenario' }>; zh: boolean }) {
  const lang = zh ? 'zh' : 'en'
  const base = 'https://www.openagentskill.com'
  const url = base + externalSkillHref(entry.slug)
  const demo = entry.sourceDemo
  const jsonLd = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebPage', '@id': url, url, name: entry.title[lang], description: entry.description[lang], inLanguage: lang,
        about: { '@type': 'CreativeWork', name: entry.skillName, url: entry.sourceUrl,
          publisher: { '@type': 'Organization', name: entry.author.name, url: entry.author.url } } },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Skills', item: base + '/skills' },
        { '@type': 'ListItem', position: 2, name: entry.skillName, item: url },
      ] },
    ],
  }
  const features = zh ? [
    ['剪辑与字幕', '根据转写整理停顿与重说，校对词级字幕，保留讲话节奏。'],
    ['人物与文字', '用本地 Apple Vision 分离人物，制作人物背后大字、镜头推拉和动态图形。'],
    ['声音与场景', '通过 Scenario MCP 生成音效、配乐或替换背景，再合成为视频。云端步骤另行计费。'],
  ] : [
    ['Cuts & captions', 'Use transcription to tighten pauses and retakes, then review word-level captions and pacing.'],
    ['Speaker & typography', 'Separate the speaker with local Apple Vision for type behind the head, camera moves and motion graphics.'],
    ['Sound & setting', 'Generate sound, music or a new background through Scenario MCP, then composite the result. Cloud generation is billed separately.'],
  ]
  return <div className="min-h-screen bg-background text-foreground">
    <SiteHeader />
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6" lang={lang} data-catalog-skill={entry.slug}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <nav aria-label={zh ? '面包屑导航' : 'Breadcrumb'} className="flex flex-wrap gap-3 text-sm text-secondary">
        <Link href={zh ? '/zh/skills' : '/skills'} className="underline underline-offset-4">{zh ? '技能' : 'Skills'}</Link><span>/</span><span>{entry.skillName}</span>
      </nav>
      <header className="border-b border-border py-10 sm:py-14">
        <p className="font-mono text-xs tracking-widest text-[var(--brand)]">SCENARIO / {zh ? '视频剪辑' : 'VIDEO EDITING'}</p>
        <h1 className="mt-5 font-display text-4xl leading-tight sm:text-5xl">{entry.title[lang]}</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-secondary sm:text-lg">{entry.description[lang]}</p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <SkillActionLink skillSlug={entry.slug} metadata={{ source: 'external-catalog' }} eventType="outbound_docs" href={entry.downloadUrl} external className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--brand)]">{zh ? '获取官方 Skill · ZIP' : 'Get official Skill · ZIP'} ↗</SkillActionLink>
          <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">{zh ? '查看 Scenario 原站' : 'View on Scenario'} ↗</a>
          <SkillEngagementProvider slugs={[entry.slug]} untrackedSlugs={[entry.slug]}><SkillActions slug={entry.slug} name={entry.title[lang]} /></SkillEngagementProvider>
        </div>
        <p className="mt-4 text-sm leading-7 text-secondary">{zh ? '技能包免费下载 · 云端生成另计费 · Apple Silicon Mac · Claude Code + Scenario MCP' : 'Free Skill download · Paid cloud generation · Apple Silicon Mac · Claude Code + Scenario MCP'}</p>
      </header>
      <section id="showcase" aria-labelledby="source-demo" className="scroll-mt-24 border-b border-border py-10">
        <h2 id="source-demo" className="font-display text-3xl">{zh ? '从口播到成片' : 'From take to finished edit'}</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-secondary">{zh ? 'Scenario 官方案例：一段约 16 秒的自拍口播，制作成约 13 秒的竖屏视频。下方原片已按成片切点对齐。样片从官方源站加载，点击后播放；不是本站运行结果。' : 'Scenario’s example turns a roughly 16-second selfie into a 13-second vertical edit. The raw comparison below is already cut to match the edit. These official source videos load on play; they are not OpenAgentSkill runtime results.'}</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {[
            { src: demo.rawVideo, poster: demo.rawPoster, title: zh ? '原片对照 · 已对齐剪切' : 'Raw comparison · Cuts aligned' },
            { src: demo.video, poster: demo.poster, title: zh ? 'AI 剪辑成片' : 'AI edited result' },
          ].map(item => <figure key={item.src} className="min-w-0">
            <ProviderVideoPreview src={item.src} poster={item.poster} title={item.title} zh={zh} aspect="portrait" />
            <figcaption className="mt-3 text-sm text-secondary">{item.title} · Scenario</figcaption>
          </figure>)}
        </div>
        <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center text-sm text-[var(--brand)] underline underline-offset-4">{zh ? '到官方页面查看同步对比与分镜拆解' : 'See the synchronized comparison and breakdown on Scenario'} ↗</a>
      </section>
      <section className="grid gap-6 border-b border-border py-10 md:grid-cols-3" aria-label={zh ? '工作流能力' : 'Workflow capabilities'}>
        {features.map(([title, body]) => <div key={title}><h2 className="text-lg font-semibold">{title}</h2><p className="mt-3 text-sm leading-7 text-secondary">{body}</p></div>)}
      </section>
      <section id="install-options" className="scroll-mt-24 border-b border-border py-10">
        <h2 className="font-display text-3xl">{zh ? '使用方式与运行条件' : 'Setup & requirements'}</h2>
        <p className="mt-5 max-w-3xl break-words text-base leading-8">{entry.usage[lang]}</p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-secondary">{entry.limitations[lang]}</p>
        <a href="https://mcp.scenario.com/" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center text-sm text-[var(--brand)] underline underline-offset-4">{zh ? 'Scenario MCP 连接说明' : 'Scenario MCP setup'} ↗</a>
      </section>
      <section className="py-10" aria-labelledby="source-record">
        <h2 id="source-record" className="font-display text-3xl">{zh ? '来源与收录记录' : 'Source & listing record'}</h2>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-secondary">{entry.licenseNote[lang]}</p>
        <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
          <div><dt className="text-secondary">{zh ? '发布者' : 'Publisher'}</dt><dd className="mt-2">Scenario</dd></div>
          <div><dt className="text-secondary">{zh ? '版本核查' : 'Version observation'}</dt><dd className="mt-2">2026-10-14 · {zh ? '官方未标注版本号' : 'No upstream version declared'}</dd></div>
          <div><dt className="text-secondary">{zh ? '收录状态' : 'Listing status'}</dt><dd className="mt-2">{zh ? '站长收录 · 未完成运行验证' : 'Owner curated · Not runtime-verified'}</dd></div>
          <div className="min-w-0"><dt className="text-secondary">{zh ? '核查时的 ZIP SHA-256' : 'Inspected ZIP SHA-256'}</dt><dd className="mt-2 break-all font-mono text-xs leading-6">{entry.bundleSha256}</dd></div>
        </dl>
      </section>
    </main>
    <SiteFooter />
  </div>
}
