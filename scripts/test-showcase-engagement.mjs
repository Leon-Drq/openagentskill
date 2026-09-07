import assert from 'node:assert/strict'
import { SHOWCASE_CASES } from '../lib/showcase.ts'
import { getShowcaseShareUrl, sortShowcaseCases } from '../lib/showcase-engagement.ts'

const original = SHOWCASE_CASES.map((item) => item.slug)
const [first, second, third] = SHOWCASE_CASES
const stats = { [second.slug]: { likes: 9, dislikes: 2, vote: 1 }, [third.slug]: { likes: 7, dislikes: 0, vote: null } }
assert.deepEqual(sortShowcaseCases(SHOWCASE_CASES, 'top', stats).slice(0, 3).map((item) => item.slug), [second.slug, third.slug, first.slug])
assert.deepEqual(sortShowcaseCases(SHOWCASE_CASES, 'top', {}).map((item) => item.slug), original)
assert.deepEqual(sortShowcaseCases(SHOWCASE_CASES, 'curated', stats).map((item) => item.slug), original)
assert.deepEqual(SHOWCASE_CASES.map((item) => item.slug), original, 'sorting must not mutate the catalog')
assert.equal(sortShowcaseCases([first, third], 'top', stats)[0].slug, third.slug, 'filters apply before ranking')
assert.equal(sortShowcaseCases([first, second], 'top', { [second.slug]: { likes: 3, dislikes: 4, vote: -1 } })[0].slug, first.slug, 'dislikes reduce the rank')
for (const locale of ['en', 'zh']) {
  const url = new URL(getShowcaseShareUrl(first.slug, locale))
  assert.equal(url.origin, 'https://www.openagentskill.com')
  assert.equal(url.pathname, `/showcase/${first.slug}`)
  assert.equal(url.searchParams.get('lang'), locale === 'en' ? null : locale)
  assert.equal(url.searchParams.get('utm_source'), 'gallery')
  assert.equal(url.searchParams.get('utm_medium'), 'share')
  assert.equal(url.searchParams.get('utm_campaign'), 'skill_gallery')
}
console.log('Gallery ranking, stable ties, filters and share attribution passed.')
