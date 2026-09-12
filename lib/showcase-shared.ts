// Small presentation helpers only. The complete catalogue stays server-side.
import featuredCreators from './featured-creators.json' with { type: 'json' }
// @ts-expect-error Direct Node regression tests require the TypeScript extension.
import { galleryCopy, localizeEditorialText } from './i18n/gallery-copy.ts'

export type ShowcaseCategory = 'web' | 'slides' | 'image' | 'video' | 'document'
export type ShowcaseText = { en: string; zh: string }
export const showcaseText = (en: string, zh: string): ShowcaseText => ({ en, zh })
export const localizeShowcase = localizeEditorialText
export const getShowcaseImageSrc = (src: string, kind: 'card' | 'preview') => src.replace(/\.[^.]+$/, `.${kind}.webp`)
export const SHOWCASE_UPDATED_AT = '2026-09-11'
export const ORIGINAL_SHOWCASE_UPDATED_AT = '2026-09-08'

export const SHOWCASE_CATEGORIES: { id: ShowcaseCategory; label: ShowcaseText }[] = [
  { id: 'web', label: showcaseText('Web & UI', '网页与界面') },
  { id: 'slides', label: showcaseText('Slides', '演示文稿') },
  { id: 'image', label: showcaseText('Images', '图像与设计') },
  { id: 'video', label: showcaseText('Video', '视频与动画') },
  { id: 'document', label: showcaseText('Documents', '文档与指南') },
]

// Uses cross media categories: a logo can be a still mascot or a motion ident.
export const SHOWCASE_TAGS = [
  { id: 'logo', label: showcaseText('Logo & identity', 'Logo 与品牌标识'), aliases: 'logo mascot brand identity 标志 标识 吉祥物 品牌' },
  { id: 'product-demo', label: showcaseText('Product promotion', '产品宣传'), aliases: 'product demo launch promotion 产品 演示 发布 宣传' },
  { id: 'explainer', label: showcaseText('Educational explainers', '知识讲解'), aliases: 'educational explainer teaching 知识 讲解 科普' },
  { id: 'data-story', label: showcaseText('Data storytelling', '数据讲述'), aliases: 'data chart report storytelling 数据 图表 报告' },
] as const
export type ShowcaseTag = typeof SHOWCASE_TAGS[number]['id']
const SHOWCASE_CASE_TAGS: Partial<Record<string, ShowcaseTag[]>> = {
  'ip-mascot-directions': ['logo'],
  'motion-logo-outro': ['logo'],
  'motion-bold-signal': ['product-demo'],
  'motion-takram-organic': ['product-demo'],
  'football-collage-explainer': ['explainer'],
  'money-collage-explainer': ['explainer'],
  'silicon-valley-explainer': ['explainer'],
  'motion-decision-tree': ['explainer'],
  'motion-data-chart-nyt': ['data-story'],
  'motion-nyt-graph': ['data-story'],
  'motion-pentagram-stat': ['data-story'],
  'motion-play-mode': ['data-story'],
}
export const getShowcaseTags = (item: { slug: string }) => SHOWCASE_TAGS.filter((tag) => SHOWCASE_CASE_TAGS[item.slug]?.includes(tag.id))

export interface ShowcaseCreator {
  /** Stable curation identity; never infer a seller account from a display name. */
  id: string
  name: string
  githubUsername: string | null
  url: string
  /** Bind only after matching the existing profile and ownership verification. */
  profile: { id: string; username: string } | null
}

export interface ShowcaseSkill {
  /** Foreign key to the existing skill registry's canonical slug. */
  slug: string
  name: string
  creatorId: string
  access: 'open-source' | 'free' | 'paid' | 'freemium'
  sourceLicense: string
  /** Future commercial editions/offers belong to listings, not to artwork. */
  listingIds: string[]
}

export const SHOWCASE_CREATORS: ShowcaseCreator[] = [
  { id: 'liamgvchi', name: 'LiamGvchi', githubUsername: 'LiamGvchi', url: 'https://github.com/LiamGvchi', profile: null },
  { id: 'yanliudesign', name: 'yanliudesign', githubUsername: 'yanliudesign', url: 'https://github.com/yanliudesign', profile: null },
  { id: 'leonxlnx', name: 'Leonxlnx', githubUsername: 'Leonxlnx', url: 'https://github.com/Leonxlnx', profile: null },
  { id: 'alisa0808', name: 'alisa0808', githubUsername: 'alisa0808', url: 'https://github.com/alisa0808', profile: null },
  { id: 'op7418', name: 'op7418', githubUsername: 'op7418', url: 'https://github.com/op7418', profile: null },
  { id: 'nexu-io', name: 'nexu-io', githubUsername: 'nexu-io', url: 'https://github.com/nexu-io', profile: null },
  { id: 'openagentskill', name: 'OpenAgentSkill', githubUsername: null, url: 'https://www.openagentskill.com', profile: null },
  { id: 'jimliu', name: 'Jim Liu / 宝玉', githubUsername: 'JimLiu', url: 'https://github.com/JimLiu', profile: null },
  { id: 'zarazhangrui', name: 'Zara Zhang', githubUsername: 'zarazhangrui', url: 'https://github.com/zarazhangrui', profile: null },
  { id: 'alchaincyf', name: '花叔 / alchaincyf', githubUsername: 'alchaincyf', url: 'https://github.com/alchaincyf', profile: null },
  { id: 's1dashu', name: 's1dashu', githubUsername: 's1dashu', url: 'https://github.com/s1dashu', profile: null },
  { id: 'heygen-com', name: 'Hyperframes / heygen-com', githubUsername: 'heygen-com', url: 'https://github.com/heygen-com', profile: null },
]

export const SHOWCASE_SKILLS: ShowcaseSkill[] = [
  { slug: 'liamgvchi-gc-minimal-zine-poster-v0-3', name: 'GC Minimal Zine Poster', creatorId: 'liamgvchi', access: 'open-source', sourceLicense: 'MIT', listingIds: [] },
  { slug: 'yanliudesign-mono-color-skill', name: 'mono-color', creatorId: 'yanliudesign', access: 'open-source', sourceLicense: 'MIT', listingIds: [] },
  { slug: 'design-taste-frontend', name: 'Taste Skill', creatorId: 'leonxlnx', access: 'open-source', sourceLicense: 'MIT', listingIds: [] },
  { slug: 'op7418-guizang-ppt-skill', name: 'Guizang PPT Skill', creatorId: 'op7418', access: 'open-source', sourceLicense: 'AGPL-3.0', listingIds: [] },
  { slug: 'vox-director', name: 'Vox Director', creatorId: 'alisa0808', access: 'open-source', sourceLicense: 'MIT', listingIds: [] },
  { slug: 'nexu-io-open-design', name: 'Open Design', creatorId: 'nexu-io', access: 'open-source', sourceLicense: 'Apache-2.0', listingIds: [] },
  ...['infographic', 'comic', 'cover-image', 'article-illustrator', 'xhs-images', 'slide-deck'].map((name): ShowcaseSkill => ({
    slug: `jimliu-baoyu-skills-baoyu-${name}`, name: `baoyu-${name}`, creatorId: 'jimliu', access: 'open-source', sourceLicense: 'MIT', listingIds: [],
  })),
  { slug: 'zarazhangrui-frontend-slides', name: 'Frontend Slides', creatorId: 'zarazhangrui', access: 'open-source', sourceLicense: 'MIT', listingIds: [] },
  { slug: 'alchaincyf-huashu-design-1d891f8f', name: 'Huashu Design', creatorId: 'alchaincyf', access: 'open-source', sourceLicense: 'MIT', listingIds: [] },
  { slug: 's1dashu-ip-as-logo-skill', name: 'ip-as-logo', creatorId: 's1dashu', access: 'open-source', sourceLicense: 'MIT', listingIds: [] },
]

export function getShowcaseCreator(id: string) {
  const creator = SHOWCASE_CREATORS.find((entry) => entry.id === id)
  if (!creator) throw new Error(`Unknown showcase creator: ${id}`)
  return creator
}

export function getShowcaseSkill(slug: string) {
  const skill = SHOWCASE_SKILLS.find((entry) => entry.slug === slug)
  if (!skill) throw new Error(`Unknown showcase skill: ${slug}`)
  return skill
}

export function getShowcaseCreatorHref(creator: ShowcaseCreator) {
  if (creator.profile) return `/creators/${encodeURIComponent(creator.profile.username)}`
  // A curated GitHub attribution page is not a registered seller identity.
  const featured = featuredCreators.find(entry => entry.owner.toLowerCase() === creator.githubUsername?.toLowerCase())
  return featured ? `/creators/github/${featured.owner.toLowerCase()}` : creator.url
}

export function getShowcaseAccessLabel(skill: ShowcaseSkill, locale: string) {
  const labels = {
    'open-source': { en: 'Open source', zh: '开源技能' },
    free: { en: 'Free', zh: '免费技能' },
    paid: { en: 'Paid', zh: '付费技能' },
    freemium: { en: 'Free + paid', zh: '免费 / 付费版' },
  }
  return localizeShowcase(labels[skill.access], locale)
}

export interface ShowcaseCase {
  slug: string
  skillSlug: string
  category: ShowcaseCategory
  title: ShowcaseText
  description: ShowcaseText
  input: ShowcaseText
  output: ShowcaseText
  requirements: ShowcaseText
  prompt: ShowcaseText
  promptKind: 'original' | 'suggested'
  provenance: 'platform' | 'author'
  /** Template and style references are not completed customer projects. */
  evidenceKind?: 'work' | 'template' | 'style-study'
  /** Creator of this particular artwork; may differ from the skill's author. */
  creatorId: string
  sourceUrl: string
  sourceRevision: string
  /** Displayed artwork license, independent from the skill source license. */
  license: string
  licenseUrl: string
  productionNote: ShowcaseText
  media: { src: string; width: number; height: number; alt: ShowcaseText }[]
  videoUrl?: string
  cardFit?: 'cover' | 'contain'
  updatedAt: string
}

export type ShowcaseCardData = Pick<ShowcaseCase, 'slug' | 'skillSlug' | 'category' | 'title' | 'description' | 'provenance' | 'evidenceKind' | 'media' | 'videoUrl' | 'cardFit'>

export function getShowcaseCardData(item: ShowcaseCase): ShowcaseCardData {
  const { slug, skillSlug, category, title, description, provenance, evidenceKind, videoUrl, cardFit } = item
  return { slug, skillSlug, category, title, description, provenance, evidenceKind, videoUrl, cardFit, media: item.media.slice(0, 1) }
}

export function getShowcaseEvidenceLabel(item: Pick<ShowcaseCase, 'provenance' | 'evidenceKind'>, locale: string) {
  if (item.provenance === 'platform') return galleryCopy(locale, 'Made here', '本站制作')
  if (item.evidenceKind === 'template') return galleryCopy(locale, 'Author template', '作者模板')
  if (item.evidenceKind === 'style-study') return galleryCopy(locale, 'Author style study', '作者风格示例')
  return galleryCopy(locale, 'Author example', '作者案例')
}

export const SHOWCASE_PAGE_SIZE = 24
export function getShowcasePage<T>(items: T[], rawPage: string | null | undefined) {
  const pageCount = Math.max(1, Math.ceil(items.length / SHOWCASE_PAGE_SIZE))
  const requested = rawPage && /^\d{1,6}$/.test(rawPage) ? Number(rawPage) : 1
  const page = Math.min(pageCount, Math.max(1, requested))
  const offset = (page - 1) * SHOWCASE_PAGE_SIZE
  return { page, pageCount, offset, items: items.slice(offset, offset + SHOWCASE_PAGE_SIZE), total: items.length }
}
// The handoff retains the task when a user needs setup as well. A click or copy
// is an intent signal, never an installation or successful-run measurement.
export function getShowcaseHandoff(item: ShowcaseCase, locale: string) {
  const task = localizeShowcase(item.prompt, locale)
  const skillName = getShowcaseSkill(item.skillSlug).name
  return locale === 'zh'
    ? `我想使用 ${skillName} 完成下面的任务。\n\n先检查当前环境是否已有该技能或工作流。如果没有，请阅读技能页面和源仓库的安装说明，核实所需工具及费用，再指导我配置。\n技能页面：https://www.openagentskill.com/skills/${item.skillSlug}\n案例参考：https://www.openagentskill.com/showcase/${item.slug}\n来源：${item.sourceUrl}\n要求：${item.requirements.zh}\n\n任务：\n${task}\n\n请先确认必要的输入；缺失的素材请向我索取。完成后预览并检查结果。`
    : `I want to use ${skillName} for the task below.\n\nFirst check whether this skill or workflow is available in my environment. If it is missing, read its skill page and source installation instructions, check required tools and costs, and guide me through setup.\nSkill page: https://www.openagentskill.com/skills/${item.skillSlug}\nExample: https://www.openagentskill.com/showcase/${item.slug}\nSource: ${item.sourceUrl}\nRequirements: ${item.requirements.en}\n\nTask:\n${task}\n\nConfirm the required inputs first and ask me for missing assets. Preview and check the result when finished.`
}
