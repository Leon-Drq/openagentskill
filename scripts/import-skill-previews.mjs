// Import only explicitly reviewed, pinned documentation images. Never execute
// repository code, crawl arbitrary URLs, or infer permission from a file suffix.
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const sharp = require(require.resolve('sharp', { paths: [require.resolve('next/package.json')] }))
const sources = JSON.parse(await readFile(path.join(root, 'lib/skill-preview-sources.json'), 'utf8'))
const { values } = parseArgs({ options: { 'cache-dir': { type: 'string' } } })
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const pending = []
const registry = []
async function checkedFile(source, file, expectedHash, limit) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(source.repository) || !/^[a-f0-9]{40}$/.test(source.revision)
    || file.split('/').some(part => !part || part === '..' || part === '.') || file.includes('\\')) throw new Error('Invalid pinned source')
  if (!/^[a-f0-9]{64}$/.test(expectedHash)) throw new Error('Invalid source hash')
  if (values['cache-dir']) {
    const cached = await readFile(path.join(values['cache-dir'], expectedHash))
    if (cached.length > limit || digest(cached) !== expectedHash) throw new Error(`Invalid cached source: ${file}`)
    return cached
  }
  const url = `https://raw.githubusercontent.com/${source.repository}/${source.revision}/${file.split('/').map(encodeURIComponent).join('/')}`
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' })
  if (!response.ok || Number(response.headers.get('content-length')) > limit) throw new Error(`Source unavailable or too large: ${file}`)
  const chunks = []; let size = 0
  for await (const chunk of response.body) {
    size += chunk.length
    if (size > limit) throw new Error(`Source too large: ${file}`)
    chunks.push(chunk)
  }
  const bytes = Buffer.concat(chunks)
  if (digest(bytes) !== expectedHash) throw new Error(`Source hash changed: ${file}`)
  return bytes
}
for (const source of sources) {
  if (!/^[a-z0-9-]+$/.test(source.skillSlug) || source.license !== 'MIT' || !source.media.length) throw new Error('Unsupported source definition')
  const base = `/skill-previews/${source.skillSlug}`
  const license = await checkedFile(source, source.licensePath, source.licenseSha256, 100000)
  const licenseUrl = `${base}/LICENSE-${source.licenseSha256.slice(0, 12)}.txt`
  pending.push([licenseUrl, license])
  const media = []
  for (const image of source.media) {
    const bytes = await checkedFile(source, image.path, image.sha256, 10 * 1024 * 1024)
    const metadata = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata()
    if (!['png', 'jpeg', 'webp'].includes(metadata.format) || (metadata.pages || 1) !== 1 || metadata.width < 240 || metadata.height < 160) throw new Error(`Invalid image: ${image.path}`)
    const stem = `${base}/${image.sha256.slice(0, 24)}`
    const src = `${stem}.${metadata.format === 'jpeg' ? 'jpg' : metadata.format}`
    pending.push([src, bytes])
    for (const [kind, width, quality] of [['card', 720, 78], ['preview', 1600, 84]]) {
      let display = await sharp(bytes).resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer()
      if (kind === 'card' && display.length > 180 * 1024) display = await sharp(bytes).resize({ width, withoutEnlargement: true }).webp({ quality: 50 }).toBuffer()
      if (kind === 'card' && display.length > 180 * 1024) throw new Error(`Thumbnail too large: ${image.path}`)
      pending.push([`${stem}.${kind}.webp`, display])
    }
    media.push({ src, cardSrc: `${stem}.card.webp`, previewSrc: `${stem}.preview.webp`, width: metadata.width, height: metadata.height,
      sha256: image.sha256, sourceUrl: `https://github.com/${source.repository}/blob/${source.revision}/${image.path}`,
      kind: image.kind, title: image.title, alt: image.alt })
  }
  registry.push({ skillSlug: source.skillSlug, repository: source.repository, revision: source.revision,
    sourceUrl: `https://github.com/${source.repository}/blob/${source.revision}/${source.sourcePath}`,
    license: source.license, licenseUrl, format: source.format, note: source.note, media })
}
// Validate the entire batch before writing; leave the published manifest intact
// when any source, license, hash or image check fails. URLs are content-addressed.
for (const [url, bytes] of pending) {
  const target = path.join(root, 'public', url)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, bytes)
}
await writeFile(path.join(root, 'lib/skill-previews.json'), JSON.stringify(registry, null, 2) + '\n')
console.log(`Imported ${registry.length} sources and ${registry.reduce((n, item) => n + item.media.length, 0)} attributed previews.`)
