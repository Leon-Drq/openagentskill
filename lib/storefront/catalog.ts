export type StoreLocale = 'en' | 'zh'
export type StoreText = { en: string; zh: string }
export type StoreCategory = 'web' | 'slides' | 'video' | 'image' | 'writing' | 'research'
export type StoreAccess = 'free' | 'paid' | 'freemium'
export interface StoreProduct {
  slug: string
  title: StoreText
  description: StoreText
  category: StoreCategory
  access: StoreAccess
  price: number
  art: string
  version: string
  includes: StoreText[]
  input: StoreText
  output: StoreText
  runtime: StoreText
}
const t = (en: string, zh: string): StoreText => ({ en, zh })
// Isolated first-party UI fixtures. These are NOT registry records, authorized
// commercial offers, tested skill claims or real prices. Never import into SEO,
// the public registry, agent APIs or payment fulfillment.
export const STORE_PRODUCTS: StoreProduct[] = [
  { slug: 'studio-portfolio', title: t('Studio Portfolio', '独立创作者作品集'), category: 'web', access: 'paid', price: 19, art: 'portfolio', version: '1.0.0',
    description: t('Turn your work into a considered, expressive portfolio. A clear story, generous images, and a place for every project.', '把你的作品，变成值得停留的网站。从个人介绍到项目展示，用有秩序的版式讲清你的创作。'),
    includes: [t('Portfolio planning workflow', '作品集规划工作流'), t('Page structure & copy prompts', '页面结构与文案提示'), t('Responsive layout checklist', '响应式布局检查清单'), t('Setup & customization guide', '安装与定制说明')],
    input: t('Your bio, 3–6 projects, and images you can use.', '个人介绍、3–6 个项目和有权使用的图片。'), output: t('A portfolio page plan, draft copy, and a layout brief.', '作品集页面规划、文案草稿和布局说明。'), runtime: t('Requires your own coding agent. Model usage is billed separately.', '需自备编程 Agent，模型使用费用另计。') },
  { slug: 'launch-deck', title: t('The Launch Deck', '产品发布演示'), category: 'slides', access: 'paid', price: 12, art: 'deck', version: '1.0.0',
    description: t('Give your next launch a story people can follow. From a rough brief to a focused slide-by-slide narrative.', '把零散的产品信息，整理成一场重点鲜明的发布演示。让每一页都推进一个观点。'),
    includes: [t('Launch narrative workflow', '发布叙事工作流'), t('Slide outline template', '幻灯片大纲模板'), t('Speaker notes prompts', '演讲备注提示'), t('Review checklist', '演示检查清单')],
    input: t('Product brief, audience, and approved facts.', '产品简报、目标受众与确认过的事实。'), output: t('A slide outline and speaker notes.', '演示大纲与演讲备注。'), runtime: t('Requires your own agent. Presentation export tools may be needed.', '需自备 Agent；导出演示文件可能需要额外工具。') },
  { slug: 'interview-shorts', title: t('Interview to Shorts', '访谈转短视频'), category: 'video', access: 'paid', price: 24, art: 'video', version: '1.0.0',
    description: t('Find the moments that deserve a second watch. Shape long conversations into a short-form editing plan.', '从长访谈中找到值得被看见的片段，整理剪辑节奏、字幕重点和画面建议。'),
    includes: [t('Moment selection workflow', '高光片段筛选流程'), t('Edit decision template', '剪辑决策表模板'), t('Caption & cover prompts', '字幕与封面提示'), t('Delivery checklist', '交付检查清单')],
    input: t('A transcript with timestamps and footage you have permission to use.', '带时间码的逐字稿及有权使用的视频素材。'), output: t('A short-video edit plan with captions and shot notes.', '短视频剪辑方案、字幕稿和镜头说明。'), runtime: t('Transcription, editing, and generation services may charge separately.', '转录、剪辑和生成服务可能另行收费。') },
  { slug: 'research-brief', title: t('Research Brief', '研究简报'), category: 'research', access: 'free', price: 0, art: 'research', version: '1.0.0',
    description: t('Make the evidence easier to follow. Organize your sources into a concise brief with open questions kept visible.', '把已有资料整理成可追溯的研究简报，区分事实、判断和仍待确认的问题。'),
    includes: [t('Source-led brief workflow', '基于来源的简报流程'), t('Evidence table template', '证据表模板'), t('Review checklist', '复核清单')],
    input: t('A research question and source material.', '一个研究问题和已有资料。'), output: t('A structured brief with source references.', '附来源索引的结构化简报。'), runtime: t('Requires your own agent. Search tools are optional and may charge separately.', '需自备 Agent；可选搜索工具可能另行收费。') },
  { slug: 'social-visuals', title: t('Social Visual Studio', '社交视觉工作室'), category: 'image', access: 'freemium', price: 9, art: 'visual', version: '1.0.0',
    description: t('Build a visual direction that holds together, from a single post to a small campaign.', '从一张封面到一组内容，为社交发布建立一致的视觉方向。'),
    includes: [t('Basic: visual direction worksheet', '免费版：视觉方向工作表'), t('Plus: campaign planning workflow', 'Plus 版：系列内容规划流程'), t('Plus: format & handoff checklist', 'Plus 版：多尺寸交付清单')],
    input: t('Your message, brand assets, and target channel.', '传播主题、品牌素材和发布平台。'), output: t('A visual brief and a set of image prompts.', '视觉简报与一组图像提示词。'), runtime: t('Image generation is not included. Use your own provider and credits.', '不包含图像生成服务，需自备服务和额度。') },
  { slug: 'article-studio', title: t('Article Studio', '文章编辑室'), category: 'writing', access: 'free', price: 0, art: 'article', version: '1.0.0',
    description: t('Find the thread in your notes. Shape an outline, tighten the draft, and keep every claim connected to its source.', '从素材中找到主线，梳理文章结构、精修表达，让每个重要判断都有出处。'),
    includes: [t('Outline & editing workflow', '大纲与编辑工作流'), t('Source verification checklist', '来源核对清单'), t('Headline worksheet', '标题工作表')],
    input: t('Source notes, intended reader, and one main idea.', '原始素材、目标读者和一个核心观点。'), output: t('An outline, editing notes, and headline options.', '文章大纲、编辑建议和备选标题。'), runtime: t('Requires your own agent and model access.', '需自备 Agent 和模型服务。') },
]
export const STORE_CATEGORIES = ['all', 'web', 'slides', 'video', 'image', 'writing', 'research'] as const
export const STORE_ACCESS = ['all', 'free', 'freemium', 'paid'] as const
export type StoreFilters = { q: string; category: string; access: string; sort: string }
export function normalizeStoreFilters(params: URLSearchParams): StoreFilters {
  const choice = (key: string, options: readonly string[], fallback: string) => options.includes(params.get(key) || '') ? params.get(key)! : fallback
  return { q: (params.get('q') || '').trim().slice(0, 120), category: choice('category', STORE_CATEGORIES, 'all'), access: choice('access', STORE_ACCESS, 'all'), sort: choice('sort', ['featured', 'price-asc', 'price-desc'], 'featured') }
}
export function filterStoreProducts(filters: StoreFilters) {
  const words = filters.q.toLowerCase().split(/\s+/).filter(Boolean)
  const products = STORE_PRODUCTS.filter(p => (filters.category === 'all' || filters.category === p.category)
    && (filters.access === 'all' || filters.access === p.access)
    && words.every(word => `${p.title.en} ${p.title.zh} ${p.description.en} ${p.description.zh}`.toLowerCase().includes(word)))
  if (filters.sort !== 'featured') products.sort((a, b) => filters.sort === 'price-asc' ? a.price - b.price : b.price - a.price)
  return products
}
export function storeHref(path = '', locale: string = 'en', params?: Record<string, string>) {
  const query = new URLSearchParams(params)
  if (locale === 'zh') query.set('lang', 'zh')
  return `/marketplace${path}${query.size ? `?${query}` : ''}`
}
export function storeMoney(price: number, locale: StoreLocale) {
  return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price)
}
