import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { ExternalSkillResults } from '@/components/external-skills'

type Props = { searchParams: Promise<{ q?: string | string[]; lang?: string | string[] }> }
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const zh = params.lang === 'zh'
  return {
    title: zh ? '外部平台 Agent Skills' : 'External platform Agent Skills',
    description: zh ? '发现外部平台的创意技能，了解作者、用途和许可限制，并前往原平台使用。' : 'Discover creative skills from external platforms with author attribution, license restrictions and links to their original sources.',
    alternates: { canonical: 'https://www.openagentskill.com/skills/external' },
    robots: { index: !params.q && !params.lang, follow: true },
  }
}
export default async function ExternalSkillsPage({ searchParams }: Props) {
  const params = await searchParams
  const zh = params.lang === 'zh'
  const q = (Array.isArray(params.q) ? params.q[0] : params.q) || ''
  return <div className="min-h-screen bg-background text-foreground">
    <SiteHeader />
    <main className="mx-auto max-w-6xl px-6 py-12" lang={zh ? 'zh' : 'en'}>
      <Link href={zh ? '/zh/skills' : '/skills'} className="text-sm text-secondary underline underline-offset-4">← {zh ? '技能目录' : 'Skills directory'}</Link>
      <p className="mt-10 font-mono text-xs tracking-widest text-[#006b4f]">OPENAGENTSKILL / EXTERNAL</p>
      <h1 className="mt-4 font-display text-4xl sm:text-6xl">{zh ? '外部平台技能' : 'External Skills'}</h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-secondary">{zh ? '发现创作者在其他平台发布的技能。我们提供用途说明与原帖入口，不镜像分发技能包，不代表安全认证或商业授权。' : 'Discover skills published by creators on other platforms. We provide context and source links, not mirrored packages, security certification or commercial permission.'}</p>
      <form action="/skills/external" role="search" className="mt-7 flex max-w-xl gap-2 border border-border bg-card p-2">
        {zh && <input type="hidden" name="lang" value="zh" />}
        <input type="search" name="q" defaultValue={q} maxLength={200} aria-label={zh ? '搜索外部技能' : 'Search external skills'} className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm" />
        <button className="bg-[#006b4f] px-5 py-3 text-sm font-semibold text-white">{zh ? '搜索' : 'Search'}</button>
      </form>
      <ExternalSkillResults query={q} locale={zh ? 'zh' : 'en'} />
    </main>
    <SiteFooter />
  </div>
}
