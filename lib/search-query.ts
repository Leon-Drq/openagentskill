const SEARCH_STOP_WORDS = new Set([
  'about', 'agent', 'agents', 'and', 'as', 'for', 'from', 'into', 'need', 'right', 'skill', 'skills',
  'that', 'the', 'this', 'use', 'using', 'want', 'what', 'when', 'with',
])

// Retrieval must understand the same common tasks as the ranker. This bridge
// is deterministic: no model call, translation service or per-query charge.
const TASK_TERMS: Array<[RegExp, string[]]> = [
  [/中国市场|中国本地化|面向中国|进入中国|中文化/, ['china', 'chinese', 'localization']],
  [/本地化|国际化|多语言/, ['localization', 'i18n', 'translation']],
  [/演示文稿|幻灯片|路演|汇报|简报|可编辑.*ppt/i, ['presentation', 'pptx', 'slides']],
  [/产品.*视频|视频.*产品/, ['product', 'demo', 'video']],
  [/视频|剪辑|短片|字幕/, ['video', 'editing', 'captions']],
  [/网页|网站|界面|落地页/, ['web', 'frontend', 'design']],
  [/爬虫|抓取|采集/, ['scraping', 'crawler', 'extraction']],
  [/论文|文献|科研|研究/, ['research', 'paper', 'academic']],
  [/文档|知识库|检索/, ['document', 'rag', 'retrieval']],
  [/代码审查|代码审核|代码评审/, ['code', 'review']],
  [/测试|修复|调试/, ['testing', 'debugging']],
  [/数据库|查询语句|数据表/, ['database', 'sql']],
  [/数据分析|图表|报表/, ['data', 'analysis', 'chart']],
  [/品牌|标志|吉祥物/, ['logo', 'brand', 'mascot']],
  [/营销|增长|推广/, ['marketing', 'growth']],
]

export function getSearchTerms(normalizedQuery: string) {
  const taskTerms = TASK_TERMS.filter(([pattern]) => pattern.test(normalizedQuery)).flatMap(([, terms]) => terms)
  const terms = Array.from(
    new Set(
      [...taskTerms, ...normalizedQuery
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2 && !SEARCH_STOP_WORDS.has(term))]
    )
  ).slice(0, 10)

  return terms.length > 0 ? terms : [normalizedQuery]
}

export function normalizeExactSearchQuery(query: string) {
  return query
    .trim()
    .replace(/[%_,{},()]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 180)
}
