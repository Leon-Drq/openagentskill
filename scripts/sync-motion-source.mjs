import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { parse } from 'parse5'

// Import only source metadata and remote media addresses. Do not mirror films,
// copy prompts into the public catalog, or execute anything from source pages.
const path = 'lib/motion/catalog.json'
const catalog = JSON.parse(await readFile(path, 'utf8'))
const root = 'artifacts/motion-source-v2'
await mkdir(root, { recursive: true })
const nodes = n => [n, ...(n.childNodes || []).flatMap(nodes)]
const attr = (n, key) => n?.attrs?.find(a => a.name === key)?.value || ''
const text = n => n?.nodeName === '#text' ? n.value : (n?.childNodes || []).map(text).join('')
const mediaUrl = value => {
  const url = new URL(value)
  assert.equal(url.protocol, 'https:')
  assert.equal(url.hostname, 'media.prompt-motion.com')
  assert.ok(!url.username && !url.password && !url.port)
  return url.href
}
const sourceRecords = []
let cursor = 0
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < catalog.entries.length) {
    const entry = catalog.entries[cursor++]
    const response = await fetch(entry.sourceUrl, { signal: AbortSignal.timeout(30000) })
    assert.equal(response.status, 200, entry.id)
    const html = await response.text()
    const all = nodes(parse(html))
    const video = all.find(n => n.tagName === 'video')
    const schema = all.filter(n => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json')
      .map(n => JSON.parse(text(n))).find(n => n['@type'] === 'VideoObject')
    assert.ok(video && schema, entry.id)
    const videoUrl = mediaUrl(attr(video, 'src'))
    assert.equal(videoUrl, schema.contentUrl, entry.id)
    const posterUrl = mediaUrl(schema.thumbnailUrl[0])
    assert.ok(all.some(n => n.tagName === 'img' && attr(n, 'src') === posterUrl))
    const prompt = all.find(n => n.tagName === 'div' && attr(n, 'class').includes('whitespace-pre-wrap'))
    const promptText = prompt ? text(prompt).trim() : null
    const promptSha256 = promptText ? createHash('sha256').update(promptText).digest('hex') : null
    const sourcePost = all.find(n => n.tagName === 'a' && /https:\/\/x\.com\/[^/]+\/status\/\d+/.test(attr(n, 'href')))
    const record = {
      id: entry.id, number: entry.number, title: text(all.find(n => n.tagName === 'h1')).trim(),
      family: entry.family, sourceUrl: entry.sourceUrl,
      sourceAuthor: new URL(schema.creator.url).pathname.replace(/^\//, ''),
      sourceCreatorName: schema.creator.name, sourcePost: sourcePost ? attr(sourcePost, 'href') : null,
      sourceRepo: entry.sourceRepo, tags: entry.tags, videoUrl, posterUrl,
      width: Number(attr(video, 'width')), height: Number(attr(video, 'height')),
      sourcePublishedAt: schema.uploadDate, sourceKind: promptText ? 'prompt' : 'skill',
      promptSha256, access: 'paid', checkout: 'release-gated',
      status: 'text-delivery', deliveryKind: promptText ? 'prompt' : 'skill-instructions', reproductionStatus: 'not-verified', version: '3.0.0',
    }
    assert.ok(record.width > 0 && record.height > 0)
    assert.ok(record.sourceKind === 'prompt' || record.sourceRepo, entry.id)
    sourceRecords.push(record)
    await writeFile(`${root}/${entry.id}.json`, JSON.stringify({ ...record, sourceHtmlSha256: createHash('sha256').update(html).digest('hex') }, null, 2))
  }
}))
sourceRecords.sort((a,b) => a.number - b.number)
assert.equal(sourceRecords.length, 233)
await writeFile(path, JSON.stringify({ version: '3.0.0', capturedAt: new Date().toISOString(), sourceCount: sourceRecords.length, entries: sourceRecords }, null, 2)+'\n')
console.log(`Matched ${sourceRecords.length} original videos and posters; ${sourceRecords.filter(e=>e.sourceKind==='prompt').length} prompt references, ${sourceRecords.filter(e=>e.sourceKind==='skill').length} Skill references.`)
