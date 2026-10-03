import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { register } from 'node:module'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { EXTERNAL_SKILLS, ExternalSkillSchema, validateExternalCatalog, searchExternalSkills, getExternalSkill, externalSkillDiscoveryRecord, isMissingExternalSkillPath } = await import('../lib/skills/external-catalog.ts')
const { externalSourceHref, externalSourceRel } = await import('../lib/skills/external-outbound.ts')

const selectedSources = [
  'bs-grokbot-avatar', 'bs-field-notes-deck', 'bs-scattered-cards-magazine',
  'bs-cadence-marketing-landing', 'bs-inclusive-cutpaper-deck', 'bs-sky-glass-deck',
  'bs-claude-style-illustration', 'bs-research-talk-deck',
]
const skillryEntries = EXTERNAL_SKILLS.filter(value => value.provider === 'skillry')
assert.ok(skillryEntries.length >= 42, 'Full eligible public catalog, not the previous Featured subset')
for (const source of selectedSources) assert.ok(skillryEntries.some(value=>value.sourceUrl.endsWith('/'+source)))
assert.equal(searchExternalSkills('Skillry').length, skillryEntries.filter(e=>e.active).length)
assert.ok(getExternalSkill('skillry-dot-avatar-maker'))
assert.ok(skillryEntries.some(value=>value.listingEvidence.priceUsdCents>0 && !value.listingEvidence.featured))
assert.doesNotThrow(() => validateExternalCatalog(skillryEntries), 'Null bundle hashes do not count as duplicate packages')
for (const item of skillryEntries) {
  assert.ok(item.listingEvidence.priceUsdCents >= 0)
  assert.ok(item.listingEvidence.downloadCount > 10)
  assert.equal(typeof item.listingEvidence.featured, 'boolean')
  assert.equal(item.bundleSha256, null, 'Public page checksum is not a package checksum')
  assert.equal(item.examples.length, 0, 'Preview metadata never invents execution evidence')
  const data = externalSkillDiscoveryRecord(item)
  assert.equal(data.author, null, 'The provider is not an identified individual author')
  assert.equal(data.publisher.name, 'Skillry')
  assert.equal(data.install_command, null)
  assert.equal(data.runtime_demo, null)
  assert.equal(data.examples.length, item.previewImages.length)
  for (const example of data.examples) {
    assert.equal(example.attribution, 'Skillry')
    assert.equal(example.runtime_verified, false)
    assert.equal(new URL(example.image_url).origin, 'https://skillry.dev')
  }
  assert.equal(data.ai_reviewed, false)
  assert.equal(data.source_url, item.sourceUrl)
  assert.equal(new URL(data.source_url).search, '', 'Source evidence stays canonical')
  assert.equal(new URL(data.acquisition_url).searchParams.get('via'), 'openagentskill')
  assert.equal(new URL(data.acquisition_url).pathname, new URL(item.sourceUrl).pathname)
  assert.equal(externalSourceRel(item.sourceUrl), 'sponsored noopener noreferrer')
  for (const changes of [
    { aiReviewed: true }, { runtimeVerified: true }, { autoInstallAllowed: true },
    { previewImages: [] }, { previewImages: ['https://example.com/image.webp'] },
    { previewImages: [item.previewImages[0] + '&token=secret'] },
    { sourceUrl: `${item.sourceUrl}?via=openagentskill` }, { sourceUrl: 'https://example.com/skill' },
    { bundleSha256: 'a'.repeat(64) }, { license: 'MIT' }, { runtimeDemo: {} },
    { listingEvidence: { ...item.listingEvidence, priceUsdCents: -1 } },
    { listingEvidence: { ...item.listingEvidence, downloadCount: 10 } },
  ]) assert.equal(ExternalSkillSchema.safeParse({ ...item, ...changes }).success, false)
}
assert.throws(() => validateExternalCatalog([skillryEntries[0], { ...skillryEntries[1], sourceUrl: skillryEntries[0].sourceUrl }]), /Duplicate external sourceUrl/)
for (const source of ['https://example.com/a', 'https://skillry.dev.evil.example/a', 'http://skillry.dev/a', 'https://user:pass@skillry.dev/a', 'javascript:alert(1)', 'invalid']) {
  assert.equal(externalSourceHref(source), source, 'Tracking is restricted to the authorized HTTPS provider')
}
assert.equal(externalSourceHref('https://skillry.dev'), 'https://skillry.dev/?via=openagentskill')
assert.equal(externalSourceHref('https://skillry.dev/skills/a?lang=zh&via=old#about'), 'https://skillry.dev/skills/a?lang=zh&via=openagentskill#about')
assert.equal(externalSourceHref(externalSourceHref(skillryEntries[0].sourceUrl)), externalSourceHref(skillryEntries[0].sourceUrl), 'No duplicate tracking parameters')

const entry = getExternalSkill('redskill-curtain-branch-swallow')
assert.ok(entry)
assert.equal(entry.author.name, '流白Livo')
assert.equal(entry.license, 'CC-BY-NC-4.0')
assert.equal(entry.version, '1.0.0')
assert.equal(externalSourceHref(entry.sourceUrl), entry.sourceUrl, 'RedSkill links unchanged')
assert.equal(externalSourceRel(entry.sourceUrl), 'noopener noreferrer')
assert.ok(entry.licenseNote.en.includes('share-alike'))
for (const query of ['p5.js', 'p5js', '雨帘', '花枝', '飞燕', '流白Livo', 'skill-curtain-branch-swallow', 'p5-animation', 'RedSkill', 'RAIN BRANCHES']) {
  assert.equal(searchExternalSkills(query).length, 1, query)
}
assert.equal(searchExternalSkills('unrelated finance').length, 0)
assert.equal(getExternalSkill('missing'), undefined)
for (const path of ['/skills', '/skills/external', `/skills/external/${entry.slug}`, `/skills/external/${entry.slug}/`]) assert.equal(isMissingExternalSkillPath(path), false)
for (const path of ['/skills/skillry-missing', '/skills/redskill-missing', '/skills/external/missing', '/skills/external/%GG']) assert.equal(isMissingExternalSkillPath(path), true)
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
assert.equal(record.runtime_demo.security_certification, false)
assert.equal(record.runtime_demo.duration_seconds, 21)
assert.equal(entry.runtimeDemo.displayPermission, 'site-owner-confirmed-noncommercial-display')
assert.equal(createHash('sha256').update(readFileSync(new URL('../public' + entry.runtimeDemo.video, import.meta.url))).digest('hex'), entry.runtimeDemo.sha256)
assert.ok(readFileSync(new URL('../public' + entry.runtimeDemo.poster, import.meta.url)).length > 1000)
assert.equal(externalSkillDiscoveryRecord({ ...entry, runtimeDemo: undefined }).runtime_demo, null)
for (const changes of [{ video: '//example.com/a.mp4' }, { poster: '/media/external/../a.webp' }, { displayPermission: 'assumed' }, { durationSeconds: -1 }]) {
  assert.equal(ExternalSkillSchema.safeParse({ ...entry, runtimeDemo: { ...entry.runtimeDemo, ...changes } }).success, false)
}
assert.equal(record.url, 'https://www.openagentskill.com/skills/' + entry.slug)
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
const page = read('components/catalog-skill-content.tsx')
assert.match(page, /notFound\(\)/)
assert.match(page, /<section id="showcase"/)
assert.match(page, /alternates: \{ canonical: url \}/)
assert.doesNotMatch(page, /aggregateRating|install_command|<iframe|<img|autoPlay/)
assert.match(page, /<video controls playsInline preload="none"/)
assert.match(page, /'@type': 'VideoObject'/)
assert.match(page, /aria-describedby="runtime-caption"/)
for (const lang of ['en', 'zh']) assert.match(read(`public/media/external/p5-animation/captions-${lang}.vtt`), /^WEBVTT/)
assert.match(read('app/skills/content.tsx'), /mergeProviderCatalogPage/)
assert.match(read('lib/seo/sitemap.ts'), /EXTERNAL_SKILLS\.filter/)
for (const path of ['lib/skills/owner-publication.ts', 'app/api/admin/skills/publish/route.ts']) {
  assert.doesNotMatch(read(path), /EXTERNAL_SKILLS|external-catalog/, 'GitHub owner lane unchanged')
}
console.log('External skill catalog, safe links, licensing, discovery and publication boundaries passed.')

assert.match(read('next.config.mjs'), /source: '\/skills\/external\/:slug', destination: '\/skills\/:slug', permanent: true/)
assert.doesNotMatch(read('components/catalog-skill-content.tsx'), /name: 'External Skills'/)
