import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import ts from 'typescript'
// Transpile only these small pure modules to keep the application import style.
const cache = new Map()
function moduleAt(path) {
  if (cache.has(path)) return cache.get(path)
  const output = ts.transpileModule(readFileSync(new URL('../lib/storefront/' + path + '.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  new Function('exports','require',output)(exports, name => moduleAt(name.replace('./','')))
  cache.set(path,exports); return exports
}
const { STORE_PRODUCTS, filterStoreProducts, normalizeStoreFilters, storeHref } = moduleAt('catalog')
const { EMPTY_DEMO, parseDemoState, acquireDemo } = moduleAt('demo-state')
const { createSampleZip, sampleFiles } = moduleAt('sample-package')
const filters = normalizeStoreFilters(new URLSearchParams('access=paid&category=web&q=portfolio&sort=price-asc'))
assert.deepEqual(filterStoreProducts(filters).map(p => p.slug), ['studio-portfolio'])
assert.equal(filterStoreProducts(normalizeStoreFilters(new URLSearchParams('access=free'))).length, 2)
assert.equal(filterStoreProducts(normalizeStoreFilters(new URLSearchParams('q=找不到的内容'))).length, 0)
assert.equal(normalizeStoreFilters(new URLSearchParams('access=fake&category=fake&sort=fake')).access, 'all')
assert.equal(storeHref('/library','zh',{tab:'saved'}), '/marketplace/library?tab=saved&lang=zh')
for (const raw of ['null','oops','42','{"items":[null,{}],"orders":[{}],"saved":[42,"fake"]}']) assert.deepEqual(parseDemoState(raw), EMPTY_DEMO)
const now = '2026-09-28T00:00:00Z'
assert.equal(acquireDemo(EMPTY_DEMO,'fake','full',now), EMPTY_DEMO)
assert.equal(acquireDemo(EMPTY_DEMO,'studio-portfolio','full',now), EMPTY_DEMO)
let state = acquireDemo(EMPTY_DEMO,'social-visuals','basic',now)
assert.equal(state.orders.length,0)
state = acquireDemo(state,'social-visuals','full',now,'DEMO-123')
assert.equal(state.items.length,1)
assert.equal(state.items[0].edition,'full')
assert.equal(state.orders.length,1)
assert.equal(acquireDemo(state,'social-visuals','full',now,'DEMO-again'),state)
assert.equal(acquireDemo(state,'social-visuals','basic',now),state)
state = acquireDemo(state,'research-brief','full',now)
assert.equal(state.orders.length,1)
assert.deepEqual(parseDemoState(JSON.stringify(state)),state)
assert.equal(parseDemoState('{"orders":[{"id":"DEMO-1","slug":"studio-portfolio","price":0,"createdAt":"2026-09-28"}]}').orders.length,0)
const files = sampleFiles(STORE_PRODUCTS[0],'zh','full'), zip = createSampleZip(files)
assert.equal(new DataView(zip.buffer).getUint32(0,true),0x04034b50)
assert.equal(new DataView(zip.buffer).getUint32(zip.length - 22,true),0x06054b50)
mkdirSync('.codex-tmp',{recursive:true}); writeFileSync('.codex-tmp/storefront-sample.zip',zip)
const layout = readFileSync('app/marketplace/layout.tsx','utf8')
assert.match(layout,/NEXT_PUBLIC_STOREFRONT_PREVIEW !== 'true'/)
assert.match(layout,/index: false, follow: false/)
assert.doesNotMatch(readFileSync('components/storefront/checkout.tsx','utf8'),/fetch\(|stripe\.com|api\/checkout/)
assert.doesNotMatch(readFileSync('app/sitemap.xml/route.ts','utf8'),/marketplace/)
console.log('Storefront: filters, locale URLs, malformed storage, Basic-to-Plus, duplicate checkout, sample ZIP and SEO isolation passed.')
