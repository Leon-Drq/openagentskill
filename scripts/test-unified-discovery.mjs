import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { DISCOVERY_TASKS, DISCOVERY_OUTPUTS, DISCOVERY_AGENTS, discoveryCopy, discoveryModePath } from '../lib/discovery.ts'

// Mode switches must not accidentally apply a gallery category, creator,
// pagination or sort value to an unrelated registry query.
assert.equal(discoveryModePath('gallery', 'skills', 'q=launch&category=video-creation&page=3&platform=codex&sort=stars&pricing=free'), '/showcase?q=launch&pricing=free&category=video')
assert.equal(discoveryModePath('all', 'gallery', 'category=slides&creator=op7418&page=7&sort=top&q=deck'), '/skills?q=deck&category=presentation&view=all')
assert.equal(discoveryModePath('featured', 'skills', 'page=4&view=all'), '/skills', 'Default featured links use the existing canonical URL')
assert.equal(discoveryModePath('featured', 'gallery', 'category=image&q=poster&lang=zh'), '/skills?q=poster&category=design-creative&view=skills')
assert.equal(discoveryModePath('gallery', 'skills', 'category=coding-agents&quality=high&pricing=unknown'), '/showcase')
assert.equal(discoveryModePath('gallery', 'gallery', 'category=web&tag=logo'), '/showcase?category=web')
for (const item of [...DISCOVERY_TASKS, ...DISCOVERY_OUTPUTS, ...DISCOVERY_AGENTS]) {
  const root = item.href.split('/')[1]
  const route = existsSync(`app${item.href}/page.tsx`) || existsSync(`app/${root}/[slug]/page.tsx`)
  assert.ok(route, item.href)
  for (const locale of ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']) assert.ok(item.label[locale].trim())
}
for (const locale of ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']) {
  const copy = discoveryCopy(locale)
  assert.deepEqual(Object.keys(copy), Object.keys(discoveryCopy('en')))
  assert.ok(Object.values(copy).every(value => value.trim()))
}
console.log('Unified discovery: cross-view filter semantics, canonical entry links, existing topic routes and eight languages passed.')
