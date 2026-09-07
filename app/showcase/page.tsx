import type { Metadata } from 'next'
import { ShowcaseGallery } from '@/components/showcase-gallery'
import { I18nProvider } from '@/lib/i18n/context'
import { getLocaleFromSearchParam } from '@/lib/i18n/config'
import { filterShowcaseCases, localizeShowcase, SHOWCASE_CATEGORIES, SHOWCASE_SKILLS } from '@/lib/showcase'

const BASE_URL = 'https://www.openagentskill.com'
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const zh = getLocaleFromSearchParam(params.lang) === 'zh'
  const title = zh ? 'Skill Gallery — 技能作品集与作者 | OpenAgentSkill' : 'Skill Gallery — Agent Skills, Creative Work & Creators | OpenAgentSkill'
  const description = zh ? '查看技能制作的真实作品，复制任务，开始自己的创作。每个案例包含预览、使用条件与来源。' : 'See real work made with agent skills. Explore websites, presentations, images and videos with previews, copyable tasks, requirements and source credits.'
  return { title: { absolute: title }, description, alternates: { canonical: `${BASE_URL}/showcase` }, robots: { index: !params.q && !params.category && !params.creator && !params.lang, follow: true },
    twitter: { card: 'summary_large_image', title, description, images: [`${BASE_URL}/showcase/ppt-ppt-skill-showcase.png`] },
    openGraph: { title, description, url: `${BASE_URL}/showcase`, type: 'website', images: [{ url: `${BASE_URL}/showcase/ppt-ppt-skill-showcase.png`, width: 2400, height: 1350, alt: 'Editorial presentation examples made with Guizang PPT Skill' }] },
  }
}

export default async function ShowcasePage({ searchParams }: Props) {
  const params = await searchParams
  const locale = getLocaleFromSearchParam(params.lang) || 'en'
  const rawCategory = Array.isArray(params.category) ? params.category[0] : params.category
  const category = SHOWCASE_CATEGORIES.some((entry) => entry.id === rawCategory) ? rawCategory! : 'all'
  const query = (Array.isArray(params.q) ? params.q[0] : params.q) || ''
  const rawCreator = (Array.isArray(params.creator) ? params.creator[0] : params.creator) || ''
  const creatorId = SHOWCASE_SKILLS.some((skill) => skill.creatorId === rawCreator) ? rawCreator : ''
  const cases = filterShowcaseCases(category, query, creatorId)
  const schema = {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Skill Gallery', url: `${BASE_URL}/showcase`,
    mainEntity: { '@type': 'ItemList', numberOfItems: cases.length, itemListElement: cases.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: localizeShowcase(item.title, locale), url: `${BASE_URL}/showcase/${item.slug}` })) },
  }
  return <I18nProvider initialLocale={locale}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} /><ShowcaseGallery /></I18nProvider>
}
