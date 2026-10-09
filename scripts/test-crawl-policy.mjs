import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { register } from 'node:module'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { crawlLinkRel } = await import('../lib/seo/crawl-policy.ts')
const { requestedDirectoryPage } = await import('../lib/skills/pagination.ts')
const { repairStoredSkillSummary } = await import('../lib/skills/source-summary.ts')
const { publicQueryRoute, hasContentQuery } = await import('../lib/public-page-routing.ts')
const { default: nextConfig } = await import('../next.config.mjs')

for (const path of ['/skills?q=test&tag=pdf', '/zh/skills?category=finance', '/skills?page=2179', '/resolve?task=code', '/compare?skills=a,b', '/api/badge/example?metric=trust', '/api/agent/skills/example', '/skills/example?lang=ko']) {
  assert.equal(crawlLinkRel(path), 'nofollow', path)
  assert.equal(crawlLinkRel(path, 'prev noopener'), 'prev noopener nofollow')
  assert.equal(crawlLinkRel(path, 'nofollow'), 'nofollow')
}
for (const path of ['/skills', '/zh/skills', '/skills/example', '/skills/example?utm_source=github&ref=github', '/use-cases/pdf', 'https://github.com/acme/skills?q=x', '/sitemap.xml']) assert.equal(crawlLinkRel(path), undefined, path)
for (const query of ['utm_source=github&ref=github', '_rsc=abc', 'gclid=123', '']) {
  assert.equal(hasContentQuery(new URLSearchParams(query)), false)
  assert.equal(publicQueryRoute('/skills/example', new URLSearchParams(query)), null)
}
assert.equal(publicQueryRoute('/skills/example', new URLSearchParams('lang=zh&utm_source=github')), '/render-query/skills/example')
for (const value of ['0', '-1', '1.5', '1e3', 'NaN', '', '01', ['1', '2'], '9007199254740992']) assert.equal(requestedDirectoryPage(value), null)
assert.equal(requestedDirectoryPage(undefined), 1)
assert.equal(requestedDirectoryPage('2'), 2)
assert.equal(requestedDirectoryPage('2179'), 2179, 'Bounds come from the actual result count, not an arbitrary cap')

const source = '---\nname: audit\ndescription: >-\n  Inspect source files and\n  report concrete findings.\n---\n# Instructions'
const row = { description: '>-', tagline: '>-', long_description: source, ai_review_approved: false, quality_score: 0, listing_status: 'owner_published', source_content_hash: 'unchanged' }
const repaired = repairStoredSkillSummary(row)
assert.equal(repaired.description, 'Inspect source files and report concrete findings.')
assert.deepEqual({ ...repaired, description: row.description, tagline: row.tagline }, row)
assert.equal(repairStoredSkillSummary({ ...row, description: 'Manually edited', tagline: 'Useful summary' }).description, 'Manually edited')
assert.equal(repairStoredSkillSummary({ ...row, long_description: '# No frontmatter' }).description, '>-')
assert.deepEqual(repairStoredSkillSummary(repaired), repaired)

const headers = await nextConfig.headers()
assert.ok(headers.some(rule => rule.source === '/api/:path*' && rule.headers.some(header => header.key === 'X-Robots-Tag' && header.value === 'noindex, follow')))
assert.equal(existsSync('app/loading.tsx'), false, 'A root fallback must not flush HTTP 200 before missing-document checks')
const robots = readFileSync('public/robots.txt', 'utf8')
const searchGroup = robots.split('User-agent: Googlebot')[1].split('User-agent: OAI-SearchBot')[0]
for (const locale of ['', '/zh', '/ja', '/ko', '/es', '/de', '/fr', '/id']) assert.ok(searchGroup.includes(`Disallow: ${locale}/skills?`))
assert.ok(!searchGroup.includes('Disallow: /api/'), 'Already-discovered APIs must remain crawlable to process noindex')
console.log('Crawl policy: query graph, attribution/cache, page validation, API noindex and source-summary integrity passed.')
