import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseSkillryDirectory, planSnapshot, selectSkillryRows, fetchPublicPage } from './skillry/core.mjs'

const template = { slug: 'bs-test', name: 'Test', outputType: 'image', downloadCount: 11, priceUsdCents: 0, isFeatured: false,
  publishedAt: '2026-10-01T00:00:00.000Z', previewImageUrls: ['/skills/bs-test/media/preview-1.webp?v=public'], previewVideoUrl: null,
  tags: [{ kind: 'task', value: 'create-image', label: 'Create image' }] }
const serialize = rows => `<script>const state = { publishedSkills: ${JSON.stringify(rows)} }</script>`
const rows = [10, 11, 9].map((downloadCount, index) => ({ ...template, slug: `bs-test-${index}`, downloadCount }))
rows.push({ ...template, slug: 'bs-paid', priceUsdCents: 499 })
assert.deepEqual(selectSkillryRows(parseSkillryDirectory(serialize(rows))).map(row => row.slug), ['bs-test-1'])
assert.deepEqual(selectSkillryRows(rows, true).map(row => row.slug), ['bs-test-1', 'bs-paid'])
assert.throws(() => parseSkillryDirectory(serialize([{ ...template, downloadCount: '11' }])) )
assert.throws(() => parseSkillryDirectory(serialize([{ ...template, priceUsdCents: null }])) )
assert.throws(() => parseSkillryDirectory(serialize([{ ...template, previewImageUrls: ['https://evil.example/a.webp'] }])) )
assert.throws(() => parseSkillryDirectory(serialize([template, template])), /Duplicate/)
assert.throws(() => parseSkillryDirectory('<script>const x={publishedSkills: [(()=>{globalThis.executed=true;return {}})()]}</script>'), /Unsupported/)
assert.equal(globalThis.executed, undefined)
assert.throws(() => parseSkillryDirectory('Login required'), /complete/)
assert.throws(() => parseSkillryDirectory('x'.repeat(8 * 1024 * 1024 + 1)), /byte limit/)
const now = '2026-10-03T01:00:00.000Z', sourceHash = 'a'.repeat(64)
const next = planSnapshot(rows, null, { now, sourceHash, paidPermitted: true })
assert.equal(next.entries.length, 2)
assert.deepEqual(planSnapshot(rows, next, { now: '2026-10-10T01:00:00.000Z', sourceHash: 'b'.repeat(64), paidPermitted: true }), next, 'Identical public fields do not churn commits')
const removed = planSnapshot(rows.map(row => ({ ...row, downloadCount: 0 })), next, { now, sourceHash, paidPermitted: true })
assert.equal(removed.entries.length, 0)
assert.equal(removed.archived.length, 2, 'Old URLs and saves survive loss of directory eligibility')
assert.throws(() => planSnapshot([template], { ...next, sourceCount: 100 }, { now, sourceHash, paidPermitted: true }), /shrank/)
const renewed = planSnapshot(rows, next, { now: '2026-11-10T01:00:00.000Z', sourceHash, paidPermitted: true })
assert.equal(renewed.entries[0].observedAt, '2026-11-10T01:00:00.000Z', 'Pricing evidence refreshed even if fields do not change')
await assert.rejects(fetchPublicPage('https://skillry.dev/skills', async () => new Response('Unavailable', { status: 503 })), /unavailable/)
const snapshot = JSON.parse(readFileSync('lib/skills/skillry-snapshot.json', 'utf8'))
assert.equal(snapshot.policy.minimumExclusiveDownloads, 10)
assert.ok(snapshot.entries.some(row => row.priceUsdCents > 0) && snapshot.entries.some(row => row.priceUsdCents === 0))
assert.ok(snapshot.entries.every(row => row.downloadCount > 10))
console.log('Skillry sync: strict threshold, Free/paid selection, data-only parser, stable updates, archives and failed-source retention passed.')
