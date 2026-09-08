import type { Metadata } from 'next'
import { ShowcaseGallery } from '@/components/showcase-gallery'
import { I18nProvider } from '@/lib/i18n/context'
import { getLocaleFromSearchParam } from '@/lib/i18n/config'
import { galleryCopy } from '@/lib/i18n/gallery-copy'
import { getShowcaseNavLabel } from '@/lib/i18n/showcase-label'
import { filterShowcaseCases, getShowcasePage, localizeShowcase, SHOWCASE_CASES, SHOWCASE_CATEGORIES, SHOWCASE_SKILLS, SHOWCASE_TAGS } from '@/lib/showcase'

const BASE_URL = 'https://www.openagentskill.com'
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const locale = getLocaleFromSearchParam(params.lang) || 'en'
  const zh = locale === 'zh'
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page
  const { page } = getShowcasePage(SHOWCASE_CASES, rawPage)
  const filtered = Boolean(params.q || params.category || params.creator || params.lang || params.sort || params.tag)
  const canonical = `${BASE_URL}/showcase${!filtered && page > 1 ? `?page=${page}` : ''}`
  const pageLabel = page > 1 ? ` — ${galleryCopy(locale, 'Page {page}', '第 {page} 页', { page })}` : ''
  const title = zh ? `Skill Gallery — 技能作品集与作者${pageLabel} | OpenAgentSkill` : locale === 'en' ? `Skill Gallery — Agent Skills, Creative Work & Creators${pageLabel} | OpenAgentSkill` : `Skill Gallery — ${getShowcaseNavLabel(locale)}${pageLabel} | OpenAgentSkill`
  const description = zh ? '探索 100 个精选技能作品、作者模板与风格示例，覆盖网页、演示、图像、视频和文档。每个案例包含预览、使用条件与来源。' : locale === 'en' ? 'Explore 100 curated skill examples, author templates and style studies across web, slides, images, video and documents, with tasks, requirements and source credits.' : galleryCopy(locale, 'Discover the work, meet its creators, and make something of your own.', '')
  return { title: { absolute: title }, description, alternates: { canonical }, robots: { index: !filtered && (!rawPage || rawPage === String(page)), follow: true },
    twitter: { card: 'summary_large_image', title, description, images: [`${BASE_URL}/showcase/ppt-ppt-skill-showcase.png`] },
    openGraph: { title, description, url: canonical, type: 'website', images: [{ url: `${BASE_URL}/showcase/ppt-ppt-skill-showcase.png`, width: 2400, height: 1350, alt: 'Editorial presentation examples made with Guizang PPT Skill' }] },
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
  const rawTag = Array.isArray(params.tag) ? params.tag[0] : params.tag
  const tagId = SHOWCASE_TAGS.find((tag) => tag.id === rawTag)?.id || ''
  const cases = filterShowcaseCases(category, query, creatorId, tagId)
  const pagination = getShowcasePage(cases, Array.isArray(params.page) ? params.page[0] : params.page)
  const schema = {
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Skill Gallery', inLanguage: locale, url: `${BASE_URL}/showcase`,
    mainEntity: { '@type': 'ItemList', numberOfItems: cases.length, itemListOrder: 'https://schema.org/ItemListUnordered', itemListElement: pagination.items.map((item, index) => ({ '@type': 'ListItem', position: pagination.offset + index + 1, name: localizeShowcase(item.title, locale), url: `${BASE_URL}/showcase/${item.slug}` })) },
  }
  return <I18nProvider initialLocale={locale}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} /><ShowcaseGallery /></I18nProvider>
}
