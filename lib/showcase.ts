import curatedEntries from './showcase-curation.json' with { type: 'json' }
import curatedSources from './showcase-sources.json' with { type: 'json' }
import curatedMedia from './showcase-media.json' with { type: 'json' }
import curatedGroups from './showcase-groups.json' with { type: 'json' }
// @ts-expect-error Direct Node regression tests require the TypeScript extension.
import { galleryCopy, localizeEditorialText, editorialSearchText } from './i18n/gallery-copy.ts'

// Exact prompt used for the platform-produced poster on 2026-09-07.
export const MONO_POSTER_PROMPT = "Create an original portrait 3:4 editorial risograph poster using the mono-color skill's controlled two-ink method. Flat front-facing printed page, neutral white substrate #FAFAF7, botanical green #008A4B dominant ink (80% of inked area) and oxblood #8F3434 accent ink (20%). No third printing ink; tonal steps are halftone density, paper is not an ink.\n\nUse a specimen annotation composition with one oversized photographic fern frond curving from the bottom right across the center, cropped at the lower edge. Keep about 40% exposed paper, especially a quiet upper-right release zone. One focal event: oversized serif title interlocking with the stem. Fine annotation ticks form the only manual gesture family. An asymmetric art-book composition with no enclosing border or card.\n\nSubject: an observed fern leaf, tactile and botanical, rendered in coarse screened green photographic dots, intricate recognizable leaflets with white paper cutouts. The oxblood plate belongs only to the title and small annotation. Contemporary printed editorial work with generous space, no artificial sepia aging.\n\nExact text: 'ROOM TO GROW' in large oxblood editorial serif across two lines in upper-left and center-left; one small green monospace caption 'BOTANICAL STUDY / 01' at bottom left. Keep title at least 8x caption size. No other text, logos or watermarks.\n\nVisible paper fibers, subtle ink bleed and restrained print misregistration, sharply readable type, real reproduced image texture. Avoid full color, gradients, glossy mockups, 3D depth, stock-photo styling, clean vector clipart, decorative blobs, centered symmetry, additional labels and imitation of any existing artwork."

export type ShowcaseCategory = 'web' | 'slides' | 'image' | 'video' | 'document'
export type ShowcaseText = { en: string; zh: string }
export const showcaseText = (en: string, zh: string): ShowcaseText => ({ en, zh })
export const localizeShowcase = localizeEditorialText
export const getShowcaseImageSrc = (src: string, kind: 'card' | 'preview') => src.replace(/\.[^.]+$/, `.${kind}.webp`)
export const SHOWCASE_UPDATED_AT = '2026-09-08'

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
  return creator.profile ? `/creators/${encodeURIComponent(creator.profile.username)}` : creator.url
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

const tasteRevision = 'ccbc15639c97057cbfcf32ecebc38ef716e4bb37'
const voxRevision = '668ec3946fe0139bc985313b15c1a300fca42f94'
const pptRevision = 'c91369c449d34755d320a8b81d0734000d99d1ab'
const openRevision = '46700f6e8b97c873e953392231bcf62b525c8dd3'
const monoRevision = 'c8ff70597ddedcd65f21a0b528f6a70c35690b0a'
const tx = showcaseText

export function getShowcaseEvidenceLabel(item: ShowcaseCase, locale: string) {
  if (item.provenance === 'platform') return galleryCopy(locale, 'Made here', '本站制作')
  if (item.evidenceKind === 'template') return galleryCopy(locale, 'Author template', '作者模板')
  if (item.evidenceKind === 'style-study') return galleryCopy(locale, 'Author style study', '作者风格示例')
  return galleryCopy(locale, 'Author example', '作者案例')
}

const expandedCases: ShowcaseCase[] = curatedEntries.map((entry) => {
  const group = curatedGroups[entry.group as keyof typeof curatedGroups]
  const source = curatedSources[group.source as keyof typeof curatedSources]
  const category = ('category' in entry ? entry.category : group.category) as ShowcaseCategory
  const videoPath = entry.group === 'motion' ? entry.assets[0].replace(/preview\.png$/, 'preview.mp4') : null
  const sourcePath = entry.group === 'frontend' ? `templates/${entry.slug.replace('frontend-', '')}` : entry.assets[0]
  const note = tx(
    'Selected from the author’s pinned repository on 2026-09-08. Originals are preserved; display copies are resized and compressed. We inspected the preview, not a fresh agent run. Original prompt, model, production time and cost are not verified. Sample figures and scientific labels require independent checking.',
    '于 2026-09-08 从作者仓库的固定版本中精选。保留原图，展示副本仅缩放压缩。本站检查了预览，没有重新运行技能；未核实原始提示词、模型、制作时长与成本。示例数字及科学标注需独立核查。',
  )
  if (entry.group === 'motion') {
    note.en += ' Upstream credits are preserved in Gallery attribution. Studio names describe inspiration, not endorsement.'
    note.zh += ' 上游署名保留于 Gallery 素材记录；工作室名称仅描述风格灵感，不代表背书。'
  }
  return {
    slug: entry.slug, skillSlug: group.skillSlug, category, title: entry.title, description: entry.brief,
    input: group.input, output: group.output, requirements: group.requirements,
    prompt: tx(
      `Use ${getShowcaseSkill(group.skillSlug).name} for this task:\n${entry.brief.en}\n\nVisual reference: ${entry.title.en}. Do not copy its content. Ask for missing inputs and agree on a plan before generation. Use supplied or licensed assets; label sample data and never invent results or endorsements. Explain the file format and any costs. After approval, create the output and check readability, factual labels and clipping. My content: [paste your material].`,
      `使用 ${getShowcaseSkill(group.skillSlug).name} 完成以下任务：\n${entry.brief.zh}\n\n视觉参考：${entry.title.zh}。不照搬其内容。先索取缺失资料并确认方案，再开始生成。仅使用提供或获准使用的素材，标注示例数据，不编造成果或背书。说明交付格式和可能费用。确认后制作，并检查可读性、事实标注及溢出。我的内容：[粘贴素材]。`,
    ),
    promptKind: 'suggested', provenance: 'author', evidenceKind: group.evidenceKind as ShowcaseCase['evidenceKind'],
    creatorId: ('creatorId' in entry && entry.creatorId) || source.creatorId,
    sourceUrl: `https://github.com/${source.repo}/${entry.group === 'frontend' ? 'tree' : 'blob'}/${source.revision}/${sourcePath}`,
    sourceRevision: source.revision, license: source.license, licenseUrl: `/showcase/curated-${group.source}-LICENSE.txt`, productionNote: note,
    media: entry.assets.map((_, index) => {
      const meta = (curatedMedia as Record<string, { src: string; width: number; height: number }>)[`${entry.slug}:${index}`]
      return { src: meta.src, width: meta.width, height: meta.height, alt: tx(`${entry.title.en} — author preview ${index + 1}`, `${entry.title.zh}：作者预览 ${index + 1}`) }
    }),
    ...(videoPath ? { videoUrl: `https://raw.githubusercontent.com/${source.repo}/${source.revision}/${videoPath}` } : {}),
    cardFit: category === 'web' ? 'cover' : 'contain', updatedAt: '2026-09-08',
  }
})

// Stable round-robin keeps one large template pack from occupying the first page.
const expandedByGroup = [...new Set(curatedEntries.map((entry) => entry.group))].map((group) => expandedCases.filter((_, index) => curatedEntries[index].group === group))
const interleavedExpanded = Array.from({ length: Math.max(...expandedByGroup.map((items) => items.length)) }, (_, index) => expandedByGroup.flatMap((items) => items[index] ? [items[index]] : [])).flat()

const openDesignBase = {
  skillSlug: 'nexu-io-open-design', category: 'web' as const,
  creatorId: 'nexu-io', provenance: 'author' as const, promptKind: 'suggested' as const,
  sourceUrl: `https://github.com/nexu-io/open-design/blob/${openRevision}/README.md`,
  sourceRevision: openRevision, license: 'Apache-2.0', licenseUrl: '/showcase/open-LICENSE.txt',
  requirements: tx('Open Design local setup and a connected coding agent. This is an app workflow that composes skills.', '需安装 Open Design 本地应用并连接编程 Agent；这是组合使用技能的应用工作流。'),
  productionNote: tx('An example published by the Open Design authors. The original prompt, model, runtime and cost were not disclosed for this sample. Screens show demonstration content.', 'Open Design 作者发布的案例。该示例的原始提示词、模型、耗时与成本未公开；画面中的内容为演示数据。'),
  updatedAt: SHOWCASE_UPDATED_AT,
}
const voxBase = {
  skillSlug: 'vox-director', category: 'video' as const,
  creatorId: 'alisa0808', provenance: 'author' as const, promptKind: 'suggested' as const,
  sourceUrl: `https://github.com/alisa0808/vox-director/blob/${voxRevision}/README.md`,
  sourceRevision: voxRevision, license: 'MIT', licenseUrl: '/showcase/vox-LICENSE.txt',
  output: tx('A narrated collage-style explainer video.', '带旁白的拼贴风格科普短视频。'),
  requirements: tx('A compatible agent, Atlas Cloud API credentials and FFmpeg. Image, motion and audio generation may incur usage charges.', '兼容的 Agent、Atlas Cloud API 凭据与 FFmpeg。图像、动态画面和音频生成可能产生用量费用。'),
  productionNote: tx('A video published in the author’s showcase. The exact original prompt, model, runtime and cost were not disclosed. The task below is our suggested starting point.', '作者作品集中的视频，未公开该次制作的完整提示词、模型、耗时与成本。下方任务是我们整理的尝试起点。'),
  updatedAt: SHOWCASE_UPDATED_AT,
}

const INITIAL_SHOWCASE_CASES: ShowcaseCase[] = [
  {
    slug: 'room-to-grow-poster', skillSlug: 'yanliudesign-mono-color-skill', category: 'image',
    title: tx('Room to grow', '留一点生长空间'),
    description: tx('A botanical poster in two inks, with oversized type and tactile print detail.', '用双色油墨、超大衬线字与网点纹理，制作一张植物主题海报。'),
    input: tx('Fern subject, two ink colors, a portrait layout and the headline “ROOM TO GROW”.', '蕨叶主题、两种油墨颜色、竖版构图，以及标题“ROOM TO GROW”。'),
    output: tx('An original 1086 × 1448 PNG poster. The generated title uses three lines.', '原创 1086 × 1448 PNG 海报；成品标题排成三行。'),
    requirements: tx('The mono-color design method and an image-generation tool. Image generation uses your tool’s quota or billing.', 'mono-color 设计方法与图像生成工具；图片生成消耗所用工具的额度或用量。'),
    prompt: tx(MONO_POSTER_PROMPT, MONO_POSTER_PROMPT), promptKind: 'original', provenance: 'platform',
    creatorId: 'openagentskill', sourceUrl: `https://github.com/yanliudesign/mono-color-skill/tree/${monoRevision}`,
    sourceRevision: monoRevision, license: 'Original platform artwork', licenseUrl: '/showcase/ATTRIBUTION.md',
    productionNote: tx('Produced by OpenAgentSkill on September 7, 2026, using a locally installed mono-color method and the Codex image-generation tool. One generation; no manual retouching. The service did not report its underlying model or per-image cost. This is one demonstration, not a cross-agent benchmark.', 'OpenAgentSkill 于 2026 年 9 月 7 日，参考本地安装的 mono-color 方法，用 Codex 图像生成工具制作。单次生成，未人工修图；服务未返回底层模型名称或单张费用。这是一次制作记录，不代表跨 Agent 测试。'),
    media: [{ src: '/showcase/mono-room-to-grow.png', width: 1086, height: 1448, alt: tx('Room to Grow poster: a green fern with large red serif lettering on white textured paper.', '暖白纸面上的绿色蕨叶与红色大衬线字植物海报。') }],
    cardFit: 'contain', updatedAt: SHOWCASE_UPDATED_AT,
  },
  {
    slug: 'floria-floral-studio', skillSlug: 'design-taste-frontend', category: 'web',
    title: tx('A floral studio, in full bloom', '花艺工作室的品牌网页'),
    description: tx('A dark botanical storefront with editorial typography and a complete scrolling layout.', '深色植物视觉、编辑式排版与完整长页面，呈现花艺品牌气质。'),
    input: tx('A floral-studio brand brief, collection names, photography and a contact call to action.', '花艺品牌简介、系列名称、摄影素材与联系入口。'),
    output: tx('Author screenshots of the Floria website, shown in two sections.', '作者提供的 Floria 网页截图，分上下两部分展示。'),
    requirements: tx('A coding agent with Taste Skill and a frontend project. Supply images you have permission to use.', '已添加 Taste Skill 的编程 Agent 与前端项目，并准备有权使用的图片。'),
    prompt: tx('Use Taste Skill to build a responsive website for a floral studio called [brand]. Use a dark botanical palette, confident editorial typography and generous spacing. Include a hero, three collections, the studio story and a contact section. Use my supplied photos and copy; make navigation and mobile layouts work. Preview the result and check it at desktop and phone widths.', '使用 Taste Skill，为花艺工作室 [品牌名] 制作响应式网站。采用深色植物配色、醒目的编辑式排版与留白。包含首屏、三个花艺系列、品牌故事和联系板块。使用我提供的照片和文案，完成导航和移动端适配，并在桌面与手机宽度预览检查。'),
    promptKind: 'suggested', provenance: 'author', creatorId: 'leonxlnx',
    sourceUrl: `https://github.com/Leonxlnx/taste-skill/blob/${tasteRevision}/README.md`, sourceRevision: tasteRevision,
    license: 'MIT', licenseUrl: '/showcase/taste-LICENSE.txt',
    productionNote: tx('The author labels these screenshots “Created with taste-skill”. We have not rerun the original project. The original prompt, model, runtime and cost were not disclosed.', '作者将这些截图标为使用 taste-skill 制作。我们未重新运行原项目；原始提示词、模型、耗时与成本未公开。'),
    media: [
      { src: '/showcase/taste-floria-top.webp', width: 1906, height: 3724, alt: tx('Floria floral studio: dark landing page with oversized type, flower photography and product cards.', 'Floria 花艺工作室网页上半部分：大标题、花卉摄影与产品卡片。') },
      { src: '/showcase/taste-floria-bottom.webp', width: 1906, height: 3725, alt: tx('Lower sections of the Floria website, including the studio story and contact information.', 'Floria 网页下半部分，展示工作室故事与联系信息。') },
    ], updatedAt: SHOWCASE_UPDATED_AT,
  },
  {
    slug: 'editorial-html-slides', skillSlug: 'op7418-guizang-ppt-skill', category: 'slides',
    title: tx('Stories that become slides', '把故事排成一套演示文稿'),
    description: tx('An author’s collection of editorial presentations, from travel to ideas.', '从旅行叙事到观点表达，看看作者展示的演示文稿版式。'),
    input: tx('A topic, audience, outline and supporting images.', '主题、受众、内容大纲与配图素材。'),
    output: tx('Single-file HTML presentations. The preview is an overview of several author examples, not one downloadable deck. Native editable PPTX is not implied.', '单文件 HTML 演示文稿。预览图汇总了多个作者案例，并非一套可下载文稿；不代表原生可编辑 PPTX。'),
    requirements: tx('A coding agent with the skill and a browser to view the HTML. Optional AI illustrations require an image-generation tool.', '已添加该技能的编程 Agent 和用于打开 HTML 的浏览器；如需 AI 配图，另需图像生成工具。'),
    prompt: tx('Use Guizang PPT Skill to turn the following outline into a 10-slide HTML presentation for [audience]. First propose a narrative and choose a suitable editorial style. Include a cover, one main idea per slide and a clear final takeaway. Use my supplied images where possible. Deliver a self-contained HTML file with keyboard navigation and check each slide for clipping. Outline: [paste outline].', '使用归藏 PPT Skill，把以下大纲制作成面向 [受众] 的 10 页 HTML 演示文稿。先提出叙事结构，选择合适的编辑式风格。包含封面，每页一个核心观点，以清晰结论收尾。优先使用我提供的图片。交付支持键盘翻页的单文件 HTML，逐页检查溢出。大纲：[粘贴大纲]。'),
    promptKind: 'suggested', provenance: 'author', creatorId: 'op7418',
    sourceUrl: `https://github.com/op7418/guizang-ppt-skill/blob/${pptRevision}/README.en.md`, sourceRevision: pptRevision,
    license: 'AGPL-3.0', licenseUrl: '/showcase/ppt-LICENSE.txt',
    productionNote: tx('An unmodified showcase image from the author’s repository. Original source and its license are linked below. Individual generation settings and costs were not disclosed.', '直接收录作者仓库中的作品展示图，未修改。下方附原始来源及许可；各案例的具体生成配置与成本未公开。'),
    media: [{ src: '/showcase/ppt-ppt-skill-showcase.png', width: 2400, height: 1350, alt: tx('A collage of editorial slide designs from Guizang PPT Skill, mixing oversized text and imagery.', '归藏 PPT Skill 的演示文稿案例总览，大字排版与图片相结合。') }], updatedAt: SHOWCASE_UPDATED_AT,
  },
  {
    ...voxBase, slug: 'football-collage-explainer', title: tx('The story behind the game', '把足球讲成一个视觉故事'),
    description: tx('Football explained through paper-cut imagery, narration and motion.', '用剪纸式画面、旁白和动态镜头讲解足球。'),
    input: tx('A football topic, audience and desired duration.', '一个足球主题、受众与目标时长。'),
    prompt: tx('Use Vox Director to make a 60-second explainer about why football became a global game, for a general audience. Propose a fact-checked narration, a beat map and a collage visual direction first. After I approve the plan, generate the shots and audio and assemble the video. Keep captions readable and list sources for factual claims.', '使用 Vox Director，为普通观众制作约 60 秒的短视频，解释足球为何成为全球运动。先提出经核实的旁白、节奏分镜与拼贴视觉方向。我确认方案后，再生成镜头与音频并合成视频。字幕需清晰可读，事实陈述附来源。'),
    media: [{ src: '/showcase/vox-football.jpg', width: 640, height: 360, alt: tx('A collage-style football video frame from Vox Director.', 'Vox Director 足球科普视频的拼贴风格画面。') }],
    videoUrl: `https://raw.githubusercontent.com/alisa0808/vox-director/${voxRevision}/assets/showcase-football.mp4`,
  },
  {
    ...openDesignBase, slug: 'gamified-habit-app', title: tx('A little progress, every day', '让每天的进步看得见'),
    description: tx('Three mobile screens turn daily habits into quests and visible progress.', '用任务、等级与进度，将每日习惯设计成三个移动端界面。'),
    input: tx('A habit-tracking concept, example daily quests and a visual direction.', '习惯养成产品概念、每日任务示例与视觉方向。'),
    output: tx('A mobile UI concept shown across three screens; backend functionality is not demonstrated.', '三个移动端界面的设计概念；示例不展示后端功能。'),
    prompt: tx('In Open Design, design a mobile habit app called [name]. Create three connected screens: today’s quests, progress and profile. Use warm orange accents, simple icons and clear type. Include completion, empty and missed-day states. Use sample data and deliver a browser-previewable prototype; clearly identify interactions that are only mocked.', '在 Open Design 中，为习惯养成 App [名称] 设计今日任务、进度和个人资料三个关联界面。使用暖橙色点缀、简洁图标与清晰排版，补全任务完成、空状态和缺勤状态。用示例数据交付可在浏览器预览的原型，并标明模拟交互。'),
    media: [{ src: '/showcase/open-gamified-app.png', width: 1024, height: 576, alt: tx('Three orange-accented mobile habit-app screens with quests and progress.', '带暖橙色点缀的三个习惯 App 界面，包含任务与进度。') }],
  },
  {
    ...openDesignBase, slug: 'editorial-web-dashboard', title: tx('A dashboard with an editorial eye', '把仪表盘做出编辑感'),
    description: tx('An information-rich web layout with a restrained, readable hierarchy.', '以克制的版式层级，组织信息丰富的网页界面。'),
    input: tx('A dashboard brief and sample content for its main sections.', '仪表盘需求与主要版块的示例内容。'),
    output: tx('An author-published web dashboard design preview.', '作者发布的网页仪表盘设计预览。'),
    prompt: tx('In Open Design, create an editorial-style dashboard for [product]. Organize the primary overview, content cards and navigation with a clear typographic hierarchy. Use a restrained palette and sample data. Make the layout responsive and deliver a browser-previewable prototype. Label mock data and identify any interactions that still need implementation.', '在 Open Design 中，为 [产品] 制作编辑式仪表盘。通过清晰的字体层级组织概览、内容卡片与导航。配色克制，使用示例数据，完成响应式浏览器原型。标注模拟数据与尚待实现的交互。'),
    media: [{ src: '/showcase/open-dating-web.png', width: 1024, height: 576, alt: tx('Open Design’s editorial dashboard example with a multi-column interface.', 'Open Design 作者的编辑式仪表盘示例，多栏信息布局。') }],
  },
  {
    ...voxBase, slug: 'money-collage-explainer', title: tx('Make money make sense', '把钱的故事讲明白'),
    description: tx('A complex everyday subject becomes a visual, narrated explainer.', '把日常中的复杂主题变成直观、有旁白的科普视频。'),
    input: tx('An educational money topic, audience and duration.', '与货币相关的科普主题、受众和时长。'),
    prompt: tx('Use Vox Director to plan a 60-second educational video about how money evolved from barter to digital payments. Write a factual narration for a general audience and a collage-style beat map. Show me the script and visual direction before generating. After approval, assemble the video with readable captions and provide sources.', '使用 Vox Director，策划一个约 60 秒的科普视频，讲述货币如何从以物易物发展到数字支付。为普通观众撰写事实准确的旁白与拼贴式分镜。先展示脚本和视觉方向，确认后生成带清晰字幕的视频，并附资料来源。'),
    media: [{ src: '/showcase/vox-money.jpg', width: 640, height: 360, alt: tx('A collage-style frame from the author’s money explainer video.', '作者货币科普视频中的拼贴式画面。') }],
    videoUrl: `https://raw.githubusercontent.com/alisa0808/vox-director/${voxRevision}/assets/showcase-money.mp4`,
  },
  {
    ...openDesignBase, slug: 'live-data-dashboard', title: tx('A clear view of the numbers', '让数据一眼可读'),
    description: tx('A data-dashboard concept with charts, status indicators and dense information.', '用图表、状态指示与信息分区，呈现数据仪表盘概念。'),
    input: tx('A metric list, chart requirements and example time-series data.', '指标清单、图表需求与时间序列示例数据。'),
    output: tx('A dashboard design screenshot. This preview does not connect to a live data service.', '数据仪表盘设计截图；此预览未连接实时数据服务。'),
    prompt: tx('In Open Design, create a dashboard for [team] showing [key metrics]. Use clearly labeled charts, useful empty and loading states, and a visible sample-data indicator. Add time-range controls and responsive layouts. Deliver a browser-previewable prototype and explain what is needed to connect real data.', '在 Open Design 中，为 [团队] 制作展示 [关键指标] 的仪表盘。图表标注清晰，包含空状态、加载状态与示例数据提示。增加时间范围控制和响应式布局，交付浏览器原型，并说明接入真实数据所需的工作。'),
    media: [{ src: '/showcase/open-live-dashboard.png', width: 2048, height: 1280, alt: tx('An Open Design dashboard preview with charts and operational metrics.', '带图表与运营指标的 Open Design 仪表盘预览。') }],
  },
  {
    ...voxBase, slug: 'silicon-valley-explainer', title: tx('An idea becomes an industry', '从一个想法到一个产业'),
    description: tx('A collage-style short video explores the story of Silicon Valley.', '用拼贴风格短视频探索硅谷的故事。'),
    input: tx('A technology-history topic, audience and duration.', '科技历史主题、受众与目标时长。'),
    prompt: tx('Use Vox Director to plan a 60-second explainer about how Silicon Valley became a technology hub. Build a sourced narrative around three turning points, then propose a collage-style beat map. Ask me to approve the script and visual direction before generating media. Deliver a narrated video with readable captions.', '使用 Vox Director，策划一个约 60 秒的科普视频，介绍硅谷如何成为科技中心。围绕三个转折点建立有来源的叙事，再提出拼贴式分镜。脚本和视觉方向经我确认后再生成素材，交付带旁白与清晰字幕的视频。'),
    media: [{ src: '/showcase/vox-silicon-valley.jpg', width: 640, height: 360, alt: tx('A collage-style Silicon Valley explainer video frame.', '硅谷故事科普视频的拼贴风格画面。') }],
    videoUrl: `https://raw.githubusercontent.com/alisa0808/vox-director/${voxRevision}/assets/showcase-silicon-valley.mp4`,
  },
  {
    ...openDesignBase, slug: 'research-decision-room', title: tx('Research, ready for a decision', '把研究整理成决策界面'),
    description: tx('A workspace concept that brings research and comparison into one view.', '把研究信息与对比内容组织进同一个工作台。'),
    input: tx('A research question, comparison criteria and source material.', '研究问题、比较标准与来源材料。'),
    output: tx('A research workspace design preview, with demonstration content.', '使用演示内容的研究工作台设计预览。'),
    prompt: tx('In Open Design, create a research decision workspace for comparing [options]. Include an evidence panel, comparison table, source links and a decision summary. Separate facts from assumptions, show empty states and use clearly labeled sample data. Deliver a responsive browser-previewable prototype.', '在 Open Design 中，设计用于比较 [方案] 的研究决策工作台。包含证据面板、对比表、来源链接和决策摘要。区分事实与假设，补全空状态，并明确标注示例数据，交付响应式浏览器原型。'),
    media: [{ src: '/showcase/open-research-decision-room.png', width: 1440, height: 1100, alt: tx('Open Design’s research decision room interface example.', 'Open Design 研究决策工作台界面示例。') }],
  },
]

export const SHOWCASE_CASES: ShowcaseCase[] = [...INITIAL_SHOWCASE_CASES, ...interleavedExpanded]
export const SHOWCASE_PAGE_SIZE = 24
export function getShowcasePage<T>(items: T[], rawPage: string | null | undefined) {
  const pageCount = Math.max(1, Math.ceil(items.length / SHOWCASE_PAGE_SIZE))
  const requested = rawPage && /^\d{1,6}$/.test(rawPage) ? Number(rawPage) : 1
  const page = Math.min(pageCount, Math.max(1, requested))
  const offset = (page - 1) * SHOWCASE_PAGE_SIZE
  return { page, pageCount, offset, items: items.slice(offset, offset + SHOWCASE_PAGE_SIZE), total: items.length }
}
export const getShowcaseCase = (slug: string) => SHOWCASE_CASES.find((item) => item.slug === slug)
export const getShowcasesForSkill = (skillSlug: string) => SHOWCASE_CASES.filter((item) => item.skillSlug === skillSlug)
export const FEATURED_SHOWCASE_SLUGS = ['floria-floral-studio', 'room-to-grow-poster', 'editorial-html-slides']

const casePaths = new Set(SHOWCASE_CASES.map((item) => `/showcase/${item.slug}`))
const assetPaths = new Set([
  '/showcase/ATTRIBUTION.md',
  '/showcase/curated-motion-NOTICES.md',
  ...SHOWCASE_CASES.flatMap((item) => [
    item.licenseUrl,
    ...item.media.flatMap((media) => [media.src, getShowcaseImageSrc(media.src, 'card'), getShowcaseImageSrc(media.src, 'preview')]),
  ]),
])

// Root loading can stream a 200 before notFound(). The proxy rejects unknown
// case URLs first, while allowing the original assets and licensed derivatives.
export function isMissingShowcasePath(pathname: string) {
  return pathname.startsWith('/showcase/') && !casePaths.has(pathname) && !assetPaths.has(pathname)
}

export function filterShowcaseCases(category: string, query: string, skillCreatorId = '', tagId = '') {
  const terms = query.normalize('NFKC').trim().toLowerCase().split(/\s+/).filter(Boolean)
  return SHOWCASE_CASES.filter((item) => {
    const skill = getShowcaseSkill(item.skillSlug)
    const skillCreator = getShowcaseCreator(skill.creatorId)
    const artworkCreator = getShowcaseCreator(item.creatorId)
    const tags = getShowcaseTags(item)
    const categoryLabel = SHOWCASE_CATEGORIES.find((entry) => entry.id === item.category)!.label
    const searchable = [editorialSearchText(item.title), editorialSearchText(item.description), editorialSearchText(categoryLabel), skill.name, item.category, skillCreator.name, skillCreator.githubUsername, artworkCreator.name, ...tags.flatMap((tag) => [tag.aliases, editorialSearchText(tag.label)])].join(' ').normalize('NFKC').toLowerCase()
    return (category === 'all' || item.category === category) && (!skillCreatorId || skill.creatorId === skillCreatorId) && (!tagId || tags.some((tag) => tag.id === tagId)) && terms.every((term) => searchable.includes(term))
  })
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
