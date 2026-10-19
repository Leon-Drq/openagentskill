import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
import * as react from 'react'
import * as jsx from 'react/jsx-runtime'
import * as icons from 'lucide-react'
import ts from 'typescript'
register('./test-owner-publication-loader.mjs', import.meta.url)
const copy = await import('../lib/i18n/handoff-copy.ts')
let status = 'idle', copied = '', clipboardWorks = true
const events = []
const dependencies = {
  react: { ...react, useState: () => [status, value => { status = value }] },
  'react/jsx-runtime': jsx, 'lucide-react': icons,
  '@/lib/copy-text': { copyText: async text => { copied = text; return clipboardWorks } },
  '@/lib/i18n/context': { useI18n: () => ({ locale: 'zh' }) },
  '@/lib/i18n/handoff-copy': copy,
  '@/lib/i18n/skill-detail-copy': { formatSkillDetailCopy: () => '已复制' },
  '@/components/skill-event-tracker': { trackSkillEvent: (...args) => events.push(args) },
}
const exports = {}
new Function('exports', 'require', ts.transpileModule(readFileSync('components/skill-agent-copy.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText)(exports, name => { assert.ok(name in dependencies, name); return dependencies[name] })
const render = target => exports.SkillAgentCopy({ skillSlug: 'test-skill', target })
const target = { id: 'codex', title: 'Source review prompt', kind: 'agent-prompt', value: 'Read only. Do not execute.' }
assert.equal(render(undefined), null)
let tree = render(target)
const idleButton = tree.props.children[0]
assert.equal(tree.props.children[1].props.className, 'sr-only', 'Idle copy status does not create an empty layout row')
assert.equal(idleButton.props.children.props.className, 'inline-grid text-center', 'Reserve both icon-and-label widths in a shared grid cell')
assert.ok(idleButton.props.children.props.children.every(label => label.props.className.includes('justify-center')), 'Keep each icon and label centered together')
await tree.props.children[0].props.onClick()
assert.equal(copied, target.value)
assert.equal(status, 'copied')
assert.equal(events.length, 0, 'Source review copies never count as installations')
assert.equal(render(target).props.children[1].props.role, 'status')
assert.equal(render(target).props.children[1].props.className, 'sr-only', 'Success feedback cannot stretch the action bar')
const copiedLabels = render(target).props.children[0].props.children.props.children
assert.equal(copiedLabels[0].props['aria-hidden'], true)
assert.equal(copiedLabels[1].props['aria-hidden'], false)
clipboardWorks = false
await render(target).props.children[0].props.onClick()
assert.equal(status, 'failed')
assert.notEqual(render(target).props.children[1].props.className, 'sr-only', 'Copy failures remain visible')
assert.equal(render(target).props.children[2].props.value, target.value, 'Clipboard failure exposes selectable text')
assert.equal(events.length, 0)
clipboardWorks = true
await render({ ...target, title: 'Codex install prompt' }).props.children[0].props.onClick()
assert.equal(events[0][1], 'install_copy')
for (const locale of ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']) {
  for (const key of ['copyAgent', 'example', 'exampleNote']) assert.ok(copy.handoffCopy(locale, key))
}
console.log('Agent copy: clipboard success, failure fallback, review-only telemetry and eight locales passed.')
