import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const read = file => readFileSync(file, 'utf8')
function* pages(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name)
    if (entry.isDirectory()) yield* pages(file)
    else if (entry.name === 'page.tsx') yield file.replaceAll('\\', '/')
  }
}
let checked = 0
for (const file of pages('app')) {
  if (file === 'app/skills/new/page.tsx') continue // Submission queue is operational.
  const value = read(file).match(/export const revalidate = ([\d_]+)/)?.[1]
  if (value === undefined || Number(value) === 0) continue
  assert.equal(Number(value.replaceAll('_', '')), 14400, `${file}: public ISR must use a statically analyzable four-hour literal`)
  checked++
}
assert.ok(checked > 50, 'Validate canonical and translated public page wrappers')
const data = read('lib/db/skills.ts')
for (const key of ['SHARED_SKILL', 'DIRECTORY', 'CATEGORY', 'SITEMAP']) {
  assert.match(data, new RegExp(`const ${key}_CACHE_REVALIDATE_SECONDS = 14400`))
}
// Successful content can stay warm; action eligibility and personal responses
// must not inherit the public display window.
assert.match(data, /SKILL_LOOKUP_CACHE_REVALIDATE_SECONDS = 300/)
for (const file of ['app/api/skills/[slug]/install/route.ts', 'app/api/registry/manifest/[slug]/route.ts', 'app/api/agent/skills/[slug]/route.ts']) {
  assert.match(read(file), /export const revalidate = 0/)
  assert.match(read(file), /no-store/)
}
for (const file of ['app/api/admin/skills/publish/route.ts', 'app/api/admin/skills/product-metadata/route.ts']) {
  assert.match(read(file), /revalidateTag\(`public-skill:\$\{[^}]+\}`, \{ expire: 0 \}\)/, 'Owner updates can expire the long display cache immediately')
}
console.log(`Public cache window: ${checked} route wrappers, shared data, short action lookups and targeted invalidation passed.`)
