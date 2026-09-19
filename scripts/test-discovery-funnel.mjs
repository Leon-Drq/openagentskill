import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { getSearchTerms, normalizeExactSearchQuery } = await import('../lib/search-query.ts')
const { catalogPageNumber, catalogStars, catalogSortColumn } = await import('../lib/skills/catalog-query.ts')
const { handoffCopy } = await import('../lib/i18n/handoff-copy.ts')
const { directoryLabel } = await import('../lib/i18n/directory-copy.ts')

// 100 task-query retrieval regressions. These are deterministic vocabulary
// checks, NOT a claim that 100 real-world tasks or installations were executed.
const families = [
  ['localization', ['中国市场本地化','SaaS 中国本地化','面向中国的产品','进入中国市场','软件中文化']],
  ['i18n', ['网站本地化','产品国际化','多语言网站','多语言文档','界面国际化']],
  ['presentation', ['制作演示文稿','生成幻灯片','融资路演','工作汇报','研究简报']],
  ['video', ['产品演示视频','视频剪辑','制作短片','生成字幕','视频产品介绍']],
  ['frontend', ['设计网页','制作网站','创建界面','产品落地页','网页排版']],
  ['scraping', ['网页爬虫','抓取价格','网站采集','论文抓取','新闻采集']],
  ['research', ['论文分析','文献整理','科研助手','研究报告','研究资料']],
  ['document', ['解析文档','企业知识库','资料检索','文档转 markdown','知识库问答']],
  ['review', ['代码审查','代码审核','代码评审','自动代码审查','团队代码审核']],
  ['testing', ['单元测试','修复错误','调试程序','自动化测试','接口测试']],
  ['database', ['数据库迁移','优化查询语句','清理数据表','数据库文档','生成数据表']],
  ['analysis', ['数据分析','生成图表','制作报表','销售数据分析','报表自动化']],
  ['logo', ['品牌设计','公司标志','产品吉祥物','品牌视觉','设计标志']],
  ['marketing', ['内容营销','用户增长','产品推广','营销计划','增长策略']],
  ['slides', ['create slides','edit slides','research slides','slides for a demo','convert slides']],
  ['video', ['product video','video editing','video captions','video generation','video workflow']],
  ['research', ['academic research','research paper','research sources','research workflow','research report']],
  ['scraping', ['web scraping','scraping prices','scraping tables','scraping workflow','scraping websites']],
  ['localization', ['China localization','SaaS localization','localization workflow','product localization','Chinese localization']],
  ['sql', ['optimize sql','sql query','sql migration','sql schema','sql review']],
]
let checked = 0
for (const [expected, queries] of families) for (const query of queries) {
  assert.ok(getSearchTerms(normalizeExactSearchQuery(query)).includes(expected), query)
  checked++
}
assert.equal(checked, 100)
assert.equal(catalogPageNumber('31'), 31, 'Full directory must not stop at candidate page 30')
assert.equal(catalogPageNumber('2045'), 2045)
for (const value of ['NaN', 'Infinity', '-4', '0']) assert.equal(catalogPageNumber(value), 1)
assert.equal(catalogStars(Infinity), 0)
assert.equal(catalogStars(-1), 0)
assert.equal(catalogSortColumn('arbitrary-sql'), 'github_stars')
for (const locale of ['en','zh','ja','ko','es','de','fr','id']) {
  for (const key of ['next','terminal','evidence','failed']) assert.ok(handoffCopy(locale,key).trim())
  for (const key of ['fullCatalog','browseMode','selectionNote','catalogNote','searchNote','catalogUnavailable']) assert.notEqual(directoryLabel(locale,key),key)
}
const read = path => readFileSync(path,'utf8')
const db = read('lib/db/skills.ts')
const catalog = db.slice(db.indexOf('const getCachedCatalogPage'),db.indexOf('export async function searchSkillsStrict'))
assert.match(catalog,/\.or\(PUBLIC_SKILL_FILTER\)/)
assert.match(catalog,/\.order\('slug', \{ ascending: true \}\)\.range\(/)
assert.match(catalog,/if \(error\) throw error/)
assert.doesNotMatch(catalog,/createAdminClient|insert\(|update\(|CURATED_SKILL_SNAPSHOT/)
const server = read('app/skills/page.tsx')
assert.match(server,/index: isCanonicalEnglishDirectory/)
assert.match(server,/const canonical = `\$\{SITE_URL\}\/skills`/)
assert.match(server,/catalogMode \? catalogResult!\.records : mergeSkillRecords/)
const client = read('components/skills-page-client.tsx')
assert.match(client,/data-directory-modes/)
assert.match(client,/data-directory-scope/)
assert.match(client,/has_query: Boolean\(query\)/)
assert.doesNotMatch(client,/trackAnalyticsEvent\([^\n]*\{[^\n]*\b(search_term|query)\s*:/)
assert.match(read('components/skill-install-targets.tsx'),/data-handoff-next-step/)
assert.match(read('lib/install-targets.ts'),/mark anything not documented as unknown rather than free or compatible/)
console.log('Discovery funnel: 100 retrieval vocabulary cases, catalog pagination, publication gates, SEO, privacy and eight locales passed.')
