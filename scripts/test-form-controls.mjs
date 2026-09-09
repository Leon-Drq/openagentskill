import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = p => readFileSync(new URL('../'+p, import.meta.url), 'utf8')
let count=0
for(const [file, expected] of [['showcase-gallery',3],['creator-directory-filters',2],['skills-page-client',3],['agent-resolve-workbench',2],['skill-submit-form',1]]) {
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
console.log(`${count} native selects share arrow spacing, touch sizing, focus, RTL and accessibility fallbacks.`)
