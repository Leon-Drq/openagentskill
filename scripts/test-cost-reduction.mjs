import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { publicCachedRoute } from '../lib/public-cached-routing.ts'
import { automaticPublicationCapacityPerDay, PUBLICATION_DAILY_TARGET, PUBLICATION_RUNS_PER_DAY } from '../lib/indexer/intake-policy.ts'

const locales = ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']
for (const locale of locales) {
  const path = locale === 'en' ? '/skills' : `/${locale}/skills`
  for (const query of ['', '_rsc=one', 'utm_source=newsletter&ref=source', '_rsc=two&utm_campaign=a']) {
    assert.equal(publicCachedRoute(path, new URLSearchParams(query)), `/cached-public/${locale}/skills`)
  }
  for (const query of ['q=code', 'category=finance&access=free', 'page=11', 'unknown=random']) {
    assert.equal(publicCachedRoute(path, new URLSearchParams(query)), null, 'Unbounded filters must never enter the public page cache')
  }
  for (const suffix of ['', '/audit', '/evals']) {
    assert.equal(publicCachedRoute('/skills/example' + suffix, new URLSearchParams(`lang=${locale}&utm_source=x&_rsc=y`)), `/cached-public/${locale}/skills/example${suffix}`)
  }
  for (const page of ['contact', 'sponsor']) assert.equal(publicCachedRoute('/' + page, new URLSearchParams('lang=' + locale)), `/cached-public/${locale}/${page}${locale === 'en' ? '-variant' : ''}`)
}
assert.equal(publicCachedRoute('/contact', new URLSearchParams('_rsc=one')), '/cached-public/en/contact')
assert.equal(publicCachedRoute('/contact', new URLSearchParams('utm_source=x')), '/cached-public/en/contact-variant')
for (const path of ['/profile', '/creator', '/api/payments/library', '/api/skills/engagement', '/api/agent/skills/example', '/skills/new', '/cached-public/en/skills']) {
  assert.equal(publicCachedRoute(path, new URLSearchParams('lang=zh')), null, 'Private, reserved and internal routes cannot be shared')
}
for (const query of ['lang=xx', 'lang=zh&lang=en', 'lang=zh&q=code', 'lang=zh&unknown=1']) assert.equal(publicCachedRoute('/skills/example', new URLSearchParams(query)), null)

// Execute the real display cache wrappers with deterministic analysis and a
// serializing Data Cache double. No database, credentials or review mutations.
const store = new Map(), policies = []
let computations = 0, unavailable = false
const analysis = (record, stats) => {
  if (unavailable) throw Error('analysis unavailable')
  return { slug: record.slug, source: record.source_content_hash, stats, generated_at: ++computations }
}
const deps = {
  'next/cache': { unstable_cache: (fn, keyParts, options) => {
    policies.push(options)
    return async (...args) => {
      const key = JSON.stringify([keyParts, args])
      if (!store.has(key)) store.set(key, JSON.stringify(await fn(...args)))
      return JSON.parse(store.get(key))
    }
  } },
  '@/lib/audits': { buildSkillAudit: analysis },
  '@/lib/skill-evals': { buildSkillEvalProfile: analysis },
}
const mod = {}
new Function('exports', 'require', ts.transpileModule(readFileSync('lib/skills/public-analysis.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(mod, name => { assert.ok(name in deps); return deps[name] })
const record = { slug: 'example', source_content_hash: 'first', ai_review_approved: false }
const first = await mod.getPublicAudit(record, null)
assert.deepEqual(await mod.getPublicAudit({ ...record }, null), first, 'Same source retains its actual computation time instead of rewriting timestamps per visit')
first.generated_at = 999
assert.equal((await mod.getPublicAudit(record, null)).generated_at, 1, 'Caller mutations cannot change the cached analysis')
assert.equal((await mod.getPublicAudit({ ...record, source_content_hash: 'second' }, null)).generated_at, 2, 'Changed source recomputes')
assert.equal((await mod.getPublicAudit(record, { total_events: 1 })).generated_at, 3, 'Changed statistics recompute')
const evaluation = await mod.getPublicEval(record, { task: 'one' })
assert.deepEqual(await mod.getPublicEval(record, { task: 'one' }), evaluation)
assert.notEqual((await mod.getPublicEval(record, { task: 'two' })).generated_at, evaluation.generated_at)
unavailable = true
await assert.rejects(() => mod.getPublicAudit({ ...record, source_content_hash: 'error' }, null))
unavailable = false
await mod.getPublicAudit({ ...record, source_content_hash: 'error' }, null)
assert.equal(record.ai_review_approved, false, 'Display caching cannot approve a review')
assert.ok(policies.every(policy => policy.tags.includes('public-skill:example') && policy.revalidate === 3600))

const robots = readFileSync('public/robots.txt', 'utf8').replace(/\r\n/g, '\n')
const group = bot => robots.split('User-agent: ' + bot + '\n')[1].split('\nUser-agent: ')[0]
assert.match(group('ClaudeBot'), /Crawl-delay: 10/)
for (const bot of ['ClaudeBot', 'GPTBot']) assert.match(group(bot), /Disallow: \/\*\?/)
for (const bot of ['Claude-User', 'Claude-SearchBot', 'ChatGPT-User', 'OAI-SearchBot']) assert.doesNotMatch(group(bot), /Disallow|Crawl-delay/)
const cron = JSON.parse(readFileSync('vercel.json', 'utf8')).crons
assert.equal(cron.find(job => job.path === '/api/cron/skill-submissions').schedule, '*/5 * * * *', 'User submissions retain their existing queue cadence')
const publication = cron.find(job => job.path === '/api/cron/skill-candidates-publish').schedule.split(' ')
assert.equal(publication[0].split(',').length * 24, PUBLICATION_RUNS_PER_DAY)
assert.ok(automaticPublicationCapacityPerDay() >= PUBLICATION_DAILY_TARGET * 1.5, 'Batched publication retains retry headroom and the existing daily ceiling')
console.log('Cost reduction: finite locale caches, query/private isolation, stable computation timestamps, source/stat refresh, error recovery and search/user-agent access passed.')
