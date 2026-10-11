import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { locales } from '../lib/i18n/config.ts'
import { studioCopy } from '../lib/i18n/studio-copy.ts'
import { studioUiCopy } from '../lib/i18n/studio-ui-copy.ts'
import { MEMBERSHIP, STUDIO_SKILL, studioImage } from '../lib/studio/catalog.ts'
import { studioMetadata, studioPageData, studioSitemapEntries } from '../lib/studio/seo.ts'
import { getLanguageSwitchHref, getLocalizedNavigationHref } from '../lib/i18n/market-routing.ts'

assert.equal(STUDIO_SKILL.status, 'preview')
assert.equal(STUDIO_SKILL.plannedPriceCents, 499, 'Owner-set standalone price is USD 4.99')
assert.equal(MEMBERSHIP.monthlyCents, 999)
assert.equal(MEMBERSHIP.yearlyCents, 7900)
assert.equal(MEMBERSHIP.purchasableSkills, 0)
const entries = studioSitemapEntries()
assert.equal(entries.length, locales.length * 2)
assert.equal(new Set(entries.map(entry => entry.url)).size, entries.length)
for (const locale of locales) {
  const copy = studioCopy(locale)
  const ui = studioUiCopy(locale)
  assert.deepEqual(Object.keys(ui).sort(), Object.keys(studioUiCopy('en')).sort())
  for (const value of Object.values(ui)) assert.ok(typeof value === 'string' && value.trim())
  assert.deepEqual(Object.keys(copy).sort(), Object.keys(studioCopy('en')).sort())
  for (const value of Object.values(copy).flat(2)) assert.ok(typeof value === 'string' && value.trim())
  assert.equal(copy.questions.length, 4)
  for (const [kind, path] of [['skill', STUDIO_SKILL.path], ['membership', '/membership']]) {
    const expected = `${locale === 'en' ? '' : '/' + locale}${path}`
    const url = `https://www.openagentskill.com${expected}`
    assert.equal(getLocalizedNavigationHref(path, locale), expected)
    assert.equal(getLanguageSwitchHref(`/zh${path}`, locale, '?source=nav&lang=zh', '#plans'), `${expected}?source=nav#plans`)
    const metadata = studioMetadata(locale, kind)
    assert.equal(metadata.alternates.canonical, url)
    assert.equal(metadata.alternates.languages[locale], url)
    assert.equal(Object.keys(metadata.alternates.languages).length, 9)
    assert.deepEqual(entries.find(entry => entry.url === url).alternates, metadata.alternates && { languages: metadata.alternates.languages })
    assert.equal(studioPageData(locale, kind).url, url)
    assert.doesNotMatch(JSON.stringify(studioPageData(locale, kind)), /Offer|AggregateRating|InStock/)
  }
}
assert.equal(studioImage('../../private'), studioImage('wide'))
for (const format of STUDIO_SKILL.formats) {
  const svg = await readFile(new URL(`../public${studioImage(format.id)}`, import.meta.url), 'utf8')
  assert.match(svg, new RegExp(`width="${format.width}" height="${format.height}"`))
  assert.doesNotMatch(svg, /<script|<foreignObject|onload=|href=/i)
  assert.match(svg, /<title id="title">OpenAgentSkill/)
}
console.log('Studio preview: 8 locales, 16 canonical/sitemap routes, cross-language navigation and safe assets passed.')
