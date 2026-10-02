import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { withTimeout } from '../lib/async.ts'

function harness(path, extra) {
  const state = [], deps = [], pending = []
  let cursor = 0, effectCursor = 0
  const react = {
    useState(initial) { const slot = cursor++; if (!(slot in state)) state[slot] = typeof initial === 'function' ? initial() : initial; return [state[slot], value => { state[slot] = typeof value === 'function' ? value(state[slot]) : value }] },
    useEffect(fn, next) { const slot = effectCursor++; if (!deps[slot] || next.some((value, i) => value !== deps[slot][i])) { deps[slot] = next; pending.push(fn) } },
  }
  const dependencies = {
    react, 'next/navigation': { useRouter: () => ({ push: path => { window.location.href = path } }) }, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragment' },
    'lucide-react': { Bookmark: 'icon' }, '@/components/skill-event-tracker': { trackSkillEvent() {} },
    '@/lib/i18n/context': { useI18n: () => ({ locale: 'en' }) }, '@/lib/i18n/skill-detail-copy': { formatSkillDetailCopy: (_locale, key) => key },
    '@/lib/async': { withTimeout }, '@/lib/utils': { cn: () => '' }, '@/lib/analytics': { trackAnalyticsEvent() {} },
    '@/lib/i18n/market-routing': { getLocalizedNavigationHref: path => path }, ...extra,
  }
  const code = ts.transpileModule(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const exports = {}; new Function('exports', 'require', code)(exports, name => { assert.ok(name in dependencies, name); return dependencies[name] })
  const Component = Object.values(exports)[0]
  const render = () => { cursor = 0; effectCursor = 0; const node = Component({ skillSlug: 'example', repository: 'https://github.com/test/repo' }); for (const effect of pending.splice(0)) effect(); return node }
  return { render, settle: async () => { for (let i = 0; i < 5; i++) await new Promise(setImmediate) } }
}
function nodes(node) { if (!node || typeof node !== 'object') return []; return [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)] }
const button = (tree, label) => nodes(tree).find(node => node.type === 'button' && (!label || [node.props.children].flat(Infinity).includes(label)))
const originalFetch = globalThis.fetch, originalWindow = globalThis.window
try {
  globalThis.window = { location: { href: 'https://example.test/skills/example' }, localStorage: { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') } }, setTimeout }
  let posts = 0
  globalThis.fetch = async () => { posts++; throw Error('offline') }
  const feedback = harness('components/skill-feedback-panel.tsx', {})
  let tree = feedback.render()
  await button(tree, 'useful').props.onClick(); tree = feedback.render()
  assert.ok(nodes(tree).some(node => node.props?.children === 'feedbackError'))
  assert.equal(button(tree, 'useful').props.disabled, false, 'Feedback must release its saving state after a rejected request')
  globalThis.fetch = async (_url, init) => { posts++; assert.ok(init.signal); assert.match(JSON.parse(init.body).agent_id, /^web-user-/); return { ok: true } }
  await button(tree, 'useful').props.onClick(); tree = feedback.render()
  assert.ok(nodes(tree).some(node => node.props?.children === 'signalRecorded')); assert.equal(posts, 2)

  let failWrite = true, writes = 0
  const bookmarkQuery = () => { const q = { select() { return q }, eq() { return q }, abortSignal(signal) { assert.ok(signal); return q }, maybeSingle: async () => ({ data: null, error: null }), upsert(row, options) { writes++; assert.equal(options.ignoreDuplicates, true); assert.equal(options.onConflict, 'user_id,skill_slug'); assert.equal(row.skill_slug, 'example'); return q }, then(resolve, reject) { return Promise.resolve({ error: failWrite ? Error('offline') : null }).then(resolve, reject) } }; return q }
  const saved = harness('components/save-skill-button.tsx', { '@/lib/supabase/client': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'user' } }, error: null }) }, from: bookmarkQuery }) } })
  saved.render(); await saved.settle(); tree = saved.render()
  await button(tree).props.onClick(); tree = saved.render(); assert.equal(button(tree).props.disabled, false); assert.ok(nodes(tree).some(node => node.props?.children === 'saveError'))
  failWrite = false; await button(tree).props.onClick(); tree = saved.render(); assert.equal(button(tree).props['aria-pressed'], true); assert.equal(writes, 2)
  const guest = harness('components/save-skill-button.tsx', { '@/lib/supabase/client': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: null }, error: { name: 'AuthSessionMissingError', status: 401 } }) } }) } })
  guest.render(); await guest.settle(); tree = guest.render(); assert.equal(button(tree).props.disabled, false); await button(tree).props.onClick(); assert.match(window.location.href, /^\/auth\/login\?next=/)

  let accountFailed = true, redirects = 0
  const claims = harness('components/claim-skill-panel.tsx', { 'next/navigation': { useRouter: () => ({ push: () => redirects++, refresh() {} }) }, '@/lib/supabase/client': { createClient: () => ({ auth: { getUser: async () => { if (accountFailed) throw Error('offline'); return { data: { user: null }, error: null } } } }) } })
  claims.render(); await claims.settle(); tree = claims.render(); assert.equal(button(tree).props.disabled, false, 'A failed account lookup must expose a retry')
  accountFailed = false; button(tree).props.onClick(); claims.render(); await claims.settle(); tree = claims.render(); button(tree).props.onClick(); assert.equal(redirects, 1, 'Recovered unauthenticated claims lead to sign-in')
  console.log('Client recovery: blocked storage, feedback rejection/retry, idempotent bookmark retry, missing auth and account-check recovery passed.')
} finally { globalThis.fetch = originalFetch; globalThis.window = originalWindow }
