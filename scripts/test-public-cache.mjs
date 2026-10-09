import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { readFileSync } from 'node:fs'
import { register, createRequire } from 'node:module'
import ts from 'typescript'
import { publicQueryRoute, hasContentQuery } from '../lib/public-page-routing.ts'
import { createBoundedContentMemo } from '../lib/bounded-content-memo.ts'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const detailWrapper = read('app/skills/[slug]/page.tsx')
assert.doesNotMatch(detailWrapper, /await.*searchParams|props\.searchParams|searchParams:\s*Promise</)
assert.match(detailWrapper, /revalidate = 300/)
assert.match(detailWrapper, /searchParams=\{Promise.resolve\(\{\}\)\}/)
assert.match(read('app/skills/[slug]/page.tsx'), /generateStaticParams\(\) \{ return \[\] \}/)
assert.doesNotMatch(read('components/skills-page-client.tsx'), /const .* = useSearchParams\(/, 'cached directory must keep SSR content, not a loading bailout')
assert.match(read('components/skills-page-client.tsx'), /directoryHref\(pathname, queryString,/)
assert.match(read('app/skills/content.tsx'), /key === 'lang' && locale !== defaultLocale/, 'localized reset must return to the cacheable path without an injected lang query')
assert.match(read('app/skills/content.tsx'), /if \(requireHealthy && degraded && visibleRecords.length === 0\) \{\s*throw new Error/, 'do not persist an empty outage page')
for (const path of ['/skills/example', '/skills/example/audit', '/skills/example/evals', '/ja/docs']) {
  assert.equal(publicQueryRoute(path, new URLSearchParams()), null)
  assert.equal(publicQueryRoute(path, new URLSearchParams('_rsc=prefetch')), null)
  assert.equal(publicQueryRoute(path, new URLSearchParams('q=design&page=2')), '/render-query' + path)
}
for (const path of ['/skills', '/zh/skills', '/ja/skills', '/ko/skills', '/es/skills', '/de/skills', '/fr/skills', '/id/skills', '/skills/new', '/skills/external', '/skills/external/test', '/api/skills/search', '/profile', '/zz/skills']) {
  assert.equal(publicQueryRoute(path, new URLSearchParams('q=test')), null)
}

// Verify actual proxy routing/matcher, not just source text. Dependencies with
// catalogue/network access are replaced; no auth request or DB write occurs.
const require = createRequire(import.meta.url)
globalThis.AsyncLocalStorage ??= AsyncLocalStorage
const { NextRequest, NextResponse } = require('next/server')
const { unstable_doesMiddlewareMatch: unstable_doesProxyMatch } = require('next/experimental/testing/server')
const exports = {}
let authCalls = 0
const deps = {
  '@supabase/ssr': { createServerClient: () => ({ auth: { getUser: async () => { authCalls++ } } }) },
  'next/server': { NextResponse },
  '@/lib/skill-slug-aliases': { getCanonicalSkillSlug: slug => slug === 'alias' ? 'canonical' : slug },
  '@/lib/showcase': { isMissingShowcasePath: () => false },
  '@/lib/creator-directory': { isMissingFeaturedCreatorPath: () => false },
  '@/lib/rankings': { isMissingRankingPath: () => false },
  '@/lib/skills/external-catalog': { isMissingExternalSkillPath: () => false },
  '@/lib/public-page-routing': { publicQueryRoute, hasContentQuery },
}
new Function('exports', 'require', ts.transpileModule(read('proxy.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(exports, name => { assert.ok(name in deps, name); return deps[name] })
for (const url of ['/privacy', '/blog', '/showcase/a.card.webp', '/robots.txt', '/_next/static/a.js']) {
  // Gallery currently also checks missing assets, so its explicit prefix stays.
  if (url.startsWith('/showcase/')) continue
  assert.equal(unstable_doesProxyMatch({ config: exports.config, nextConfig: {}, url }), false, url)
}
for (const url of ['/skills', '/skills/a', '/es/docs', '/profile', '/api/claims', '/contact?lang=zh', '/render-query/skills']) {
  assert.equal(unstable_doesProxyMatch({ config: exports.config, nextConfig: {}, url }), true, url)
}
const request = path => new NextRequest('https://www.openagentskill.com' + path)
const result = await exports.proxy(request('/skills?q=design&sort=stars&page=2'))
assert.equal(result.headers.get('x-middleware-rewrite'), null, 'filtered directory keeps the unfiltered route segment')
assert.equal((await exports.proxy(request('/zh/skills?category=design-creative'))).headers.get('x-middleware-rewrite'), null)
assert.equal((await exports.proxy(request('/ja/docs?q=test'))).headers.get('x-middleware-rewrite'), 'https://www.openagentskill.com/render-query/ja/docs?q=test')
assert.equal((await exports.proxy(request('/skills?_rsc=abc'))).headers.get('x-middleware-rewrite'), null)
assert.equal((await exports.proxy(request('/skills?lang=zh&q=test'))).headers.get('location'), 'https://www.openagentskill.com/zh/skills?q=test')
assert.equal((await exports.proxy(request('/skills/alias?q=test'))).headers.get('location'), 'https://www.openagentskill.com/skills/canonical?q=test')
assert.equal((await exports.proxy(request('/skills/a?lang=zh'))).headers.get('x-robots-tag'), 'noindex, follow')
const tracked = await exports.proxy(request('/skills/a?utm_source=github&ref=github'))
assert.equal(tracked.headers.get('x-robots-tag'), null)
assert.equal(tracked.headers.get('x-middleware-rewrite'), null)
assert.equal((await exports.proxy(request('/render-query/skills'))).status, 404)
for (const kind of ['audit', 'evals']) {
  const report = `/skills/example/${kind}`
  assert.equal((await exports.proxy(request(report))).headers.get('x-middleware-rewrite'), null)
  assert.equal((await exports.proxy(request(report + '?lang=zh'))).headers.get('x-middleware-rewrite'), `https://www.openagentskill.com/render-query${report}?lang=zh`)
  assert.equal((await exports.proxy(request('/render-query' + report))).status, 404)
  const wrapper = read(`app/skills/[slug]/${kind}/page.tsx`)
  assert.match(wrapper, /generateStaticParams\(\) \{ return \[\] \}/)
  assert.doesNotMatch(wrapper, /await.*searchParams|searchParams:\s*Promise</)
}
assert.equal(authCalls, 0)
await exports.proxy(request('/profile'))
assert.equal(authCalls, 1)

let now = 0, calls = 0
const memo = createBoundedContentMemo({ version: 'test', ttlMs: 60, maxEntries: 2, maxBytes: 1000, now: () => now })
const compute = () => ({ count: ++calls })
const original = memo({ slug: 'a', version: 1 }, compute)
original.count = 999
assert.equal(memo({ slug: 'a', version: 1 }, compute).count, 1, 'callers cannot mutate cache')
memo({ slug: 'a', version: 2 }, compute)
assert.equal(calls, 2, 'same slug with changed content must recompute')
memo({ slug: 'b' }, compute)
memo({ slug: 'a', version: 1 }, compute)
assert.equal(calls, 4, 'LRU entry cap enforced')
now = 61
memo({ slug: 'a', version: 1 }, compute)
assert.equal(calls, 5, 'time-dependent scores expire')
assert.throws(() => memo('error', () => { throw Error('test') }))
assert.equal(memo('error', () => 'recovered'), 'recovered')
const tiny = createBoundedContentMemo({ version: 'test', ttlMs: 60, maxEntries: 2, maxBytes: 2, now: () => now })
tiny('oversize', compute); tiny('oversize', compute)
assert.equal(calls, 7, 'oversized results bypass memo')

register('./test-owner-publication-loader.mjs', import.meta.url)
const { getDirectoryProfiles } = await import('../lib/skills/directory-profiles.ts')
const { getSkillQualityProfile, getPlatformHints } = await import('../lib/quality.ts')
const { getSkillTrustProfile } = await import('../lib/trust.ts')
const { buildSkillAudit } = await import('../lib/audits.ts')
const { getAgentSafetyProfile } = await import('../lib/agent-safety.ts')
const { getSkillSupplyProfile } = await import('../lib/supply.ts')
const { CURATED_SKILL_SNAPSHOT } = await import('../lib/seo/curated-skill-snapshot.ts')
const clock = Date.now
Date.now = () => 1790500000000
try {
  for (const original of CURATED_SKILL_SNAPSHOT.slice(0, 12)) {
    for (const extra of [{}, { source_sync_status: 'changed' }, { ai_review_approved: false, listing_status: 'owner_published' }]) {
      const record = { ...original, ...extra }
      for (const stats of [null, { total_calls: 50, success_calls: 40, success_rate: 0.8, unique_agents: 5 }]) {
        const expected = {
          qualityProfile: getSkillQualityProfile(record, stats), trustProfile: getSkillTrustProfile(record),
          safetyProfile: getAgentSafetyProfile(record, buildSkillAudit(record), { max_risk: 'medium', needs_install_command: true }),
          platformHints: getPlatformHints(record), supplyProfile: getSkillSupplyProfile(record),
        }
        assert.deepEqual(getDirectoryProfiles(record, stats), expected)
        assert.deepEqual(getDirectoryProfiles({ ...record }, stats), expected, 'cache hit must preserve all safety/quality outputs')
      }
    }
  }
} finally { Date.now = clock }
console.log('Public cache: static/query separation, RSC, locale/alias preservation, private route blocking, auth scope, bounded memo and identical safety/score semantics passed.')

// Prerendering must stop before the DB-backed directory component is created.
// Simulate Next's build interruption at connection(), and check localized pages
// still render without it unless they are skills directories.
async function checkDirectoryBoundary(path, props, shouldWait) {
  const mod = {}
  let waits = 0, rendered = 0
  const boundary = new Error('prerender interrupted')
  const stubs = {
    'next/server': { connection: async () => { waits++; throw boundary } },
    './content': { default: () => null, generateMetadata: () => ({}), generateStaticParams: () => [] },
    'react/jsx-runtime': { jsx: (_component, componentProps) => { rendered++; return componentProps } },
  }
  new Function('exports', 'require', ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText)(mod, name => { assert.ok(name in stubs, name); return stubs[name] })
  if (shouldWait) {
    await assert.rejects(() => mod.default(props), error => error === boundary)
    assert.equal(waits, 1)
    assert.equal(rendered, 0, 'database content cannot render during build')
  } else {
    const result = await mod.default(props)
    assert.equal(waits, 0)
    assert.equal(rendered, 1)
    assert.equal(result.requireHealthy, true)
  }
}
await checkDirectoryBoundary('app/skills/page.tsx', { searchParams: Promise.resolve({ q: 'design' }) }, true)
await checkDirectoryBoundary('app/[locale]/[page]/page.tsx', { params: Promise.resolve({ locale: 'zh', page: 'skills' }) }, true)
await checkDirectoryBoundary('app/[locale]/[page]/page.tsx', { params: Promise.resolve({ locale: 'zh', page: 'docs' }) }, false)

// Directory wrappers forward the actual query for SSR and metadata without
// making unrelated localized pages depend on request-time search parameters.
async function checkDirectoryInputs(path, page) {
  const mod = {}, empty = Promise.resolve({}), input = Promise.resolve({ q: 'design', sort: 'stars' })
  let waits = 0
  const stubs = {
    'next/server': { connection: async () => { waits++ } },
    './content': { default: () => null, generateMetadata: async props => props, generateStaticParams: () => [] },
    'react/jsx-runtime': { jsx: (_component, props) => props },
  }
  new Function('exports', 'require', ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText)(mod, name => stubs[name])
  const props = { searchParams: input, params: Promise.resolve({ locale: 'zh', page }) }
  for (const result of [await mod.default(props), await mod.generateMetadata(props)]) {
    assert.deepEqual(await result.searchParams, page === 'skills' ? await input : await empty)
  }
  assert.equal(waits, page === 'skills' ? 1 : 0)
}
await checkDirectoryInputs('app/skills/page.tsx', 'skills')
await checkDirectoryInputs('app/[locale]/[page]/page.tsx', 'skills')
await checkDirectoryInputs('app/[locale]/[page]/page.tsx', 'docs')
