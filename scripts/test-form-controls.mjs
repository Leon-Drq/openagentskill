import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { createElement as h, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const read = p => readFileSync(new URL('../'+p, import.meta.url), 'utf8')
let count=0
for(const [file, expected] of [['showcase-gallery',4],['creator-directory-filters',2],['skills-page-client',6],['agent-resolve-workbench',2],['skill-submit-form',1]]) {
  const source=read(`components/${file}.tsx`)
  assert.doesNotMatch(source, /<select\b/)
  assert.equal((source.match(/<NativeSelect\b/g)||[]).length, expected)
  count+=expected
}
const css=read('app/globals.css')
assert.match(css,/--control-inline-padding: 12px/)
assert.match(css,/--control-height: 44px/)
assert.match(css,/padding-inline-end: calc\(var\(--control-inline-padding\) \+ var\(--control-icon-size\) \+ var\(--control-icon-gap\)\)/)
assert.match(css,/\.native-select:focus-visible/)
assert.match(css,/forced-colors: active/)
assert.match(css,/prefers-reduced-motion: reduce/)
assert.match(css,/\.native-select:dir\(rtl\)/)
assert.match(read('components/ui/native-select.tsx'), /<select \{\.\.\.props\}/, 'Keep native name/value/disabled/ref/event behavior')
assert.match(read('components/language-switcher.tsx'), /maxHeight: panel.height/)
// Exercise actual SSR, including the no-JS form fallback. The menu enhancement
// must not remove name/value/required semantics or grouped/disabled options.
const require = createRequire(import.meta.url)
function load(file, deps = {}) {
  const out = {}
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('exports', 'require', js)(out, name => name in deps ? deps[name] : require(name))
  return out
}
const utils = load('lib/utils.ts')
const select = load('components/ui/select.tsx', { '@/lib/utils': utils })
const { NativeSelect } = load('components/ui/native-select.tsx', { '@/lib/utils': utils, './select': select })
const html = renderToStaticMarkup(h(NativeSelect, { name: 'area', id: 'field', defaultValue: 'Design', required: true },
  h('option', { value: '' }, 'All fields'),
  h(Fragment, null, h('option', { value: 'Design' }, 'Design')),
  h('optgroup', { label: 'Technical', disabled: true }, h('option', { value: 'Coding' }, 'Coding'))))
assert.match(html, /<select[^>]*name="area"/)
assert.match(html, /id="field"/)
assert.match(html, /required=""/)
assert.match(html, /<option value="Design" selected="">Design<\/option>/)
assert.match(html, /<optgroup label="Technical" disabled="">/)
assert.doesNotMatch(html, /hidden=""|role="combobox"/, 'A usable real select is rendered before hydration')
assert.equal(existsSync(new URL('../app/dropdown-visual-check', import.meta.url)), false, 'Never publish verification fixtures')
console.log(`${count} shared pickers preserve SSR GET forms, default values, groups, disabled options and native accessibility fallbacks.`)
