import { register } from 'node:module'
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
register('./test-owner-publication-loader.mjs', import.meta.url)

const hosts = new Set(['skillry.dev', 'raw.githubusercontent.com', 'github.com', 'storage.googleapis.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com', 'github-production-user-asset-6210df.s3.amazonaws.com'])
export function publicMediaUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !hosts.has(url.hostname)) throw Error('Unapproved media host')
  return url
}
export function mediaSignature(bytes, type) {
  if (type === 'video') return bytes.subarray(4, 8).toString() === 'ftyp' || bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
  if (type === 'pdf') return bytes.subarray(0, 5).toString() === '%PDF-'
  if (type === 'pptx') return bytes.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4]))
  return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString()) ||
    (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
    (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP')
}

// Range GET catches HTML error pages returned with HTTP 200. Cancel the stream
// immediately after its first chunk; never download whole remote videos.
export async function probeMedia(url, type, fetcher = fetch) {
  let target = url
  for (let hop = 0; hop < 4; hop++) {
    publicMediaUrl(target)
    const response = await fetcher(target, { redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { Range: 'bytes=0-63', 'User-Agent': 'OpenAgentSkill-MediaAudit/1.0' } })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel()
      const location = response.headers.get('location')
      if (!location) throw Error('Redirect without destination')
      target = new URL(location, target).href
      continue
    }
    if (![200, 206].includes(response.status)) { await response.body?.cancel(); throw Error(`HTTP ${response.status}`) }
    const reader = response.body?.getReader()
    if (!reader) throw Error('Empty media response')
    const chunks = []; let size = 0
    try {
      while (size < 16) {
        const { value, done } = await reader.read()
        if (done) break
        chunks.push(Buffer.from(value).subarray(0, 64)); size += value.length
      }
    } finally { await reader.cancel() }
    if (!mediaSignature(Buffer.concat(chunks), type)) throw Error(`Not a supported ${type} file`)
    return { status: response.status, type }
  }
  throw Error('Too many redirects')
}

export async function auditMedia({ catalog, remote = false, fetcher = fetch, output = 'artifacts/skill-media-audit.json' } = {}) {
  const { SHOWCASE_CASES, getShowcasesForSkill, getShowcaseImageSrc } = await import('../lib/showcase.ts')
  const { SKILL_SOURCE_PREVIEWS, getSkillSourcePreview } = await import('../lib/skill-previews.ts')
  const { EXTERNAL_SKILLS } = await import('../lib/skills/external-catalog.ts')
  const { toProviderDirectorySkill } = await import('../lib/skills/provider-directory.ts')
  const bindings = JSON.parse(await readFile('lib/skill-preview-bindings.json', 'utf8'))
  const assets = new Map(), errors = []
  const add = (url, type, slug) => {
    if (!url) { errors.push({ slug, error: `Missing ${type} URL` }); return }
    const existing = assets.get(url)
    if (existing && existing.type !== type) errors.push({ slug, url, error: 'Conflicting media types' })
    if (existing) existing.skills.add(slug)
    else assets.set(url, { type, skills: new Set([slug]) })
  }
  for (const item of SHOWCASE_CASES) {
    for (const media of item.media) {
      for (const src of [media.src, getShowcaseImageSrc(media.src, 'card'), getShowcaseImageSrc(media.src, 'preview')]) add(src, 'image', item.skillSlug)
      if (!media.alt.en || !media.alt.zh || media.width <= 0 || media.height <= 0) errors.push({ slug: item.slug, error: 'Missing alt text or dimensions' })
    }
    if (item.videoUrl) add(item.videoUrl, 'video', item.skillSlug)
  }
  for (const preview of SKILL_SOURCE_PREVIEWS) for (const media of preview.media) {
    for (const src of [media.src, media.cardSrc, media.previewSrc]) add(src, 'image', preview.skillSlug)
    if (media.videoSrc) add(media.videoSrc, 'video', preview.skillSlug)
    if (media.originalSrc) add(media.originalSrc, /\.pdf$/.test(media.originalSrc) ? 'pdf' : /\.pptx$/.test(media.originalSrc) ? 'pptx' : 'image', preview.skillSlug)
    if (!media.alt.en || !media.alt.zh || media.width <= 0 || media.height <= 0) errors.push({ slug: preview.skillSlug, error: 'Missing alt text or dimensions' })
  }
  const providers = EXTERNAL_SKILLS.filter(item => item.provider !== 'skillry' || item.active)
  for (const entry of providers) {
    const card = toProviderDirectorySkill(entry, 'en')
    add(card.provider.image, 'image', entry.slug)
    if (entry.provider === 'skillry') for (const src of entry.previewImages) add(src, 'image', entry.slug)
    const video = entry.provider === 'skillry' ? entry.previewVideo : entry.runtimeDemo?.video
    if (video) {
      add(video, 'video', entry.slug)
      if (card.provider.video !== video) errors.push({ slug: entry.slug, error: 'Directory dropped the source video' })
    }
  }
  const results = [], pending = [...assets]
  async function worker() {
    while (pending.length) {
      const [url, item] = pending.shift()
      try {
        if (url.startsWith('/')) {
          const file = path.resolve('public', '.' + url)
          if (!file.startsWith(path.resolve('public') + path.sep)) throw Error('Invalid local asset path')
          if (!(await stat(file)).size) throw Error('Empty asset')
          const bytes = await readFile(file)
          if (!mediaSignature(bytes, item.type)) throw Error('Invalid media signature')
        } else if (remote) {
          let failure
          for (let attempt = 0; attempt < 2; attempt++) {
            try { await probeMedia(url, item.type, fetcher); failure = null; break } catch (error) { failure = error }
          }
          if (failure) throw failure
        } else publicMediaUrl(url)
        results.push({ url, type: item.type, state: !url.startsWith('/') && !remote ? 'not-probed' : 'ok' })
      } catch (error) { errors.push({ url, skills: [...item.skills], error: error.message }); results.push({ url, type: item.type, state: 'failed' }) }
    }
  }
  await Promise.all(Array.from({ length: remote ? 6 : 1 }, worker))
  let coverage = null
  if (catalog) {
    const rows = JSON.parse(await readFile(catalog, 'utf8'))
    if (!Array.isArray(rows) || new Set(rows.map(row => row.slug)).size !== rows.length) throw Error('Expected a complete, unique public registry export')
    const categories = {}, missingVisuals = []
    for (const row of rows) {
      const hasMedia = Boolean(getShowcasesForSkill(row.slug).length || getSkillSourcePreview(row.slug))
      const group = categories[row.category || 'other'] ||= { total: 0, withMedia: 0, notCollected: 0 }
      group.total++; group[hasMedia ? 'withMedia' : 'notCollected']++
      if (!hasMedia && ['design-creative', 'image-generation', 'video-creation', 'presentation'].includes(row.category)) missingVisuals.push(row)
    }
    for (const binding of bindings) {
      const row = rows.find(row => row.slug === binding.skillSlug)
      const pathMatches = row?.source_path === binding.sourcePath || row?.repository?.endsWith('/' + binding.sourcePath.replace(/\/SKILL\.md$/, ''))
      if (!row || row.github_repo?.toLowerCase() !== binding.repository.toLowerCase() || !pathMatches) errors.push({ slug: binding.skillSlug, error: 'Registry identity does not match the pinned preview binding' })
    }
    coverage = { registryRecords: rows.length, categories, missingVisuals, scope: 'All exported public registry identities; absence means media not collected, not proof that the author has none. Repository documents are not exhaustively crawled.' }
  }
  const report = { checkedAt: new Date().toISOString(), summary: {
    galleryCases: SHOWCASE_CASES.length, galleryVideos: SHOWCASE_CASES.filter(item => item.videoUrl).length,
    sourcePreviewSkills: SKILL_SOURCE_PREVIEWS.length, boundSkills: bindings.length,
    externalSkills: providers.length, externalVideos: providers.filter(item => item.previewVideo || item.runtimeDemo).length,
    localAssets: results.filter(item => item.url.startsWith('/')).length, remoteAssets: results.filter(item => !item.url.startsWith('/')).length,
    checked: results.filter(item => item.state === 'ok').length, failed: errors.length,
  }, coverage, errors, assets: results.sort((a, b) => a.url.localeCompare(b.url)) }
  await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report.summary))
  if (errors.length) throw Error(`Media audit found ${errors.length} issues; see ${output}`)
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: { remote: { type: 'boolean', default: false }, catalog: { type: 'string' }, output: { type: 'string' } } })
  await auditMedia(values)
}
