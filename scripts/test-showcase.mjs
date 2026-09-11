import assert from 'node:assert/strict'
import { access, readFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { getShowcasePage, getShowcaseEvidenceLabel } from '../lib/showcase.ts'
import { SHOWCASE_TAGS, getShowcaseTags } from '../lib/showcase.ts'
import { SHOWCASE_VIDEO_SKILLS } from '../lib/showcase-video-skills.ts'
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
  if (!creator.profile) assert.ok(href === creator.url || href === `/creators/github/${creator.githubUsername?.toLowerCase()}`, 'Only explicit public GitHub attribution pages may link internally without account verification')
}
for (const slug of FEATURED_SHOWCASE_SLUGS) assert.ok(getShowcaseCase(slug), `Broken homepage case: ${slug}`)
const zine = getShowcaseCase('gc-minimal-zine-posters')
assert.equal(zine.provenance, 'author')
assert.equal(zine.promptKind, 'suggested')
assert.equal(zine.media.length, 3)
assert.equal(zine.skillSlug, 'liamgvchi-gc-minimal-zine-poster-v0-3')
assert.equal(zine.sourceRevision, 'ddb0d66b24a94f9c4fdd1f02835a836a2db3774e')

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
assert.equal(new Set(SHOWCASE_TAGS.map((tag) => tag.id)).size, SHOWCASE_TAGS.length)
for (const tag of SHOWCASE_TAGS) assert.ok(filterShowcaseCases('all', '', '', tag.id).length > 0, `Use case ${tag.id} needs real examples`)
assert.equal(filterShowcaseCases('video', '', '', 'product-demo').length, 2)
assert.equal(filterShowcaseCases('video', '', '', 'explainer').length, 4)
assert.equal(filterShowcaseCases('video', '', '', 'data-story').length, 4)
const playerSource = await readFile(new URL('../components/showcase-video-player.tsx', import.meta.url), 'utf8')
assert.ok(playerSource.includes('started && !failed ? <video'), 'Do not attach video sources before user interaction')
assert.ok(playerSource.includes('preload="none"') && playerSource.includes('video.pause()'), 'Keep video loading explicit and only one preview audible')
for (const component of ['showcase-card', 'showcase-detail']) {
  const source = await readFile(new URL(`../components/${component}.tsx`, import.meta.url), 'utf8')
  assert.ok(source.includes('<ShowcaseVideoPlayer'), 'Cards and detail must share the same player')
}
const gallerySource = await readFile(new URL('../components/showcase-gallery.tsx', import.meta.url), 'utf8')
const cardLayoutSource = await readFile(new URL('../components/showcase-card.tsx', import.meta.url), 'utf8')
assert.ok(cardLayoutSource.includes('group flex h-full min-w-0 flex-col'), 'Gallery cards must stretch to equal row height')
assert.ok(cardLayoutSource.includes('min-h-11 line-clamp-2 break-words'), 'Reserve two title lines without overflowing long titles')
assert.ok(cardLayoutSource.includes('mt-3 flex min-h-9 flex-wrap'), 'Keep a tag slot for untagged cards, and allow longer tags to wrap')
assert.ok(cardLayoutSource.includes('className="mt-auto pt-4" data-showcase-footer'), 'Anchor creator credit and actions together at the card bottom')
assert.ok(gallerySource.includes('Filter by use case') && !gallerySource.includes('#video-skills'), 'Use-case controls must not mix in navigation to a skill directory')
const logoSlugs = ['ip-mascot-directions', 'motion-logo-outro']
assert.deepEqual(filterShowcaseCases('all', '', '', 'logo').map((item) => item.slug).sort(), logoSlugs)
assert.equal(filterShowcaseCases('image', '', '', 'logo').length, 1)
assert.equal(filterShowcaseCases('video', '', '', 'logo').length, 1)
assert.equal(filterShowcaseCases('slides', '', '', 'logo').length, 0)
assert.equal(filterShowcaseCases('all', '', 'yanliudesign', 'logo').length, 0)
assert.equal(getShowcasePage(filterShowcaseCases('all', '', '', 'logo'), '5').page, 1)
for (const slug of logoSlugs) {
  assert.ok(getShowcaseCase(slug))
  assert.equal(getShowcaseTags({ slug })[0].id, 'logo')
  for (const query of ['logo', '标识', '吉祥物']) assert.ok(filterShowcaseCases('all', query).some((item) => item.slug === slug))
}
assert.equal(getShowcaseTags({ slug: 'room-to-grow-poster' }).length, 0, 'Do not label all image work as a logo')
assert.equal(SHOWCASE_VIDEO_SKILLS.length, 5)
assert.equal(new Set(SHOWCASE_VIDEO_SKILLS.map((skill) => skill.slug)).size, 5)
for (const skill of SHOWCASE_VIDEO_SKILLS) {
  assert.match(skill.slug, /^[a-z0-9-]+$/)
  assert.match(skill.source, /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[a-f0-9]{40}\//)
  for (const locale of ['en', 'zh']) assert.ok(skill.purpose[locale] && skill.requirements[locale])
}
assert.deepEqual(filterShowcaseCases('image', 'mono').map((item) => item.slug), ['room-to-grow-poster'])
assert.ok(filterShowcaseCases('all', '  花艺  ').some((item) => item.slug === 'floria-floral-studio'))
assert.equal(filterShowcaseCases('video', 'botanical').length, 0)
assert.equal(filterShowcaseCases('all', '', 'nexu-io').length, 32)
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
assert.equal(SHOWCASE_CASES.length, 101, 'The zine series adds one case, not three duplicate skill listings')
assert.equal(SHOWCASE_SKILLS.length, 15, 'Cases must link to real skill/workflow entries')
const seeds = JSON.parse(await readFile(new URL('../lib/showcase-curation.json', import.meta.url), 'utf8'))
const mediaManifest = JSON.parse(await readFile(new URL('../lib/showcase-media.json', import.meta.url), 'utf8'))
const sources = JSON.parse(await readFile(new URL('../lib/showcase-sources.json', import.meta.url), 'utf8'))
const groups = JSON.parse(await readFile(new URL('../lib/showcase-groups.json', import.meta.url), 'utf8'))
const hashes = new Set()
const sourceUrls = new Set()
for (const entry of seeds) {
  const item = getShowcaseCase(entry.slug)
  const group = groups[entry.group]
  const source = sources[group.source]
  assert.ok(item && item.provenance === 'author' && item.promptKind === 'suggested')
  assert.equal(item.evidenceKind, group.evidenceKind)
  for (let index = 0; index < entry.assets.length; index++) {
    const meta = mediaManifest[`${entry.slug}:${index}`]
    const actual = createHash('sha256').update(await readFile(file(meta.src))).digest('hex')
    assert.equal(actual, meta.sha256, `${meta.src}: original changed`)
    assert.equal(meta.sourceUrl, `https://raw.githubusercontent.com/${source.repo}/${source.revision}/${entry.assets[index]}`)
    assert.ok(!hashes.has(actual), 'Do not split identical artwork into multiple cases')
    assert.ok(!sourceUrls.has(meta.sourceUrl), 'Do not reuse a source image to pad the gallery')
    hashes.add(actual); sourceUrls.add(meta.sourceUrl)
  }
}
assert.match(getShowcaseEvidenceLabel(getShowcaseCase('frontend-capsule'), 'en'), /template/)
assert.match(getShowcaseEvidenceLabel(getShowcaseCase('baoyu-infographic-bridge'), 'zh'), /风格/)
assert.equal(getShowcaseCase('motion-decision-tree').creatorId, 'heygen-com', 'Preserve upstream artwork author, not just the bundler')
const migrated = await readFile(new URL('../supabase/migrations/20260907173900_gallery_curated_hundred.sql', import.meta.url), 'utf8')
assert.deepEqual(new Set([...migrated.matchAll(/\('([a-z0-9-]+)'\)/g)].map((match) => match[1])), new Set(seeds.map((entry) => entry.slug)), 'Every added case must be registered for voting')
assert.match(migrated, /on conflict \(slug\) do nothing/i, 'Migration must preserve existing votes and be idempotent')
const pages = Array.from({ length: 5 }, (_, index) => getShowcasePage(SHOWCASE_CASES, String(index + 1)))
assert.deepEqual(pages.map((page) => page.items.length), [24, 24, 24, 24, 5])
assert.deepEqual(pages.flatMap((page) => page.items.map((item) => item.slug)), SHOWCASE_CASES.map((item) => item.slug), 'Paging loses or duplicates cases')
for (const invalid of [undefined, '', '0', '-2', 'NaN', '1.5', '1e2', '999999999999999']) assert.equal(getShowcasePage(SHOWCASE_CASES, invalid).page, 1)
assert.equal(getShowcasePage(SHOWCASE_CASES, '999').page, 5)
assert.deepEqual(getShowcasePage([], '99'), { page: 1, pageCount: 1, offset: 0, items: [], total: 0 })
assert.equal(getShowcasePage(filterShowcaseCases('all', '', 's1dashu'), '5').items.length, 1)
console.log(`Gallery checks passed: ${SHOWCASE_CASES.length} cases, linked creator/skill identities, media dimensions, optimized assets, creator filters and complete handoffs.`)
