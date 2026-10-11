import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Exercise the real recovery component with deterministic hooks and time.
// A real router refresh is separately covered by the server-renderer tests.
const compiled = ts.transpileModule(readFileSync('components/directory-recovery.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText
const original = { window: globalThis.window, document: globalThis.document, now: Date.now }
const online = Object.getOwnPropertyDescriptor(globalThis.navigator, 'onLine')
let now = 0, connected = true
try {
  Date.now = () => now
  Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, get: () => connected })
  function fixture() {
    now = 0; connected = true
    const hooks = [], effects = [], timers = new Map(), listeners = new Map()
    let cursor = 0, refreshes = 0, nextTimer = 0
    const events = {
      addEventListener: (name, fn) => listeners.set(name, fn),
      removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name) },
    }
    globalThis.window = { ...events, setTimeout: (fn, delay) => { timers.set(++nextTimer, { at: now + delay, fn }); return nextTimer }, clearTimeout: id => timers.delete(id) }
    globalThis.document = { ...events, visibilityState: 'visible' }
    const router = { refresh: () => refreshes++ }
    const same = (a, b) => a && a.length === b.length && a.every((value, i) => Object.is(value, b[i]))
    const react = {
      useState(initial) { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], value => { hooks[i] = value }] },
      useRef(initial) { const i = cursor++; return hooks[i] ??= { current: initial } },
      useTransition: () => [false, fn => fn()],
      useCallback(fn, deps) { const i = cursor++; if (!same(hooks[i]?.deps, deps)) hooks[i] = { fn, deps }; return hooks[i].fn },
      useEffect(fn, deps) {
        const i = cursor++
        if (!same(hooks[i]?.deps, deps)) effects.push(() => { hooks[i]?.cleanup?.(); hooks[i] = { deps, cleanup: fn() } })
      },
    }
    const jsx = (type, props) => ({ type, props })
    const deps = { react, 'next/navigation': { useRouter: () => router }, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'lucide-react': { LoaderCircle: 'loading-icon', RefreshCw: 'retry-icon' }, '@/lib/i18n/directory-copy': { directoryCopy: () => ({ loading: 'loading' }), directoryLabel: (_locale, key) => key } }
    const exports = {}
    new Function('exports', 'require', compiled)(exports, name => { assert.ok(name in deps, name); return deps[name] })
    const render = () => { cursor = 0; const tree = exports.DirectoryRecovery({ locale: 'en', empty: false }); effects.splice(0).forEach(fn => fn()); return tree.props.children[1] }
    const advance = ms => {
      now += ms
      for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.fn() }
    }
    render()
    return { render, advance, fire: name => listeners.get(name)?.(), count: () => refreshes, unmount: () => { hooks.forEach(hook => hook?.cleanup?.()); assert.equal(timers.size, 0); assert.equal(listeners.size, 0) } }
  }
  const manual = fixture()
  manual.render().props.onClick()
  let button = manual.render()
  assert.equal(manual.count(), 1)
  assert.equal(button.props.disabled, true)
  button.props.onClick()
  assert.equal(manual.count(), 1, 'Repeated clicks cannot start duplicate refreshes')
  manual.advance(60_000)
  button = manual.render()
  assert.equal(button.props.disabled, false)
  button.props.onClick(); manual.render()
  assert.equal(manual.count(), 2, 'A failed attempt does not permanently disable manual retry')
  manual.advance(65_000); manual.render()
  assert.equal(manual.count(), 2, 'Manual retry cancels the automatic attempt')
  manual.unmount()

  const resumed = fixture()
  connected = false
  resumed.advance(65_000)
  assert.equal(resumed.count(), 0)
  connected = true; resumed.fire('online'); resumed.render()
  assert.equal(resumed.count(), 1, 'Coming online retries once after the delay')
  resumed.fire('online'); resumed.advance(120_000); resumed.render()
  assert.equal(resumed.count(), 1, 'Recovery must never become an automatic polling loop')
  resumed.unmount()

  const hidden = fixture()
  document.visibilityState = 'hidden'; hidden.advance(65_000)
  assert.equal(hidden.count(), 0)
  document.visibilityState = 'visible'; hidden.fire('visibilitychange'); hidden.render()
  assert.equal(hidden.count(), 1)
  hidden.unmount()
  console.log('Directory recovery: manual retry, cooldown release, offline/hidden recovery, single automatic attempt and cleanup passed.')
} finally {
  globalThis.window = original.window; globalThis.document = original.document; Date.now = original.now
  if (online) Object.defineProperty(globalThis.navigator, 'onLine', online)
  else delete globalThis.navigator.onLine
}
