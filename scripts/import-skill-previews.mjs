// Import only explicitly reviewed, pinned documentation media. Never execute
// repository code, crawl arbitrary URLs, or infer permission from a file suffix.
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { renderAsset } from './skill-media/render.mjs'
import { curatedSourceUrls, fetchCuratedBytes } from './skill-media/curated-source.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const sharp = require(require.resolve('sharp', { paths: [require.resolve('next/package.json')] }))
const sources = JSON.parse(await readFile(path.join(root, 'lib/skill-preview-sources.json'), 'utf8'))
const { values } = parseArgs({ options: { 'cache-dir': { type: 'string' }, skill: { type: 'string' } } })
if (values.skill && !sources.some(source => source.skillSlug === values.skill)) throw new Error('Unknown curated skill')
const existing = values.skill ? JSON.parse(await readFile(path.join(root, 'lib/skill-previews.json'), 'utf8')) : []
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const pending = []
const registry = []
async function checkedFile(source, file, expectedHash, limit, releaseTag) {
  const { download } = curatedSourceUrls(source, file, releaseTag)
  if (!/^[a-f0-9]{64}$/.test(expectedHash)) throw new Error('Invalid source hash')
  if (values['cache-dir']) {
    const cached = await readFile(path.join(values['cache-dir'], expectedHash))
    if (cached.length > limit || digest(cached) !== expectedHash) throw new Error(`Invalid cached source: ${file}`)
    return cached
  }
  return fetchCuratedBytes(download, expectedHash, limit)
}
for (const source of sources) {
  if (values.skill && source.skillSlug !== values.skill) {
    const previous = existing.find(item => item.skillSlug === source.skillSlug)
    if (!previous) throw new Error('Run the complete importer before a scoped import')
    registry.push(previous)
    continue
  }
  if (!/^[a-z0-9-]+$/.test(source.skillSlug) || source.license !== 'MIT' || !source.media.length) throw new Error('Unsupported source definition')
  const base = `/skill-previews/${source.skillSlug}`
  const license = await checkedFile(source, source.licensePath, source.licenseSha256, 100000)
  const licenseUrl = `${base}/LICENSE-${source.licenseSha256.slice(0, 12)}.txt`
  pending.push([licenseUrl, license])
  const document = source.media.some(item => item.releaseTag !== undefined || item.poster?.releaseTag !== undefined)
    ? (await checkedFile(source, source.sourcePath, source.documentSha256, 1024 * 1024)).toString('utf8') : null
  const media = []
  for (const image of source.media) {
    const { sourceUrl } = curatedSourceUrls(source, image.path, image.releaseTag)
    if (image.releaseTag !== undefined && !document.includes(sourceUrl)) throw new Error('Release asset is not linked by pinned source document')
    const video = /\.(mp4|webm)$/i.test(image.path)
    const bytes = await checkedFile(source, image.path, image.sha256, (video ? 20 : 10) * 1024 * 1024, image.releaseTag)
    if (/\.gif$/i.test(image.path)) {
      const rendered = await renderAsset(bytes, image.path)
      const relocate = url => url.replace('/skill-previews/auto/', `${base}/`)
      for (const [url, content] of rendered.files) pending.push([relocate(url), content])
      const item = rendered.media
      media.push({ ...item, src: relocate(item.src), cardSrc: relocate(item.cardSrc),
        previewSrc: relocate(item.previewSrc), originalSrc: relocate(item.originalSrc),
        sourceUrl, kind: image.kind, title: image.title, alt: image.alt })
      continue
    }
    if (video) {
      const rendered = await renderAsset(bytes, image.path)
      // Keep curated files separate from automatic collection and its pruning.
      const relocate = url => url.replace('/skill-previews/auto/', `${base}/`)
      for (const [url, content] of rendered.files) {
        if (!image.poster || url === rendered.media.videoSrc) pending.push([relocate(url), content])
      }
      const item = rendered.media
      let poster = {}
      if (image.poster) {
        const definition = image.poster
        if (!/\.(png|jpe?g|webp)$/i.test(definition.path)) throw new Error('Unsupported video poster')
        const { sourceUrl: posterSourceUrl } = curatedSourceUrls(source, definition.path, definition.releaseTag)
        if (definition.releaseTag !== undefined && !document?.includes(posterSourceUrl)) throw new Error('Poster is not linked by pinned source document')
        const posterBytes = await checkedFile(source, definition.path, definition.sha256, 10 * 1024 * 1024, definition.releaseTag)
        const result = await renderAsset(posterBytes, definition.path)
        for (const [url, content] of result.files) pending.push([relocate(url), content])
        poster = { src: relocate(result.media.src), cardSrc: relocate(result.media.cardSrc),
          previewSrc: relocate(result.media.previewSrc), width: result.media.width, height: result.media.height,
          posterOriginalSrc: relocate(result.media.originalSrc), posterSourceUrl, posterSha256: definition.sha256 }
      }
      media.push({ ...item, src: relocate(item.src), cardSrc: relocate(item.cardSrc),
        previewSrc: relocate(item.previewSrc), videoSrc: relocate(item.videoSrc), ...poster,
        sourceUrl,
        kind: image.kind, title: image.title, alt: image.alt })
      continue
    }
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
      sha256: image.sha256, sourceUrl,
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
