// One versioned vocabulary for import-time classification, SQL and discovery UI.
// Source category/tags remain untouched; these fields describe task fit, not trust.
export const TAXONOMY_VERSION = 1
export const SKILL_CATEGORIES = [
  ['coding-agents', 'Development', '开发与测试', 'code'],
  ['design-creative', 'Design & UI', '设计与 UI', 'web'],
  ['image-generation', 'Images & graphics', '图像与绘图', 'image'],
  ['video-creation', 'Video & audio', '视频与音频', 'video'],
  ['document-processing', 'Documents', '文档处理', 'document'],
  ['presentation', 'Presentations', '演示文稿', 'slides'],
  ['data', 'Data & analytics', '数据与分析', 'data'],
  ['research', 'Search & research', '搜索与研究', 'search'],
  ['automation', 'Browser & automation', '浏览器与自动化', 'workflow'],
  ['devops', 'DevOps & cloud', '部署与云服务', 'terminal'],
  ['ai-knowledge', 'AI & knowledge', 'AI 与知识库', 'search'],
  ['marketing', 'Marketing & sales', '营销与销售', 'data'],
  ['productivity', 'Productivity', '效率与协作', 'document'],
  ['security', 'Security', '安全', 'terminal'],
  ['finance', 'Finance', '金融', 'data'],
  ['legal', 'Legal & compliance', '法律与合规', 'document'],
  ['education', 'Education', '教育', 'document'],
  ['hardware', 'Hardware & IoT', '硬件与物联网', 'workflow'],
  ['other', 'Other skills', '其他技能', 'code'],
] as const
export type SkillCategory = typeof SKILL_CATEGORIES[number][0]

const legacy: Record<string, SkillCategory> = {
  coding: 'coding-agents', 'coding-agent': 'coding-agents', development: 'coding-agents', 'developer-tools': 'coding-agents', 'agent-skills': 'coding-agents', 'testing-qa': 'coding-agents', 'api-testing': 'coding-agents',
  design: 'design-creative', creative: 'design-creative', image: 'image-generation',
  video: 'video-creation', 'video-generation': 'video-creation', 'media-automation': 'video-creation',
  'rag-knowledge': 'ai-knowledge', rag: 'ai-knowledge', 'ml-automation': 'ai-knowledge', 'agent-frameworks': 'ai-knowledge', 'agent-to-agent-protocols': 'ai-knowledge',
  'presentation-generation': 'presentation', ppt: 'presentation',
  'finance-quant': 'finance', 'web3-analytics': 'finance',
  'marketing-growth': 'marketing', 'growth-marketing': 'marketing', 'growth-automation': 'marketing',
  'web-automation': 'automation', 'browser-automation': 'automation', 'web-scraping': 'automation', workflow: 'automation', 'workflow-automation': 'automation', 'self-hosted-automation': 'automation',
  'legal-compliance': 'legal', 'data-analysis': 'data', 'sports-analytics': 'data',
  'github-automation': 'coding-agents', 'productivity-automation': 'productivity', 'content-automation': 'marketing', 'support-automation': 'productivity', 'commerce-automation': 'marketing', business: 'productivity', 'robotics-iot': 'hardware', 'geo-science': 'research', utility: 'other',
}
export const normalizeTaxonomyKey = (value: string) => value.trim().toLowerCase().replace(/[\s_]+/g, '-')
export function normalizeSkillCategory(value: string): SkillCategory | null {
  const key = normalizeTaxonomyKey(value)
  return legacy[key] || (SKILL_CATEGORIES.some(c => c[0] === key) ? key as SkillCategory : null)
}
const categoryTranslations: Record<string, readonly string[]> = {
  "coding-agents": [
    "開発・テスト",
    "개발 및 테스트",
    "Desarrollo",
    "Entwicklung",
    "Développement",
    "Pengembangan"
  ],
  "design-creative": [
    "デザイン・UI",
    "디자인 및 UI",
    "Diseño y UI",
    "Design & UI",
    "Design et UI",
    "Desain & UI"
  ],
  "image-generation": [
    "画像・グラフィック",
    "이미지 및 그래픽",
    "Imágenes",
    "Bilder & Grafik",
    "Images",
    "Gambar"
  ],
  "video-creation": [
    "動画・音声",
    "영상 및 오디오",
    "Vídeo y audio",
    "Video & Audio",
    "Vidéo et audio",
    "Video & audio"
  ],
  "document-processing": [
    "文書処理",
    "문서 처리",
    "Documentos",
    "Dokumente",
    "Documents",
    "Dokumen"
  ],
  "presentation": [
    "プレゼンテーション",
    "프레젠테이션",
    "Presentaciones",
    "Präsentationen",
    "Présentations",
    "Presentasi"
  ],
  "data": [
    "データ分析",
    "데이터 분석",
    "Datos y análisis",
    "Daten & Analyse",
    "Données et analyse",
    "Data & analitik"
  ],
  "research": [
    "検索・調査",
    "검색 및 연구",
    "Búsqueda e investigación",
    "Suche & Recherche",
    "Recherche",
    "Pencarian & riset"
  ],
  "automation": [
    "ブラウザ・自動化",
    "브라우저 및 자동화",
    "Navegador y automatización",
    "Browser & Automation",
    "Navigateur et automatisation",
    "Browser & otomatisasi"
  ],
  "devops": [
    "DevOps・クラウド",
    "DevOps 및 클라우드",
    "DevOps y nube",
    "DevOps & Cloud",
    "DevOps et cloud",
    "DevOps & cloud"
  ],
  "ai-knowledge": [
    "AI・知識ベース",
    "AI 및 지식",
    "IA y conocimiento",
    "KI & Wissen",
    "IA et connaissances",
    "AI & pengetahuan"
  ],
  "marketing": [
    "マーケティング・営業",
    "마케팅 및 영업",
    "Marketing y ventas",
    "Marketing & Vertrieb",
    "Marketing et ventes",
    "Pemasaran & penjualan"
  ],
  "productivity": [
    "生産性",
    "생산성",
    "Productividad",
    "Produktivität",
    "Productivité",
    "Produktivitas"
  ],
  "security": [
    "セキュリティ",
    "보안",
    "Seguridad",
    "Sicherheit",
    "Sécurité",
    "Keamanan"
  ],
  "finance": [
    "金融",
    "금융",
    "Finanzas",
    "Finanzen",
    "Finance",
    "Keuangan"
  ],
  "legal": [
    "法務・コンプライアンス",
    "법률 및 규정 준수",
    "Legal y cumplimiento",
    "Recht & Compliance",
    "Droit et conformité",
    "Hukum & kepatuhan"
  ],
  "education": [
    "教育",
    "교육",
    "Educación",
    "Bildung",
    "Éducation",
    "Pendidikan"
  ],
  "hardware": [
    "ハードウェア・IoT",
    "하드웨어 및 IoT",
    "Hardware e IoT",
    "Hardware & IoT",
    "Matériel et IoT",
    "Perangkat keras & IoT"
  ],
  "other": [
    "その他",
    "기타",
    "Otros skills",
    "Weitere Skills",
    "Autres skills",
    "Skill lainnya"
  ]
}
export function categoryLabel(key: string, locale: string) {
  const category = SKILL_CATEGORIES.find(c => c[0] === key)
  const index = ['ja','ko','es','de','fr','id'].indexOf(locale)
  return category ? index >= 0 ? categoryTranslations[key][index] : category[locale === 'zh' ? 2 : 1] : key.replaceAll('-', ' ')
}

// Regular expressions intentionally use syntax common to JS and PostgreSQL.
const word = (value: string) => `(^|[^a-z0-9])(${value})([^a-z0-9]|$)`
export const CATEGORY_RULES: readonly { category: SkillCategory; pattern: string }[] = [
  { category: 'presentation', pattern: word('pptx|ppt|powerpoint|presentation|presentations|slide|slides|slide deck|幻灯片|演示文稿') },
  { category: 'video-creation', pattern: word('video|videos|remotion|filmmaking|b-roll|broll|animation|audio|podcast|speech|transcription|视频|音频') },
  { category: 'image-generation', pattern: word('image generation|image editing|text-to-image|imagegen|canvas design|canvas-design|illustration|poster|photography|图像生成|图片编辑') },
  { category: 'document-processing', pattern: word('pdf|docx|document conversion|document processing|ocr|markitdown|文档处理') },
  { category: 'finance', pattern: word('finance|financial|trading|stock|stocks|quant|backtesting|investment|crypto|blockchain|金融|股票') },
  { category: 'legal', pattern: word('legal|law|contract review|compliance|法律|合规') },
  { category: 'security', pattern: word('security|vulnerability|vulnerabilities|pentest|password|prompt injection|安全|漏洞') },
  { category: 'devops', pattern: word('devops|deployment|deploy|kubernetes|docker|terraform|cloud infrastructure|ci/cd|部署') },
  { category: 'ai-knowledge', pattern: word('rag|knowledge base|knowledge-base|retrieval augmented|llm|llms|machine learning|model training|agent memory|agent orchestration|mcp server|知识库|模型训练') },
  { category: 'data', pattern: word('data analysis|data-analysis|analytics|data pipeline|database|sql|csv|xlsx|spreadsheet|statistics|数据分析|数据库') },
  { category: 'marketing', pattern: word('marketing|seo|sales|copywriting|campaign|ecommerce|e-commerce|newsletter|营销') },
  { category: 'education', pattern: word('education|teaching|tutoring|lesson|curriculum|教育|教学') },
  { category: 'hardware', pattern: word('robotics|robot|iot|arduino|raspberry pi|hardware|物联网') },
  { category: 'design-creative', pattern: word('design|ui|ux|figma|frontend|front-end|accessibility|设计') },
  { category: 'automation', pattern: word('browser|scraping|scraper|crawl|crawler|workflow automation|automate|automation|自动化|抓取') },
  { category: 'research', pattern: word('research|web search|literature|fact check|source verification|研究|检索') },
  { category: 'productivity', pattern: word('productivity|calendar|email|notes|meeting|communication|效率|日程') },
  { category: 'coding-agents', pattern: word('code|coding|developer|development|debug|testing|test|git|github|cli|编程|测试') },
]
export const TOPIC_RULES = [
  ['frontend', 'coding-agents', 'Frontend', '前端开发', 'frontend|front-end|react|nextjs|next.js'],
  ['code-review', 'coding-agents', 'Code review', '代码审查', 'code review|code-review'],
  ['testing', 'coding-agents', 'Testing & QA', '测试与 QA', 'testing|test|qa|playwright|vitest'],
  ['git', 'coding-agents', 'Git & GitHub', 'Git 与 GitHub', 'git|github|pull request'],
  ['cli', 'coding-agents', 'CLI tools', '命令行工具', 'cli|command line|terminal'],
  ['ui-design', 'design-creative', 'UI & UX', 'UI 与 UX', 'ui|ux|figma|design system'],
  ['image-editing', 'image-generation', 'Image editing', '图片编辑', 'image editing|image editor|image-editing|background removal'],
  ['image-generation', 'image-generation', 'Image generation', '图像生成', 'image generation|imagegen|text-to-image|canvas-design|poster|illustration'],
  ['video-generation', 'video-creation', 'Video creation', '视频创作', 'video|remotion|filmmaking'],
  ['audio', 'video-creation', 'Audio & transcription', '音频与转录', 'audio|speech|transcription|podcast'],
  ['pdf', 'document-processing', 'PDF & OCR', 'PDF 与 OCR', 'pdf|ocr'],
  ['document-conversion', 'document-processing', 'Document conversion', '文档转换', 'docx|markitdown|document conversion'],
  ['slides', 'presentation', 'Slides & decks', '幻灯片与演示', 'pptx|powerpoint|presentation|slides|slide deck'],
  ['spreadsheets', 'data', 'Spreadsheets', '电子表格', 'xlsx|csv|spreadsheet|excel'],
  ['databases', 'data', 'Databases & SQL', '数据库与 SQL', 'database|sql|postgres|supabase'],
  ['data-analysis', 'data', 'Data analysis', '数据分析', 'data analysis|data-analysis|analytics|statistics'],
  ['web-research', 'research', 'Web research', '网络研究', 'web search|web research|fact check'],
  ['academic-research', 'research', 'Academic research', '学术研究', 'academic|literature review|research paper'],
  ['browser-automation', 'automation', 'Browser automation', '浏览器自动化', 'browser|playwright|puppeteer'],
  ['web-scraping', 'automation', 'Web scraping', '网页抓取', 'scraping|scraper|crawl|crawler|extraction'],
  ['workflow-automation', 'automation', 'Workflow automation', '工作流自动化', 'workflow automation|n8n|zapier'],
  ['deployment', 'devops', 'Deployment & CI/CD', '部署与 CI/CD', 'deploy|deployment|ci/cd|vercel|cloudflare'],
  ['cloud', 'devops', 'Cloud infrastructure', '云基础设施', 'kubernetes|docker|terraform|cloud infrastructure'],
  ['rag', 'ai-knowledge', 'RAG & retrieval', 'RAG 与检索', 'rag|retrieval augmented'],
  ['knowledge-base', 'ai-knowledge', 'Knowledge & memory', '知识库与记忆', 'knowledge base|knowledge-base|agent memory'],
  ['machine-learning', 'ai-knowledge', 'Machine learning', '机器学习', 'machine learning|model training|fine-tuning'],
  ['seo', 'marketing', 'SEO', 'SEO', 'seo|search engine optimization'],
  ['content-marketing', 'marketing', 'Content & campaigns', '内容与推广', 'copywriting|campaign|newsletter|content marketing'],
  ['email-calendar', 'productivity', 'Email & calendar', '邮件与日程', 'email|calendar|scheduling'],
  ['notes', 'productivity', 'Notes & meetings', '笔记与会议', 'notes|meeting|notion'],
  ['security-audit', 'security', 'Security review', '安全审查', 'security|vulnerability|pentest|prompt injection'],
  ['finance-analysis', 'finance', 'Finance & trading', '金融与交易', 'finance|trading|stock|quant|backtesting'],
] as const
export const OUTPUT_RULES = [
  ['web', 'Websites & UI', '网站与 UI', 'website|web app|html|frontend|ui'],
  ['image', 'Images', '图像', 'image generation|image editing|imagegen|illustration|poster|canvas-design|png'],
  ['video', 'Video & audio', '视频与音频', 'video|audio|animation|remotion|podcast'],
  ['slides', 'Slides', '幻灯片', 'pptx|presentation|slides|powerpoint'],
  ['document', 'Documents', '文档', 'pdf|docx|document|report|markdown'],
  ['code', 'Code', '代码', 'code|coding|developer|testing|test|cli|script'],
  ['data', 'Data & tables', '数据与表格', 'data analysis|database|csv|xlsx|spreadsheet|analytics|sql'],
] as const
export function normalizeTopic(value: string | undefined) { return TOPIC_RULES.some(t => t[0] === value) ? value! : 'all' }
export function normalizeOutput(value: string | undefined) { return OUTPUT_RULES.some(t => t[0] === value) ? value! : 'all' }
export const facetPattern = word
export interface TaxonomyInput { github_repo?: string | null; name?: string; description?: string | null; tagline?: string | null; source_path?: string | null; category?: string; tags?: string[] | null }
export interface SkillTaxonomy { primary_category: SkillCategory; taxonomy_tags: string[]; output_types: string[]; taxonomy_version: number }
const compiledCategoryRules = CATEGORY_RULES.map(rule => ({ ...rule, regex: new RegExp(rule.pattern) }))
const compiledTopicRules = TOPIC_RULES.map(rule => ({ rule, regex: new RegExp(word(rule[4])) }))
const compiledOutputRules = OUTPUT_RULES.map(rule => ({ rule, regex: new RegExp(word(rule[3])) }))
// Exact package exceptions verified against the original instruction files.
// Never assign one category to every package in a repository.
export const EXACT_SOURCE_CATEGORIES: Record<string, SkillCategory> = {
 'obra/superpowers:skills/using-superpowers/SKILL.md': 'coding-agents',
 'obra/superpowers:skills/verification-before-completion/SKILL.md': 'coding-agents',
 'tt-a1i/archify:archify/SKILL.md': 'design-creative',
 'chengyi-ai/native-subtitle-quote-image:skills/native-subtitle-quote-image/SKILL.md': 'image-generation',
}
// This package consumes video frames but delivers JPG quote cards, not video.
export const EXACT_SOURCE_FACETS: Record<string, Pick<SkillTaxonomy, 'taxonomy_tags' | 'output_types'>> = {
 'chengyi-ai/native-subtitle-quote-image:skills/native-subtitle-quote-image/SKILL.md': {
   taxonomy_tags: ['image-editing'], output_types: ['image'],
 },
}
export function classifySkill(input: TaxonomyInput): SkillTaxonomy {
  const identity = `${input.name || ''} ${input.source_path || ''}`.toLowerCase().slice(0, 4000)
  const summary = `${input.description || ''} ${input.tagline || ''}`.toLowerCase().slice(0, 8000)
  const tags = (input.tags || []).join(' ').toLowerCase().slice(0, 4000)
  const fallback = normalizeSkillCategory(input.category || '') || 'other'
  let primary = fallback, best = 0
  for (const rule of compiledCategoryRules) {
    const re = rule.regex
    const score = (re.test(identity) ? 10 : 0) + (re.test(summary) ? 3 : 0) + (re.test(tags) ? 4 : 0) + (fallback === rule.category ? 2 : 0)
    if (score > best) { best = score; primary = rule.category }
  }
  const text = `${identity} ${summary} ${tags}`
  const source = `${(input.github_repo || '').toLowerCase()}:${input.source_path || ''}`
  primary = EXACT_SOURCE_CATEGORIES[source] || primary
  const facets = EXACT_SOURCE_FACETS[source]
  return { primary_category: primary, taxonomy_tags: facets ? [...facets.taxonomy_tags] : compiledTopicRules.filter(t => t.regex.test(text)).map(t => t.rule[0]), output_types: facets ? [...facets.output_types] : compiledOutputRules.filter(t => t.regex.test(text)).map(t => t.rule[0]), taxonomy_version: TAXONOMY_VERSION }
}
export function skillTaxonomy(input: TaxonomyInput & Partial<SkillTaxonomy>): SkillTaxonomy {
  return input.taxonomy_version === TAXONOMY_VERSION && input.primary_category
    ? { primary_category: input.primary_category, taxonomy_tags: input.taxonomy_tags || [], output_types: input.output_types || [], taxonomy_version: TAXONOMY_VERSION }
    : classifySkill(input)
}
export const LEGACY_CATEGORY_MAP = legacy

export function legacyCategoryTopic(category: string) {
 const key = normalizeTaxonomyKey(category)
 return ['web-scraping','browser-automation'].includes(key) ? key : key === 'rag' || key === 'rag-knowledge' ? 'rag' : 'all'
}
