'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Copy } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { ShowcaseCard } from '@/components/showcase-card'
import { ShowcaseCreatorCredit } from '@/components/showcase-creator'
import { useI18n } from '@/lib/i18n/context'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { copyText } from '@/lib/copy-text'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { getShowcaseAccessLabel, getShowcaseCreator, getShowcaseHandoff, getShowcaseImageSrc, getShowcaseSkill, localizeShowcase, SHOWCASE_CASES, SHOWCASE_CATEGORIES, type ShowcaseCase } from '@/lib/showcase'

export function ShowcaseDetail({ item }: { item: ShowcaseCase }) {
  const { locale } = useI18n()
  const zh = locale === 'zh'
  const [activeMedia, setActiveMedia] = useState(0)
  const [copied, setCopied] = useState<'task' | 'handoff' | null>(null)
  const [copyError, setCopyError] = useState(false)
  const [started, setStarted] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const viewed = useRef(false)
  const handoffRef = useRef<HTMLDivElement>(null)
  const media = item.media[activeMedia]
  const skill = getShowcaseSkill(item.skillSlug)
  const artworkCreator = getShowcaseCreator(item.creatorId)
  const title = localizeShowcase(item.title, locale)
  const category = SHOWCASE_CATEGORIES.find((entry) => entry.id === item.category)!
  const task = localizeShowcase(item.prompt, locale)
  const handoff = getShowcaseHandoff(item, locale)
  const related = [...SHOWCASE_CASES].filter((entry) => entry.slug !== item.slug).sort((a, b) => Number(b.category === item.category) - Number(a.category === item.category)).slice(0, 3)

  useEffect(() => {
    if (viewed.current) return
    viewed.current = true
    trackAnalyticsEvent('showcase_view', { case_slug: item.slug, skill_slug: item.skillSlug, placement: 'case' })
  }, [item.slug, item.skillSlug])

  useEffect(() => {
    if (!started) return
    handoffRef.current?.focus({ preventScroll: true })
    handoffRef.current?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
  }, [started])

  async function copy(kind: 'task' | 'handoff') {
    try {
      const success = await copyText(kind === 'task' ? task : handoff)
      if (!success) throw new Error('Copy unavailable')
      setCopied(kind)
      setCopyError(false)
      trackAnalyticsEvent(kind === 'task' ? 'showcase_task_copy' : 'showcase_handoff_copy', { case_slug: item.slug, skill_slug: item.skillSlug, prompt_kind: item.promptKind })
    } catch {
      setCopied(null)
      setCopyError(true)
    }
  }

  function start() {
    setStarted(true)
    trackAnalyticsEvent('showcase_start', { case_slug: item.slug, skill_slug: item.skillSlug })
  }

  return (
    <div className="min-h-screen bg-[#fbfaf6] text-[#1d1b18]">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-8 md:pt-10">
        <nav aria-label={zh ? '面包屑导航' : 'Breadcrumb'} className="flex flex-wrap items-center gap-2 text-xs text-[#6d675e]">
          <Link href={getLocalizedNavigationHref('/showcase', locale)} className="inline-flex min-h-8 items-center gap-2 hover:text-[#006b4f]"><ArrowLeft className="h-3 w-3" aria-hidden="true" />{zh ? '全部作品' : 'All work'}</Link><span aria-hidden="true">/</span><span>{localizeShowcase(category.label, locale)}</span>
        </nav>
        <div className="mb-8 mt-5 md:mb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#006b4f]">{skill.name} <span className="mx-2 text-[#bdb7ac]">/</span>{item.provenance === 'platform' ? (zh ? '本站制作' : 'Made at OpenAgentSkill') : (zh ? '作者公开案例' : 'From the author’s showcase')}</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-normal leading-[1.1] tracking-tight md:text-6xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#6d675e]">{localizeShowcase(item.description, locale)}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
            <ShowcaseCreatorCredit creatorId={skill.creatorId} label={item.creatorId === skill.creatorId ? (zh ? '作品与技能作者' : 'Work & skill by') : (zh ? '技能作者' : 'Skill by')} />
            {item.creatorId !== skill.creatorId && <ShowcaseCreatorCredit creatorId={item.creatorId} label={zh ? '作品作者' : 'Work by'} />}
            <Link href={getLocalizedNavigationHref(`/skills/${item.skillSlug}`, locale)} className="inline-flex items-center gap-1.5 rounded border border-[#e4e0d8] px-3 py-2 text-xs text-[#006b4f]">{getShowcaseAccessLabel(skill, locale)} · {skill.sourceLicense}<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></Link>
          </div>
          <a href="#make-your-own" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-[#006b4f] px-4 text-sm font-semibold text-white hover:bg-[#005640] lg:hidden">
            {zh ? '复制任务并开始使用' : 'Copy task & get started'}<ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-10">
          <div className="min-w-0">
            <figure>
              <div className="overflow-hidden rounded-lg border border-[#e4e0d8] bg-[#eeece5]">
                {item.videoUrl ? <>
                  <video controls playsInline preload="none" poster={getShowcaseImageSrc(media.src, 'preview')} className="aspect-video w-full bg-[#1d1b18]" aria-label={title}
                    onError={() => setVideoError(true)} onPlay={() => trackAnalyticsEvent('showcase_media_play', { case_slug: item.slug, skill_slug: item.skillSlug })}>
                    <source src={item.videoUrl} type="video/mp4" />
                    <a href={item.videoUrl}>{zh ? '打开视频' : 'Open video'}</a>
                  </video>
                  {videoError && <p role="status" className="p-4 text-sm">{zh ? '视频暂时无法加载。可通过下方链接打开原视频。' : 'The video could not load. Use the link below to open the original.'}</p>}
                </> : <div className={`${item.category === 'web' && media.height > media.width ? 'max-h-[700px] overflow-y-auto' : 'p-3 sm:p-5'}`} tabIndex={item.category === 'web' && media.height > media.width ? 0 : undefined} role={item.category === 'web' && media.height > media.width ? 'region' : undefined} aria-label={item.category === 'web' && media.height > media.width ? (zh ? '可滚动的完整网页预览' : 'Scrollable full website preview') : undefined}>
                  <Image key={media.src} src={getShowcaseImageSrc(media.src, 'preview')} alt={localizeShowcase(media.alt, locale)} width={media.width} height={media.height}
                    sizes="(max-width: 1023px) 100vw, 680px" preload
                    className={`h-auto w-full ${item.cardFit === 'contain' ? 'max-h-[690px] object-contain' : ''}`} />
                </div>}
              </div>
              {item.media.length > 1 && <div className="mt-3 flex gap-3" aria-label={zh ? '选择预览图片' : 'Choose preview image'}>
                {item.media.map((entry, index) => <button key={entry.src} type="button" aria-pressed={activeMedia === index} onClick={() => setActiveMedia(index)} className={`relative h-16 w-24 overflow-hidden rounded-md border-2 ${activeMedia === index ? 'border-[#006b4f]' : 'border-transparent hover:border-[#bdb7ac]'}`} aria-label={zh ? `预览图片 ${index + 1}` : `Preview image ${index + 1}`}>
                  <Image src={getShowcaseImageSrc(entry.src, 'card')} alt="" fill sizes="96px" className="object-cover object-top" />
                </button>)}
              </div>}
              <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs leading-relaxed text-[#6d675e]">
                <span>{artworkCreator.name} · {item.provenance === 'platform' ? (zh ? '原创制作' : 'Original work') : (zh ? '作者示例' : 'Author example')}</span>
                <a href={item.videoUrl || media.src} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 hover:text-[#006b4f]">{item.videoUrl ? (zh ? '打开原视频' : 'Open original video') : (zh ? '查看原图' : 'View full image')}<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></a>
              </figcaption>
            </figure>

            <section className="mt-7 border-t border-[#e4e0d8] pt-6" aria-labelledby="case-notes-title">
              <h2 id="case-notes-title" className="font-display text-2xl font-normal">{zh ? '这个案例包含什么' : 'Inside this example'}</h2>
              <dl className="mt-5 divide-y divide-[#e4e0d8]">
                {[
                  [zh ? '输入材料' : 'The starting point', localizeShowcase(item.input, locale)],
                  [zh ? '交付格式' : 'The result', localizeShowcase(item.output, locale)],
                  [zh ? '使用条件' : 'What you’ll need', localizeShowcase(item.requirements, locale)],
                ].map(([label, text]) => <div key={label} className="grid gap-2 py-4 sm:grid-cols-[130px_1fr]"><dt className="text-xs font-semibold text-[#1d1b18]">{label}</dt><dd className="text-sm leading-relaxed text-[#6d675e]">{text}</dd></div>)}
              </dl>
            </section>
            <details className="mt-5 rounded-lg border border-[#e4e0d8] bg-white/50 px-5 py-4">
              <summary className="cursor-pointer text-sm font-semibold">{zh ? '案例来源与制作记录' : 'Source & production notes'}</summary>
              <p className="mt-4 text-sm leading-relaxed text-[#6d675e]">{localizeShowcase(item.productionNote, locale)}</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-xs text-[#006b4f]">
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">{zh ? '查看来源' : 'View source'}<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></a>
                <a href={item.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{item.license}</a>
              </div>
              <p className="mt-4 font-mono text-[10px] text-[#6d675e]">{zh ? '收录于' : 'Curated'} {item.updatedAt} · {zh ? '来源版本' : 'Source ref'} {item.sourceRevision.slice(0, 7)}</p>
            </details>
          </div>

          <aside id="make-your-own" className="min-w-0 scroll-mt-24 lg:sticky lg:top-24" aria-label={zh ? '开始制作' : 'Make your own'}>
            <div className="rounded-lg border border-[#e4e0d8] bg-white p-5 sm:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#006b4f]">{zh ? '从这里开始' : 'Your starting point'}</p>
              <h2 className="mt-3 font-display text-3xl font-normal">{zh ? '做出你的版本。' : 'Make it yours.'}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#6d675e]">{zh ? '复制任务，替换自己的主题与素材，再交给你的 Agent。' : 'Copy the task, add your own subject and assets, then hand it to your agent.'}</p>
              <div className="mb-2 mt-6 flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold">{zh ? '01 / 复制任务' : '01 / Copy the task'}</h3>
                <span className="rounded bg-[#f2f0e9] px-2 py-1 text-[10px] text-[#6d675e]">{item.promptKind === 'original' ? (zh ? '实际使用原文' : 'Original prompt') : (zh ? '建议任务' : 'Suggested task')}</span>
              </div>
              <textarea readOnly value={task} aria-label={zh ? '可复制的任务文本' : 'Task to copy'} className="min-h-48 w-full resize-y rounded-md border border-[#e4e0d8] bg-[#fbfaf6] p-4 font-mono text-xs leading-relaxed text-[#4e4942] outline-offset-2 focus-visible:outline-[#006b4f]" />
              {item.promptKind === 'suggested' && <p className="mt-2 text-[11px] leading-relaxed text-[#6d675e]">{zh ? '根据案例整理的尝试任务，并非作者公开的原始提示词；生成结果会有所不同。' : 'A task adapted from this example, not the author’s original prompt. Your result will vary.'}</p>}
              <button type="button" onClick={() => copy('task')} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-[#d8d2c6] px-4 text-sm font-semibold transition-colors hover:border-[#006b4f] hover:text-[#006b4f]">{copied === 'task' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}{copied === 'task' ? (zh ? '任务已复制' : 'Task copied') : (zh ? '复制任务' : 'Copy task')}</button>
              <div className="mt-6 border-t border-[#e4e0d8] pt-5">
                <h3 className="text-xs font-semibold">{zh ? '02 / 开始使用' : '02 / Start using the skill'}</h3>
                <Link href={getLocalizedNavigationHref(`/skills/${item.skillSlug}`, locale)} className="mt-3 inline-flex items-center gap-1 text-sm text-[#006b4f]">{skill.name}<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></Link>
                <button type="button" onClick={start} aria-expanded={started} aria-controls="showcase-handoff" className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#006b4f] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#005640]">{zh ? '开始使用' : 'Start using'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
                <p className="mt-3 text-[11px] leading-relaxed text-[#6d675e]">{zh ? '在你自己的 Agent 中运行；下一步提供配置与任务指引。' : 'Runs in your own agent. Get setup instructions and the task in the next step.'}</p>
              </div>
              <div role="status" aria-live="polite" className="mt-2 text-xs leading-relaxed text-[#006b4f]">{copyError ? (zh ? '自动复制失败，请选中上方文本手动复制。' : 'Automatic copy failed. Select the text above and copy it manually.') : copied ? (zh ? '已复制到剪贴板。' : 'Copied to clipboard.') : ''}</div>
            </div>
            {started && <div id="showcase-handoff" ref={handoffRef} tabIndex={-1} className="mt-4 scroll-mt-24 rounded-lg border border-[#006b4f]/30 bg-[#edf3ee] p-5 outline-offset-2 focus-visible:outline-[#006b4f]">
              <h3 className="text-sm font-semibold">{zh ? '交给你的 Agent' : 'Hand it to your agent'}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#6d675e]">{zh ? '打开你使用的 Agent，将下面的完整文本粘贴到新对话。它包含技能来源、配置要求和任务。' : 'Open your agent and paste the complete text below into a new conversation. It includes the skill source, setup requirements and your task.'}</p>
              <textarea readOnly value={handoff} aria-label={zh ? '配置与任务完整文本' : 'Complete setup and task'} className="mt-3 min-h-36 w-full resize-y rounded-md border border-[#ccd8ce] bg-white p-3 font-mono text-[11px] leading-relaxed" />
              <button type="button" onClick={() => copy('handoff')} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#006b4f] px-3 text-sm font-semibold text-white hover:bg-[#005640]">{copied === 'handoff' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}{copied === 'handoff' ? (zh ? '完整文本已复制' : 'Setup & task copied') : (zh ? '复制配置与任务' : 'Copy setup + task')}</button>
              <Link href={getLocalizedNavigationHref(`/skills/${item.skillSlug}#install-options`, locale)} className="mt-4 inline-flex items-center gap-1 text-xs text-[#006b4f] underline underline-offset-4">{zh ? '查看技能与安装选项' : 'View skill & installation options'}<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></Link>
            </div>}
          </aside>
        </div>

        <section className="mt-16 border-t border-[#e4e0d8] pt-10" aria-labelledby="more-work-title">
          <div className="flex flex-wrap items-center justify-between gap-4"><h2 id="more-work-title" className="font-display text-3xl font-normal">{zh ? '继续找灵感' : 'Keep exploring.'}</h2><Link href={getLocalizedNavigationHref('/showcase', locale)} className="inline-flex items-center gap-2 text-sm font-semibold text-[#006b4f]">{zh ? '全部作品' : 'All work'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
          <div className="mt-7 grid gap-7 sm:grid-cols-3">{related.map((entry) => <ShowcaseCard key={entry.slug} item={entry} placement="related" />)}</div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
