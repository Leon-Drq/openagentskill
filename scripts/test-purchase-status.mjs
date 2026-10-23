import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const require = createRequire(import.meta.url)
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
function load(file, deps = {}) {
  const out = {}
  const js = ts.transpileModule(read(file), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText
  new Function('exports', 'require', js)(out, name => name in deps ? deps[name] : require(name))
  return out
}
const statusModule = load('lib/payments/purchase-status.ts')
const { readPurchaseStatus } = statusModule
const { membershipCopy } = load('lib/i18n/membership-copy.ts')
const { paymentMessage } = load('lib/payments/copy.ts', { '@/lib/i18n/membership-copy': { membershipCopy } })
const ready = { ready: true, membershipReady: true, owned: false, membership: null }
const maintenance = { ready: false, membershipReady: false, owned: false, membership: null, reason: 'payment_maintenance' }
const originalFetch = globalThis.fetch
try {
  let requests = 0, signal
  globalThis.fetch = async (url, init) => {
    requests++; signal = init.signal
    assert.equal(url, '/api/payments/status?slug=a%2Fb')
    assert.equal(init.cache, 'no-store')
    assert.equal(init.method, undefined, 'Availability never creates a checkout')
    return Response.json(ready)
  }
  assert.deepEqual(await readPurchaseStatus('a/b'), ready)
  assert.equal(requests, 1)
  assert.equal(signal.aborted, false)
  for (const code of [401, 402, 429, 500, 503]) {
    globalThis.fetch = async () => Response.json({ error: 'temporarily_unavailable' }, { status: code })
    assert.deepEqual(await readPurchaseStatus(), maintenance)
  }
  for (const body of [null, {}, { ...ready, ready: 'true' }, { ...ready, membership: 'admin' }, { ...ready, reason: 2 }]) {
    globalThis.fetch = async () => Response.json(body)
    assert.deepEqual(await readPurchaseStatus(), maintenance)
  }
  globalThis.fetch = async () => new Response('not json')
  assert.deepEqual(await readPurchaseStatus(), maintenance)
  globalThis.fetch = async () => { throw new TypeError('offline') }
  assert.deepEqual(await readPurchaseStatus(), maintenance)
  for (const stallBody of [false, true]) {
    globalThis.fetch = async (_url, init) => {
      signal = init.signal
      if (!stallBody) return new Promise(() => {})
      return { ok: true, json: () => new Promise(() => {}) }
    }
    assert.deepEqual(await readPurchaseStatus(undefined, undefined, 10), maintenance, 'Headers and JSON both have a deadline')
    assert.equal(signal.aborted, true)
  }
  const controller = new AbortController()
  const pending = readPurchaseStatus(undefined, controller.signal)
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
  globalThis.fetch = async () => Response.json({ ...ready, owned: true, membership: 'lifetime', reason: 'payment_maintenance' })
  assert.deepEqual(await readPurchaseStatus(), maintenance, 'Maintenance cannot grant access')
  globalThis.fetch = async () => Response.json(ready)
  assert.deepEqual(await readPurchaseStatus(), ready, 'A later successful check can recover normally')

  // Exercise the real hook through a minimal effect/state harness. A failed
  // focus refresh must replace old ready/owned data, not leave it enabled.
  let cells = [], cursor = 0, effect, cleaned, listeners = new Map(), fetches = 0
  const hooks = {
    ...React,
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = initial; return [cells[i], next => { cells[i] = next }] },
    useEffect(callback) { effect = callback },
  }
  const deps = {
    'next/navigation': { useRouter: () => ({ push() {} }) },
    '@/components/crawl-link': { default: ({ children, ...props }) => { delete props.prefetch; return React.createElement('a', props, children) } },
    '@/lib/payments/copy': { paymentMessage }, '@/lib/i18n/membership-copy': { membershipCopy },
    '@/lib/payments/policy': { recurringPlan: plan => ['monthly', 'yearly'].includes(plan) },
    './payments.module.css': { default: { primary: 'primary', maintenance: 'maintenance' } },
    '@/lib/download-file': { downloadFile() { throw new Error('No downloads in availability tests') } },
    '@/lib/payments/purchase-status': statusModule,
  }
  const hook = load('components/payments/purchase-actions.tsx', { ...deps, react: hooks }).usePurchaseStatus
  const originalWindow = globalThis.window
  globalThis.window = { location: { search: '' }, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) }
  try {
    globalThis.fetch = async () => { fetches++; return Response.json({ ...ready, owned: true }) }
    assert.equal(hook().state, null)
    cleaned = effect()
    await new Promise(resolve => setImmediate(resolve))
    cursor = 0; assert.equal(hook().state.owned, true)
    globalThis.fetch = async () => { fetches++; return Response.json({}, { status: 503 }) }
    listeners.get('focus')(); listeners.get('focus')()
    await new Promise(resolve => setImmediate(resolve))
    cursor = 0
    assert.deepEqual(hook(), { state: maintenance, error: 'payment_maintenance' })
    assert.equal(fetches, 2, 'Overlapping focus events share the in-flight request')
  } finally { cleaned?.(); globalThis.window = originalWindow }

  const { PurchaseActions } = load('components/payments/purchase-actions.tsx', deps)
  for (const locale of ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']) {
    const copy = membershipCopy(locale)
    assert.ok(copy.maintenance && copy.maintenanceNote)
    assert.equal(paymentMessage('payment_maintenance', locale), copy.maintenanceNote)
    for (const plan of ['monthly', 'yearly', 'lifetime', 'single']) {
      const html = renderToStaticMarkup(React.createElement(PurchaseActions, { plan, locale, status: maintenance, compact: true }))
      assert.ok(html.includes(copy.maintenance))
      assert.doesNotMatch(html, /Checking availability|正在确认购买状态/)
      assert.match(html, /disabled=""/)
      assert.match(html, /aria-busy="false"/)
    }
  }
  const initial = renderToStaticMarkup(React.createElement(PurchaseActions, { plan: 'monthly', locale: 'zh', status: null }))
  assert.match(initial, /正在确认购买状态/)
  assert.match(initial, /aria-busy="true"/)
  const healthy = renderToStaticMarkup(React.createElement(PurchaseActions, { plan: 'monthly', locale: 'zh', status: ready }))
  assert.doesNotMatch(healthy, /disabled=""|支付暂时维护/)
  assert.match(healthy, /订阅 Pro 会员/)
  console.log('Purchase availability: failures, deadlines, aborts, stale-state clearing, recovery and disabled maintenance buttons in 8 locales passed. No payment requests made.')
} finally { globalThis.fetch = originalFetch }
