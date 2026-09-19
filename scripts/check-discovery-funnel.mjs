// Read-only HTTP smoke check. No installs, publication, analytics POSTs or LLM calls.
import assert from 'node:assert/strict'

const base = process.argv[2] || 'http://localhost:3117'
const canonical = 'https://www.openagentskill.com/skills'
// Text extraction only; never HTML sanitization or content for insertion.
// Keep separators rather than joining fragments into new markup sequences.
const text = html => html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
const cards = html => [...html.matchAll(/<article\b[^>]*data-directory-skill[^>]*>([\s\S]*?)<\/article>/g)]
  .map(([, card]) => card.match(/<h3\b[^>]*>[\s\S]*?href="([^"]+)"/)?.[1])
async function page(path, indexable = false) {
  const start = Date.now()
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30000) })
  assert.equal(response.status, 200, path)
  const html = await response.text()
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `${path}: one H1`)
  const locale = new URL(response.url).pathname.match(/^\/(zh|ja|ko|es|de|fr|id)\/skills$/)?.[1]
  const expectedCanonical = locale ? `https://www.openagentskill.com/${locale}/skills` : canonical
  assert.ok(html.includes(`rel="canonical" href="${expectedCanonical}"`), `${path}: canonical`)
  const robots = html.match(/<meta name="robots" content="([^"]+)"/)?.[1]
  assert.equal(robots, indexable ? 'index, follow' : 'noindex, follow', `${path}: robots`)
  assert.ok(html.includes('skills-directory-jsonld'), `${path}: structured data`)
  assert.ok(!html.includes('NEXT_HTTP_ERROR_FALLBACK;500'), `${path}: no server error`)
  console.log(JSON.stringify({ path, status: response.status, cards: cards(html).length, ms: Date.now() - start, robots }))
  return html
}
await page('/skills', true)
const first = await page('/skills?view=all&sort=stars')
const second = await page('/skills?view=all&sort=stars&page=2')
assert.ok(cards(first).length > 0 && cards(second).length > 0)
assert.equal(cards(first).filter(slug => cards(second).includes(slug)).length, 0, 'Adjacent catalog pages do not repeat slugs')
const total = Number(text(first).match(/([\d,]+) public entries/)?.[1].replaceAll(',', ''))
assert.ok(total > 480, 'Full catalog is not a truncated candidate pool')
assert.ok(cards(await page('/skills?view=all&page=31')).length > 0)
const last = await page(`/skills?view=all&page=${Math.ceil(total / 16)}`)
assert.ok(!/<a[^>]*rel="next"/.test(last), 'Final page has no next link')
const filtered = await page('/skills?view=all&category=presentation&minStars=100&sort=stars')
assert.ok(cards(filtered).length > 0)
for (const locale of ['zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']) {
  const localized = await page(`/skills?view=all&lang=${locale}`)
  assert.ok(cards(localized).length > 0, `${locale}: visible catalog`)
}
const slides = await page('/skills?q=' + encodeURIComponent('生成幻灯片'))
assert.ok(cards(slides).length > 0, 'Chinese presentation query retrieves candidates')
const unknown = await page('/skills?q=oas-nonexistent-qa-739182640')
assert.equal(cards(unknown).length, 0, 'Unmatched tasks do not receive irrelevant recommendations')
assert.ok(text(unknown).includes('No matching skills'), 'Healthy zero results are distinct from an outage')
console.log('Discovery HTTP checks passed: deep pagination, no adjacent duplicates, filters, eight locales, Chinese retrieval and unchanged canonical/index policy.')
