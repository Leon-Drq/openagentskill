import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parse } from 'parse5'

const origin = new URL(process.argv[2] || 'http://localhost:3118').origin
const reportPath = '/reports/skill-readiness-2026-10-18'
const assetPath = '/research/skill-readiness-2026-10-18'
const canonical = `https://www.openagentskill.com${reportPath}`
const manifest = JSON.parse(readFileSync(new URL(`../public${assetPath}/manifest.json`, import.meta.url), 'utf8'))
const nodes = (root, tag) => [...(root.tagName === tag ? [root] : []), ...(root.childNodes || []).flatMap(child => nodes(child, tag))]
const attr = (node, key) => node.attrs?.find(item => item.name === key)?.value
const results = []
async function get(path) {
  const response = await fetch(`${origin}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(30_000) })
  assert.equal(response.status, 200, `${path}: expected HTTP 200`)
  const body = Buffer.from(await response.arrayBuffer())
  results.push({ path, status: response.status, bytes: body.length })
  return body
}
const report = (await get(reportPath)).toString('utf8')
const dom = parse(report)
assert.equal(nodes(dom, 'h1').length, 1, 'One report heading')
assert.ok(nodes(dom, 'link').some(node => attr(node, 'rel') === 'canonical' && attr(node, 'href') === canonical))
assert.ok(!nodes(dom, 'meta').some(node => attr(node, 'name') === 'robots' && /noindex/i.test(attr(node, 'content') || '')))
for (const file of ['source.json', ...Object.keys(manifest.outputs)]) {
  const body = await get(`${assetPath}/${file}`)
  const expected = file === 'source.json' ? manifest.sourceSha256 : manifest.outputs[file]
  assert.equal(createHash('sha256').update(body).digest('hex'), expected, `Frozen download hash: ${file}`)
}
const remoteManifest = JSON.parse((await get(`${assetPath}/manifest.json`)).toString('utf8'))
assert.deepEqual(remoteManifest, manifest, 'Published manifest matches the reviewed snapshot')
const creator = (await get('/creator-kit')).toString('utf8')
assert.ok(creator.includes('cite-your-listing') && creator.includes('citation-listing') && creator.includes(reportPath))
assert.ok((await get('/creator-resources/skill-case-study-template.md')).toString('utf8').includes('not tested'))
assert.ok((await get('/reports/state-of-agent-skills-2026')).toString('utf8').includes(reportPath))
assert.ok((await get('/sitemaps/core.xml')).toString('utf8').includes(canonical))
console.log(JSON.stringify({ origin, checks: results.length, frozenDataVerified: true, results }, null, 2))
