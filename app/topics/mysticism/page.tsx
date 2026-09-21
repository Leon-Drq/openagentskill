import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { MarketingHero, MarketingPageShell } from '@/components/marketing-page'
import { I18nProvider } from '@/lib/i18n/context'
import { getLocaleFromSearchParam, getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { getMysticismCopy } from '@/lib/i18n/mysticism-copy'
import { MYSTICISM_GROUPS, MYSTICISM_PATH, MYSTICISM_SKILLS, mysticismSkillPath } from '@/lib/mysticism-collection'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }
const SITE = 'https://www.openagentskill.com'

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const copy = getMysticismCopy(getLocaleFromSearchParam(params.lang))
  return {
    title: `${copy.title} — Open-source Agent Skills`, description: copy.intro,
    alternates: { canonical: `${SITE}${MYSTICISM_PATH}` },
    // Query-language preferences are not separate search landing pages.
    robots: { index: !Object.values(params).some(Boolean), follow: true },
    openGraph: { title: copy.title, description: copy.intro, url: `${SITE}${MYSTICISM_PATH}`, type: 'website' },
    twitter: { card: 'summary_large_image', title: copy.title, description: copy.intro },
  }
}

export default async function MysticismPage({ searchParams }: Props) {
  const locale = getLocaleFromSearchParam((await searchParams).lang)
  const c = getMysticismCopy(locale)
  const zh = locale === 'zh'
  const href = (path: string) => getLocalizedNavigationHref(path, locale)
  const schema = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', url: `${SITE}${MYSTICISM_PATH}`, name: c.title, description: c.intro, inLanguage: locale,
      mainEntity: { '@type': 'ItemList', numberOfItems: MYSTICISM_SKILLS.length, itemListElement: MYSTICISM_SKILLS.map((skill, index) => ({ '@type': 'ListItem', position: index + 1, name: zh ? skill.nameZh : skill.name, url: `${SITE}${mysticismSkillPath(skill.repo)}` })) } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'OpenAgentSkill', item: SITE },
      { '@type': 'ListItem', position: 2, name: c.back, item: `${SITE}/skills` },
      { '@type': 'ListItem', position: 3, name: c.label, item: `${SITE}${MYSTICISM_PATH}` },
    ] },
  ]
  return <I18nProvider initialLocale={locale}><MarketingPageShell>
    <script id="mysticism-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
    <MarketingHero eyebrow={c.eyebrow} title={c.title} description={c.intro} aside={
      <nav aria-label={c.collection} className="grid grid-cols-2 gap-px overflow-hidden rounded-full border border-border bg-border p-8 aspect-square max-w-80 mx-auto lg:mr-0">
        {MYSTICISM_GROUPS.map((group, index) => <a key={group} href={`#${group}`} className="flex flex-col justify-center gap-2 bg-background p-3 text-center text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-[#006b4f] focus-visible:-outline-offset-2">
          <span className="font-display text-2xl text-[#006b4f]">{MYSTICISM_SKILLS.filter(s => s.group === group).length}</span><span>{c.groups[index]}</span>
        </a>)}
      </nav>
    } />
    <div className="mx-auto max-w-6xl px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-6 text-sm">
        <Link href={href('/skills')} className="inline-flex min-h-11 items-center gap-2 underline underline-offset-4 focus-visible:outline-2">{c.back}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        <p>{c.collection} <span className="ml-2 font-mono">{MYSTICISM_SKILLS.length}</span></p>
      </div>
      <aside className="my-8 border-l-2 border-[#006b4f] pl-5 text-sm leading-7">
        <h2 className="font-display text-2xl">{c.noticeTitle}</h2>
        <p className="mt-3 max-w-4xl text-secondary">{c.notice}</p>
        <p className="mt-3 max-w-4xl text-secondary">{c.disclosure}</p>
      </aside>
      {locale !== 'en' && !zh && <p className="mb-6 text-sm text-secondary">{c.summaries}</p>}
      {MYSTICISM_GROUPS.map((group, index) => <section key={group} id={group} aria-labelledby={`${group}-title`} className="scroll-mt-24 border-t border-border py-10 sm:py-12">
        <div className="mb-7 grid gap-3 md:grid-cols-2 md:items-end">
          <h2 id={`${group}-title`} className="font-display text-3xl sm:text-4xl">{c.groups[index]}</h2>
          <p className="max-w-lg text-sm leading-7 text-secondary">{c.groupDescriptions[index]}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {MYSTICISM_SKILLS.filter(s => s.group === group).map(skill => <article key={skill.repo} className="flex min-w-0 flex-col border border-border bg-card/40 p-6 transition-colors hover:border-[#006b4f]/50">
            <p className="font-mono text-[11px] text-secondary">Leon-Drq · MIT</p>
            <h3 lang={zh ? 'zh' : 'en'} className="mt-4 font-display text-2xl"><Link href={href(mysticismSkillPath(skill.repo))} prefetch={false} className="hover:text-[#006b4f] focus-visible:outline-2 focus-visible:outline-offset-4">{zh ? skill.nameZh : skill.name}</Link></h3>
            <p lang={zh ? 'zh' : 'en'} className="mt-3 mb-6 text-sm leading-7 text-secondary">{zh ? skill.descriptionZh : skill.description}</p>
            <div className="mt-auto border-t border-border pt-3">
              <Link href={href(mysticismSkillPath(skill.repo))} prefetch={false} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#006b4f] focus-visible:outline-2">{c.details}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              <div className="flex flex-wrap gap-x-5 text-xs text-secondary">
                <a href={`https://github.com/Leon-Drq/${skill.repo}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 underline underline-offset-4 focus-visible:outline-2">{c.source}<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></a>
                <a href={`https://www.6yao.ai${skill.demoPath}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 underline underline-offset-4 focus-visible:outline-2">{c.demo}<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></a>
              </div>
            </div>
          </article>)}
        </div>
      </section>)}
      <aside className="mb-12 border-t border-border pt-7 text-sm leading-7 text-secondary">{c.privacy}</aside>
    </div>
  </MarketingPageShell></I18nProvider>
}
