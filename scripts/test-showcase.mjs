import assert from 'node:assert/strict'
import { access, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { SHOWCASE_CASES, SHOWCASE_CATEGORIES, SHOWCASE_CREATORS, SHOWCASE_SKILLS, FEATURED_SHOWCASE_SLUGS, filterShowcaseCases, getShowcaseCase, getShowcaseCreator, getShowcaseCreatorHref, getShowcaseHandoff, getShowcaseImageSrc, getShowcaseSkill, getShowcaseAccessLabel, isMissingShowcasePath } from '../lib/showcase.ts'

const require = createRequire(import.meta.url)
const sharp = require(require.resolve('sharp', { paths: [require.resolve('next/package.json')] }))
const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url))
const file = (url) => path.join(publicDirectory, url.replace(/^\//, ''))
assert.equal(new Set(SHOWCASE_CASES.map((item) => item.slug)).size, SHOWCASE_CASES.length, 'Case URLs must be unique')
assert.equal(new Set(SHOWCASE_CREATORS.map((creator) => creator.id)).size, SHOWCASE_CREATORS.length, 'Creator identities must be unique')
assert.equal(new Set(SHOWCASE_SKILLS.map((skill) => skill.slug)).size, SHOWCASE_SKILLS.length, 'Skill records must be unique')
for (const skill of SHOWCASE_SKILLS) {
  assert.ok(getShowcaseCreator(skill.creatorId), 'Every skill must have an attributable creator')
  assert.ok(skill.sourceLicense && getShowcaseAccessLabel(skill, 'zh'))
  if (skill.access === 'paid' || skill.access === 'freemium') assert.ok(skill.listingIds.length, 'A paid skill must link to a commercial listing')
}
for (const creator of SHOWCASE_CREATORS) {
  const href = getShowcaseCreatorHref(creator)
  if (!creator.profile) assert.equal(href, creator.url, 'Do not invent an internal seller/profile identity from attribution')
}
for (const slug of FEATURED_SHOWCASE_SLUGS) assert.ok(getShowcaseCase(slug), `Broken homepage case: ${slug}`)

for (const item of SHOWCASE_CASES) {
  assert.match(item.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  assert.ok(SHOWCASE_CATEGORIES.some((entry) => entry.id === item.category))
  assert.ok(item.sourceUrl.startsWith('https://github.com/') && item.sourceUrl.includes(item.sourceRevision), `${item.slug}: immutable source missing`)
  assert.match(item.sourceRevision, /^[a-f0-9]{40}$/)
  await access(file(item.licenseUrl))
  assert.ok(getShowcaseCreator(item.creatorId) && getShowcaseSkill(item.skillSlug) && item.license && item.media.length)
  assert.equal(isMissingShowcasePath(`/showcase/${item.slug}`), false)
  assert.equal(isMissingShowcasePath(item.licenseUrl), false, 'Do not block source licenses')
  if (item.provenance === 'author') assert.equal(item.promptKind, 'suggested', `${item.slug}: do not invent an author's original prompt`)
  for (const locale of ['en', 'zh']) {
    for (const field of ['title', 'description', 'input', 'output', 'requirements', 'prompt', 'productionNote']) assert.ok(item[field][locale].trim(), `${item.slug}: missing ${locale} ${field}`)
    const handoff = getShowcaseHandoff(item, locale)
    assert.ok(handoff.includes(item.prompt[locale]), 'Setup must retain the entire task')
    assert.ok(handoff.includes(`/skills/${item.skillSlug}`) && handoff.includes(item.sourceUrl), 'Setup must include the skill and its source')
  }
  for (const media of item.media) {
    const metadata = await sharp(file(media.src)).metadata()
    assert.equal(metadata.width, media.width, `${media.src}: wrong width`)
    assert.equal(metadata.height, media.height, `${media.src}: wrong height`)
    assert.ok(media.alt.en && media.alt.zh)
    assert.equal(isMissingShowcasePath(media.src), false, 'Do not block originals')
    for (const kind of ['card', 'preview']) {
      const display = file(getShowcaseImageSrc(media.src, kind))
      assert.equal(isMissingShowcasePath(getShowcaseImageSrc(media.src, kind)), false, 'Do not block display images')
      await access(display)
      const variant = await sharp(display).metadata()
      assert.equal(variant.format, 'webp')
      assert.ok(variant.width <= (kind === 'card' ? 720 : 1600))
      assert.ok(Math.abs(variant.width / variant.height - media.width / media.height) < 0.005, 'Do not distort the artwork')
      if (kind === 'card') assert.ok((await stat(display)).size < 180 * 1024, `${media.src}: thumbnail exceeds 180 KB`)
    }
  }
  if (item.videoUrl) assert.ok(item.videoUrl.startsWith('https://raw.githubusercontent.com/') && item.videoUrl.includes(item.sourceRevision))
}
assert.equal(filterShowcaseCases('all', '').length, SHOWCASE_CASES.length)
assert.deepEqual(filterShowcaseCases('image', 'mono').map((item) => item.slug), ['room-to-grow-poster'])
assert.ok(filterShowcaseCases('all', '  花艺  ').some((item) => item.slug === 'floria-floral-studio'))
assert.equal(filterShowcaseCases('video', 'botanical').length, 0)
assert.equal(filterShowcaseCases('all', '', 'nexu-io').length, 4)
assert.deepEqual(filterShowcaseCases('all', 'Leonxlnx').map((item) => item.slug), ['floria-floral-studio'])
assert.deepEqual(filterShowcaseCases('all', '', 'yanliudesign').map((item) => item.slug), ['room-to-grow-poster'])
assert.equal(filterShowcaseCases('video', '', 'yanliudesign').length, 0)
const original = getShowcaseCase('room-to-grow-poster')
assert.equal(original.creatorId, 'openagentskill', 'Preserve actual artwork credit')
assert.equal(getShowcaseSkill(original.skillSlug).creatorId, 'yanliudesign', 'Preserve separate skill credit')
assert.equal(getShowcaseCreatorHref({ ...getShowcaseCreator('leonxlnx'), profile: { id: 'test-profile', username: 'verified-creator' } }), '/creators/verified-creator', 'A linked identity uses the existing creator profile route')
assert.equal(getShowcaseCase('missing-example'), undefined)
assert.equal(isMissingShowcasePath('/showcase/missing-example'), true)
assert.equal(isMissingShowcasePath('/showcase/unknown.png'), true)
assert.equal(isMissingShowcasePath('/showcase'), false)
assert.equal(isMissingShowcasePath('/skills'), false)
console.log(`Gallery checks passed: ${SHOWCASE_CASES.length} cases, linked creator/skill identities, media dimensions, optimized assets, creator filters and complete handoffs.`)
