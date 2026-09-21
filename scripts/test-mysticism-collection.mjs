import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MYSTICISM_GROUPS, MYSTICISM_PATH, MYSTICISM_SKILLS, mysticismSkillPath } from '../lib/mysticism-collection.ts'
import { getMysticismCopy } from '../lib/i18n/mysticism-copy.ts'

assert.equal(MYSTICISM_SKILLS.length, 15)
assert.equal(new Set(MYSTICISM_SKILLS.map(s => s.repo)).size, 15)
for (const skill of MYSTICISM_SKILLS) {
  assert.ok(MYSTICISM_GROUPS.includes(skill.group))
  assert.match(skill.repo, /^[a-z-]+-skill$/)
  assert.equal(mysticismSkillPath(skill.repo), `/skills/leon-drq-${skill.repo}`)
  assert.ok(skill.description && skill.descriptionZh && skill.name && skill.nameZh)
  assert.match(skill.demoPath, /^\/(?:[a-z-]+(?:\/[a-z-]+)*)?$/)
}
assert.deepEqual(MYSTICISM_GROUPS.map(g => MYSTICISM_SKILLS.filter(s => s.group === g).length), [4, 5, 3, 3])
for (const locale of ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']) {
  const c = getMysticismCopy(locale)
  for (const [key, value] of Object.entries(c)) {
    if (key === 'summaries' && locale === 'zh') continue
    assert.ok(typeof value === 'string' ? value.trim() : value.length === 4 && value.every(s => s.trim()))
  }
}
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const page = read('app/topics/mysticism/page.tsx')
assert.match(page, /CollectionPage/)
assert.match(page, /BreadcrumbList/)
assert.match(page, /alternates: \{ canonical:/)
assert.match(page, /index: !Object\.values\(params\)\.some\(Boolean\)/)
assert.match(page, /c\.disclosure/)
assert.match(page, /c\.privacy/)
assert.doesNotMatch(page, /aggregateRating|ai_review_approved|owner_published|OWNER_PUBLISH_TOKEN/)
assert.ok(read('lib/site-navigation.ts').includes(MYSTICISM_PATH))
assert.ok(read('lib/seo/sitemap.ts').includes(MYSTICISM_PATH))
console.log('Mysticism collection: 15 unique sources, four groups, 8-language shell, disclosures and SEO checks passed.')
