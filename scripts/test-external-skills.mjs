import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { EXTERNAL_SKILLS, ExternalSkillSchema, validateExternalCatalog, searchExternalSkills, getExternalSkill, externalSkillDiscoveryRecord, isMissingExternalSkillPath } from '../lib/skills/external-catalog.ts'

const entry = getExternalSkill('redskill-curtain-branch-swallow')
assert.ok(entry)
assert.equal(entry.author.name, '流白Livo')
assert.equal(entry.license, 'CC-BY-NC-4.0')
assert.equal(entry.version, '1.0.0')
assert.ok(entry.licenseNote.en.includes('share-alike'))
for (const query of ['p5.js', 'p5js', '雨帘', '花枝', '飞燕', '流白Livo', 'skill-curtain-branch-swallow', 'p5-animation', 'RedSkill', 'RAIN BRANCHES']) {
  assert.equal(searchExternalSkills(query).length, 1, query)
}
assert.equal(searchExternalSkills('unrelated finance').length, 0)
assert.equal(getExternalSkill('missing'), undefined)
for (const path of ['/skills', '/skills/external', `/skills/external/${entry.slug}`, `/skills/external/${entry.slug}/`]) assert.equal(isMissingExternalSkillPath(path), false)
for (const path of ['/skills/external/missing', '/skills/external/%GG']) assert.equal(isMissingExternalSkillPath(path), true)
assert.equal(searchExternalSkills('').length, EXTERNAL_SKILLS.length)
assert.throws(() => validateExternalCatalog([entry, entry]), /Duplicate/)
for (const changes of [
  { aiReviewed: true }, { runtimeVerified: true }, { autoInstallAllowed: true },
  { github_stars: 500 }, { install_command: 'npx fake' },
  { sourceUrl: 'javascript:alert(1)' }, { sourceUrl: 'http://example.com' },
  { sourceUrl: 'https://user:pass@example.com/' }, { sourceUrl: 'https://example.com/a?sign=secret' },
  { bundleSha256: 'not-a-hash' }, { publication: { channel: 'owner-curated-external', reason: '' } },
]) assert.equal(ExternalSkillSchema.safeParse({ ...entry, ...changes }).success, false)
const record = externalSkillDiscoveryRecord(entry)
assert.equal(record.auto_install_allowed, false)
assert.equal(record.human_review_required, true)
assert.equal(record.runtime_verified, false)
assert.equal(record.ai_reviewed, false)
assert.equal(record.install_command, null)
assert.equal(record.github_stars, undefined)
assert.equal(record.commercial_use, 'not-permitted-without-separate-permission')
assert.match(record.url, /\/skills\/external\//)
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
assert.match(read('proxy.ts'), /isMissingExternalSkillPath\(pathname\)/)
const route = read('app/api/external-skills/[slug]/route.ts')
assert.match(route, /export async function GET/)
assert.doesNotMatch(route, /export async function (POST|PUT|DELETE)|createAdminClient/)
const routeExports = {}
new Function('exports', 'require', ts.transpileModule(route, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(routeExports, name => {
  assert.equal(name, '@/lib/skills/external-catalog')
  return { getExternalSkill, externalSkillDiscoveryRecord }
})
const response = await routeExports.GET(new Request('https://example.com'), { params: Promise.resolve({ slug: entry.slug }) })
assert.equal(response.status, 200)
assert.equal((await response.json()).auto_install_allowed, false)
assert.equal(response.headers.get('x-robots-tag'), 'noindex')
assert.equal((await routeExports.GET(new Request('https://example.com'), { params: Promise.resolve({ slug: 'missing' }) })).status, 404)
const page = read('app/skills/external/[slug]/page.tsx')
assert.match(page, /notFound\(\)/)
assert.match(page, /export const dynamicParams = false/)
assert.match(page, /alternates: \{ canonical: url \}/)
assert.doesNotMatch(page, /aggregateRating|install_command|<iframe|<video|<img/)
assert.match(read('app/skills/page.tsx'), /externalDiscovery=\{<ExternalSkillResults query=\{query\}/)
assert.match(read('lib/seo/sitemap.ts'), /EXTERNAL_SKILLS\.map/)
for (const path of ['lib/skills/owner-publication.ts', 'app/api/admin/skills/publish/route.ts']) {
  assert.doesNotMatch(read(path), /EXTERNAL_SKILLS|external-catalog/, 'GitHub owner lane unchanged')
}
console.log('External skill catalog, safe links, licensing, discovery and publication boundaries passed.')
