import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { parse } from 'parse5'
import { TASK_PLAYBOOKS } from '../lib/seo/task-playbooks.ts'

const origin = new URL(process.argv[2] || 'https://www.openagentskill.com')
const nodes = node => [node, ...(node.childNodes || []).flatMap(nodes)]
const attrs = node => Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]))
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('')
const results = []
for (const [slug, playbook] of Object.entries(TASK_PLAYBOOKS)) {
  const path = `/best/${slug}`
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000) })
  assert.equal(response.status, 200, path)
  const all = nodes(parse(await response.text()))
  assert.equal(all.filter(n => n.tagName === 'h1').length, 1, path)
  assert.equal(attrs(all.find(n => n.tagName === 'link' && attrs(n).rel === 'canonical')).href, `https://www.openagentskill.com${path}`)
  assert.ok(!all.some(n => n.tagName === 'meta' && /^(robots|googlebot)$/i.test(attrs(n).name || '') && /noindex/.test(attrs(n).content || '')), path)
  const section = all.find(n => attrs(n)['data-task-playbook'] === playbook.id)
  assert.ok(section && text(section).includes(playbook.brief), `${path}: visible server-rendered task brief`)
  const ids = all.map(n => attrs(n).id).filter(Boolean)
  assert.equal(new Set(ids).size, ids.length, `${path}: unique anchors`)
  for (const link of all.filter(n => n.tagName === 'a' && attrs(n).href?.startsWith('#'))) assert.ok(ids.includes(attrs(link).href.slice(1)), `${path}: anchor ${attrs(link).href}`)
  const graph = all.filter(n => n.tagName === 'script' && attrs(n).type === 'application/ld+json').flatMap(n => JSON.parse(text(n))['@graph'] || [])
  assert.equal(graph.find(n => n['@type'] === 'CollectionPage').dateModified, playbook.updatedAt)
  assert.ok(all.some(n => n.tagName === 'time' && attrs(n).datetime === playbook.updatedAt))
  results.push({ path, status: response.status, updatedAt: playbook.updatedAt })
}
const notesResponse = await fetch(new URL('/examples/topic-growth/production-notes.json', origin))
assert.equal(notesResponse.status, 200)
const notes = await notesResponse.json()
for (const [file, info] of Object.entries(notes.files)) {
  const response = await fetch(new URL(`/examples/topic-growth/${file}`, origin), { signal: AbortSignal.timeout(30000) })
  assert.equal(response.status, 200, file)
  const bytes = Buffer.from(await response.arrayBuffer())
  assert.equal(createHash('sha256').update(bytes).digest('hex'), info.sha256, file)
  if (file.endsWith('.pdf') && origin.protocol === 'https:') assert.match(response.headers.get('X-Robots-Tag') || '', /noindex/)
}
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), origin: origin.origin, pages: results, exampleAssets: Object.keys(notes.files).length }, null, 2))
