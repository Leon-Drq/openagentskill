import assert from 'node:assert/strict'
import { register } from 'node:module'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { outboundParameters, mountOutboundLinkTracker } = await import('../lib/outbound-analytics.ts')
const { updateAnalyticsConsent } = await import('../lib/analytics.ts')
const origin = 'https://www.openagentskill.com/skills?task=private#secret'
for (const href of ['/skills/a', 'https://openagentskill.com/zh/skills', 'https://www.openagentskill.com/resolve', 'mailto:private@example.com', 'javascript:alert(1)', 'https://name:secret@example.com', 'http://localhost:3000', 'http://192.168.1.5', 'http://[::1]']) {
  assert.equal(outboundParameters(href, origin, '', 'main'), null, href)
}
for (const [href, type] of [
  ['https://github.com/owner/repo?token=private#secret', 'github'],
  ['https://x.com/intent/post?text=private', 'social'],
  ['https://docs.example.com/private', 'docs'],
  ['https://remotion.dev/docs/test', 'docs'],
  ['https://skills.sh/private', 'marketplace'],
  ['https://skillry.dev/?utm_source=private', 'marketplace'],
  ['https://github.com.evil.example/private', 'other'],
  ['https://example.com/private', 'other'],
]) {
  const result = outboundParameters(href, origin, '_blank', 'main')
  assert.equal(result.outbound_type, type)
  assert.equal(result.target, 'new_tab')
  assert.doesNotMatch(JSON.stringify(result), /private|secret|token|text=/)
}
assert.equal(outboundParameters('https://example.com', origin, 'anything', 'private-value').placement, 'other')

const memory = () => { const data = new Map(); return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) } }
const calls = []
globalThis.window = { location: new URL(origin), localStorage: memory(), sessionStorage: memory(), gtag: (...args) => calls.push(args) }
globalThis.document = { referrer: '', title: 'Skills' }
// A small DOM adapter keeps navigation untouched while exercising the actual
// document listener lifecycle and consent-gated analytics sink.
class ElementFixture {
  closest(selector) { return selector === 'a[href]' ? this.anchor : null }
}
class AnchorFixture extends ElementFixture {
  href = 'https://github.com/owner/repo?token=private#secret'
  target = '_blank'
  download = false
  closest(selector) { return selector === 'a[href]' ? this : selector === 'footer' ? {} : null }
  hasAttribute(name) { return name === 'download' && this.download }
}
globalThis.Element = ElementFixture
globalThis.HTMLAnchorElement = AnchorFixture
const listeners = new Map()
const root = {
  addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn) },
  removeEventListener(type, fn) { listeners.get(type).delete(fn) },
}
const anchor = new AnchorFixture()
const icon = new ElementFixture(); icon.anchor = anchor
const dispatch = (type = 'click', options = {}) => {
  const event = { type, button: 0, target: icon, defaultPrevented: false, ...options }
  for (const fn of listeners.get(type) || []) fn(event)
  assert.equal(event.defaultPrevented, options.defaultPrevented || false, 'tracking must never cancel navigation')
}
let cleanup = mountOutboundLinkTracker(root)
dispatch()
assert.equal(calls.length, 0, 'denied by default')
updateAnalyticsConsent('granted')
calls.length = 0
dispatch()
assert.equal(calls.filter(c => c[1] === 'outbound_link_click').length, 1, 'nested SVG/icon click fires once')
assert.equal(calls[0][2].placement, 'footer')
dispatch('click', { ctrlKey: true })
dispatch('auxclick', { button: 1 })
assert.equal(calls.length, 3, 'modified primary and middle clicks work')
for (const [type, options] of [['click', {button:1}], ['auxclick', {button:2}], ['click', {defaultPrevented:true}], ['click', {target:null}]]) dispatch(type, options)
assert.equal(calls.length, 3, 'ignore non-navigation gestures and cancelled links')
anchor.download = true; dispatch(); anchor.download = false
assert.equal(calls.length, 3, 'download is not outbound navigation')
cleanup(); dispatch(); assert.equal(calls.length, 3)
cleanup = mountOutboundLinkTracker(root); dispatch(); assert.equal(calls.length, 4, 'remount has exactly one listener')
updateAnalyticsConsent('denied'); const count = calls.length; dispatch(); assert.equal(calls.length, count, 'revocation applies immediately')
cleanup()
assert.doesNotMatch(JSON.stringify(calls), /token|private|secret/)
console.log('Outbound analytics: destination types, privacy, consent, nested targets, middle/modified clicks and mount cleanup passed.')
