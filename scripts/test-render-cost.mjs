// Execute the real public renderer with deterministic data and a serializing
// Next Data Cache double. No credentials, database calls or mutations.
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const modules = new Map(), shared = new Map(), policies = []
let reads = 0, unavailable = false, records, stats = {}
let lookupError = false
const db = {
  getSkillBySlugStrict: async () => { if (lookupError) throw new Error('lookup unavailable'); return null },
  getSkillCatalogPage: async (_sort, _category, page, _stars, _pricing, _slugs, _topic, _output, window) => {
    reads++
    if (unavailable) throw new Error('database unavailable')
    return { records: records.slice(window.offset, window.offset + window.limit), total: records.length, hasMore: true, page }
  },
  getSkillStats: async () => stats,
  getSkillsBySlugs: async slugs => records.filter(record => slugs.includes(record.slug)),
  getBrowseSkillCandidates: async () => ({ records, degraded: false }),
  searchSkillsWithStatus: async () => ({ records, degraded: false }),
}
const cached = (fn, keys, policy) => {
  policies.push(policy)
  return async (...args) => {
    const key = JSON.stringify([keys, args])
    if (!shared.has(key)) shared.set(key, JSON.stringify(await fn(...args)))
    return JSON.parse(shared.get(key))
  }
}
const jsx = (type, props) => ({ type, props })
function load(path) {
  const absolute = resolve(path)
  if (modules.has(absolute)) return modules.get(absolute)
  const output = {}
  modules.set(absolute, output)
  const source = readFileSync(absolute, 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText
  new Function('exports', 'require', compiled)(output, name => {
    if (name === 'server-only') return {}
    if (name === 'react') return { ...require('react'), cache: fn => fn }
    if (name === 'next/cache') return { unstable_cache: cached }
    if (name === 'next/navigation') return { notFound: () => { throw new Error('404') }, permanentRedirect: path => { throw new Error('redirect:' + path) } }
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' }
    if (name === '@/lib/db/skills') return db
    if (name.startsWith('@/components/')) return new Proxy({}, { get: (_target, key) => key })
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? resolve(name.slice(2)) : resolve(dirname(absolute), name)
      if (base.endsWith('.json')) return JSON.parse(readFileSync(base, 'utf8'))
      for (const suffix of ['', '.ts', '.tsx']) if (existsSync(base + suffix)) return load(base + suffix)
      throw new Error('Missing test import: ' + name)
    }
    return require(name)
  })
  return output
}
records = structuredClone(load('lib/seo/curated-skill-snapshot.ts').CURATED_SKILL_SNAPSHOT)
const render = load('app/skills/content.tsx').default
const renderProps = async (params, extra = {}) => {
  const result = await render({ searchParams: Promise.resolve(params), ...extra })
  return result.props.children[1].props
}
const normalize = value => JSON.parse(JSON.stringify(value))
const defaultProps = await renderProps({})
assert.equal(defaultProps.skills.length, 16)
assert.equal(reads, 1)
assert.equal(shared.size, 1)
assert.deepEqual(await renderProps({}), normalize(defaultProps))
assert.equal(reads, 1, 'a default model hit skips all directory reads and computation')
const tracked = await renderProps({ utm_source: 'agent-a', ref: 'test', _rsc: 'navigation' })
assert.deepEqual(tracked.skills, defaultProps.skills)
assert.equal(tracked.queryString, 'utm_source=agent-a&ref=test')
assert.equal(shared.size, 1, 'attribution/RSC cannot grow or poison model keys')
assert.equal((await renderProps({})).queryString, '', 'request attribution cannot leak between visitors')
for (const lang of ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']) {
  const props = await renderProps({ lang })
  assert.equal(props.pathname, lang === 'en' ? '/skills' : `/${lang}/skills`)
}
assert.equal(shared.size, 8)
await renderProps({ lang: 'invented' })
assert.equal(shared.size, 8, 'invalid locales normalize before keying')
for (const params of [{ sort: 'stars' }, { page: '2' }, { category: 'design-creative' }, { q: 'design' }, { unknown: 'value' }]) {
  await renderProps(params)
  assert.equal(shared.size, 8, 'query variants bypass the default model cache')
}
await assert.rejects(() => renderProps({ page: '0' }), /404/)
await assert.rejects(() => renderProps({ page: '999999' }), /404/)
assert.deepEqual(policies, [{ revalidate: 300, tags: ['public-skill-directory', 'public-skill-stats'] }])

// Same invalidation operation used by publication/stat updates: the next read
// must rebuild from current inputs, including changed evidence fields.
shared.clear()
records = records.map(record => ({ ...record, tagline: 'Updated source evidence' }))
const updated = await renderProps({})
assert.ok(updated.skills.some(card => card.tagline === 'Updated source evidence'))
assert.notDeepEqual(updated.skills, defaultProps.skills)
shared.clear(); unavailable = true
assert.equal((await renderProps({})).degraded, true)
assert.equal(shared.size, 0, 'degraded snapshots are never persisted')
await assert.rejects(() => renderProps({}, { requireHealthy: true }), /do not cache the fallback/)
unavailable = false
assert.equal((await renderProps({})).degraded, false, 'the very next request can recover')
assert.equal(shared.size, 1)

// All page boundaries, including provider prefixes/tails, retain their exact
// order and count while expensive projection is limited to visible records.
const { projectDirectoryWindow } = load('lib/skills/directory-window.ts')
for (const count of [0, 1, 17, 480]) for (const providerCount of [0, 7, 16, 385]) for (const first of [true, false]) {
  const registry = Array.from({ length: count }, (_, i) => i)
  const providers = Array.from({ length: providerCount }, (_, i) => 'provider-' + i)
  const prefix = first ? Math.min(8, providerCount) : 0
  const expected = [...providers.slice(0, prefix), ...registry.map(i => 'registry-' + i), ...providers.slice(prefix)]
  for (let offset = 0; offset <= expected.length + 16; offset += 16) {
    let projections = 0
    const actual = projectDirectoryWindow(registry, providers, offset, prefix, i => { projections++; return 'registry-' + i })
    assert.deepEqual(actual, expected.slice(offset, offset + 16))
    assert.equal(projections, actual.filter(card => card.startsWith('registry-')).length)
  }
}

// A transient lookup failure on a new ISR report must throw, never become a
// cached 404. A genuine miss still uses the existing notFound contract.
// This boundary is tested through the same renderer import as production.
for (const kind of ['audit', 'evals']) {
  const report = load(`app/skills/[slug]/${kind}/content.tsx`)
  const props = { params: Promise.resolve({ slug: 'missing-non-curated-skill' }), searchParams: Promise.resolve({}) }
  lookupError = true
  await assert.rejects(() => report.default(props), /lookup unavailable/)
  await assert.rejects(() => report.generateMetadata(props), /lookup unavailable/)
  lookupError = false
  await assert.rejects(() => report.default(props), /^Error: 404$/)
}
console.log('Render cost: eight bounded model keys, request isolation, query bypass, invalidation, outage recovery and lazy card projection passed.')

if (process.argv.includes('--benchmark')) {
  // Same deterministic inputs and output. The extra ignored key exercises the
  // uncached preparation path; this is never sent to the live website.
  const runs = 200
  for (const [label, params] of [['prepare-every-request', { fixture: 'benchmark' }], ['cached-default-model', {}]]) {
    await renderProps(params)
    const start = performance.now(), cpu = process.cpuUsage(), readsBefore = reads
    for (let i = 0; i < runs; i++) await renderProps(params)
    const used = process.cpuUsage(cpu)
    console.log(JSON.stringify({ benchmark: label, runs, milliseconds: Math.round(performance.now() - start), cpuMilliseconds: Math.round((used.user + used.system) / 1000), catalogReads: reads - readsBefore }))
  }
}
