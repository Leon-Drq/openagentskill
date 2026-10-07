import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { boundedFetch } from './gallery/core.mjs'
import { digest, safePath, safeRepo, identity, selectBatch, documentPaths, discoverAssets } from './skill-media/discovery.mjs'
import { renderAsset } from './skill-media/render.mjs'

const rootDefault = fileURLToPath(new URL('../', import.meta.url))
const licenses = {
  MIT: /permission is hereby granted, free of charge/i,
  'Apache-2.0': /Apache License[\s\S]{0,100}Version 2\.0/i,
  'BSD-2-Clause': /redistribution and use in source and binary forms/i,
  'BSD-3-Clause': /redistribution and use in source and binary forms/i,
  ISC: /permission to use, copy, modify, and(?:\/or)? distribute/i,
  'CC0-1.0': /CC0 1\.0 Universal/i,
  'CC-BY-4.0': /Attribution 4\.0 International/i,
}
const formats = {
  image: { en: 'Author preview', zh: '作者预览' }, video: { en: 'Author video', zh: '作者视频' },
  'pdf-cover': { en: 'PDF · first page', zh: 'PDF · 首页预览' },
  'pptx-cover': { en: 'PowerPoint · embedded cover', zh: 'PowerPoint · 作者内嵌封面' },
  'animation-poster': { en: 'Animation · still preview', zh: '动图 · 静帧预览' },
}

export async function fetchCatalog({ fetcher = fetch, base = 'https://www.openagentskill.com' } = {}) {
  if (base !== 'https://www.openagentskill.com') throw Error('Unexpected registry origin')
  const rows = [], slugs = new Set(); let after = null
  for (let page = 0; page < 2000; page++) {
    const response = await fetcher(`${base}/api/skills/media-candidates${after ? `?after=${encodeURIComponent(after)}` : ''}`, { signal: AbortSignal.timeout(30000), redirect: 'error' })
    if (!response.ok) throw Error(`Registry feed HTTP ${response.status}`)
    const result = await response.json()
    if (!Array.isArray(result.records) || result.records.length > 500 || !('next' in result)) throw Error('Invalid registry page')
    for (const row of result.records) {
      if (!/^[a-z0-9][a-z0-9-]{0,239}$/.test(row.slug) || slugs.has(row.slug) || (after && row.slug <= after)) throw Error('Invalid or repeated registry identity')
      slugs.add(row.slug); rows.push(row)
    }
    if (result.next === null) { if (!rows.length) throw Error('Empty registry feed'); return rows }
    if (!result.records.length || result.next !== result.records.at(-1).slug || result.next === after) throw Error('Incomplete registry pagination')
    after = result.next
  }
  throw Error('Registry feed exceeded page budget')
}

export function githubReader({ fetcher = fetch, token = process.env.GITHUB_TOKEN, cacheDir } = {}) {
  const memo = new Map()
  const get = async (url, maxBytes) => {
    const target = new URL(url)
    if (!['api.github.com', 'raw.githubusercontent.com'].includes(target.hostname) || target.protocol !== 'https:' || target.port || target.username || target.password) throw Error('Unexpected source origin')
    const cache = cacheDir && path.join(cacheDir, digest(url))
    if (cache) try { const bytes = await readFile(cache); if (bytes.length <= maxBytes) return bytes } catch { /* Cache miss. */ }
    const bytes = await boundedFetch(url, { token, maxBytes, fetcher })
    if (cache) { await mkdir(cacheDir, { recursive: true }); await writeFile(cache, bytes) }
    return bytes
  }
  const api = async suffix => JSON.parse((await get(`https://api.github.com/repos/${suffix}`, 12 * 1024 * 1024)).toString())
  const raw = (repo, revision, file, limit = 500000) => {
    if (!safeRepo(repo) || !/^[a-f0-9]{40}$/.test(revision) || !safePath(file)) throw Error('Invalid pinned source')
    return get(`https://raw.githubusercontent.com/${repo}/${revision}/${file.split('/').map(encodeURIComponent).join('/')}`, limit)
  }
  const repository = async row => {
    if (!safeRepo(row.github_repo)) throw Error('Invalid repository')
    const key = `${row.github_repo.toLowerCase()}:${row.source_ref || ''}`
    if (!memo.has(key)) memo.set(key, (async () => {
      const repo = await api(row.github_repo)
      if (repo.private !== false) throw Error('Source is not public')
      const ref = row.source_ref || repo.default_branch
      const commit = await api(`${row.github_repo}/commits/${encodeURIComponent(ref)}`)
      const revision = commit.sha
      if (!/^[a-f0-9]{40}$/.test(revision)) throw Error('Invalid source revision')
      const tree = await api(`${row.github_repo}/git/trees/${revision}?recursive=1`)
      if (tree.truncated || !Array.isArray(tree.tree)) throw Error('Incomplete repository tree')
      let license = null
      try {
        const info = await api(`${row.github_repo}/license?ref=${revision}`)
        if (licenses[info.license?.spdx_id] && safePath(info.path) && !info.path.includes('/')) {
          const bytes = await raw(row.github_repo, revision, info.path, 100000)
          if (licenses[info.license.spdx_id].test(bytes.toString())) {
            const notice = tree.tree.find(file => file.mode === '100644' && /^NOTICE(?:\.txt|\.md)?$/i.test(file.path))
            const noticeBytes = notice ? await raw(row.github_repo, revision, notice.path, 100000) : null
            license = { name: info.license.spdx_id, path: info.path, sha256: digest(bytes), bytes: noticeBytes ? Buffer.concat([bytes, Buffer.from('\n\n--- Source NOTICE ---\n\n'), noticeBytes]) : bytes }
          }
        }
      } catch (error) { if (!/HTTP 404/.test(error.message)) throw error }
      return { ref, revision, tree: tree.tree, license }
    })())
    return memo.get(key)
  }
  return { repository, raw }
}

export async function collectSkillMedia({ root = rootDefault, catalog, limit = 150, refresh = false, now = new Date().toISOString(), reader = githubReader(), renderer = renderAsset, maxBytes = 100 * 1024 * 1024 } = {}) {
  const read = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'))
  const rows = catalog || await fetchCatalog()
  if (!Array.isArray(rows) || !rows.length || new Set(rows.map(row => row.slug)).size !== rows.length) throw Error('Invalid catalog')
  const state = await read('lib/skill-media-sync.json')
  const exclusions = await read('scripts/skill-media/exclusions.json')
  const automatic = new Map((await read('lib/skill-previews-auto.json')).map(item => [item.skillSlug, item]))
  const manual = new Set([...(await read('lib/skill-previews.json')).map(item => item.skillSlug), ...(await read('lib/skill-preview-bindings.json')).map(item => item.skillSlug), ...Object.values(await read('lib/showcase-groups.json')).map(item => item.skillSlug)])
  // These hand-authored Gallery cases predate the group registry.
  for (const slug of ['liamgvchi-gc-minimal-zine-poster', 'liamgvchi-gc-minimal-zine-poster-v0-3', 'yanliudesign-mono-color-skill', 'design-taste-frontend', 'op7418-guizang-ppt-skill', 'nexu-io-open-design', 'vox-director']) manual.add(slug)
  const { batch, pending } = selectBatch(rows, state.records, { limit, now, excluded: manual, refresh })
  const present = new Set(rows.map(row => row.slug)), results = [], files = new Map()
  // A complete feed is required above. Remove only registry associations for
  // unpublished/deleted identities; content-addressed files remain immutable.
  for (const slug of automatic.keys()) if (!present.has(slug) || manual.has(slug)) automatic.delete(slug)
  let writtenBytes = 0
  const record = (row, status, details = {}) => {
    const retryDays = status === 'error' || status === 'deferred' ? 1 : status === 'collected' ? 30 : 7
    state.records[row.slug] = { identity: identity(row), status, checkedAt: now, nextAt: new Date(Date.parse(now) + retryDays * 86400000).toISOString(), ...details }
    results.push({ slug: row.slug, ...state.records[row.slug] })
  }
  async function processRow(row) {
    if (writtenBytes >= maxBytes) { record(row, 'deferred', { reason: 'run-byte-budget' }); return }
    if (state.records[row.slug]?.identity !== identity(row)) automatic.delete(row.slug)
    try {
      const source = await reader.repository(row)
      const paths = documentPaths(row, source.tree)
      if (!paths.length) { automatic.delete(row.slug); record(row, 'not-found', { reason: 'no-exact-source-document', revision: source.revision }); return }
      const documents = await Promise.all(paths.map(async file => ({ path: file, text: (await reader.raw(row.github_repo, source.revision, file)).toString() })))
      const { candidates, skipped } = discoverAssets(documents, source.tree, { repository: row.github_repo, revision: source.revision, ref: source.ref, sourcePath: paths.find(file => /(?:^|\/)SKILL\.md$/i.test(file)), exclusions })
      const sourceUrl = `https://github.com/${row.github_repo}/blob/${source.revision}/${paths[0]}`
      const evidence = { revision: source.revision, documentPath: paths[0], documentSha256: digest(documents[0].text), candidates: candidates.length }
      if (!candidates.length) { automatic.delete(row.slug); record(row, skipped.length ? 'needs-review' : 'not-found', { ...evidence, reason: skipped.length ? 'source-association-or-license' : 'no-preview-in-scanned-documents', skipped }); return }
      if (!source.license) { automatic.delete(row.slug); record(row, 'needs-review', { ...evidence, reason: 'image-license-not-established', skipped }); return }
      const prior = automatic.get(row.slug)
      if (!refresh && prior?.revision === source.revision) {
        record(row, 'collected', { ...evidence, previews: prior.media.length, skipped }); return
      }
      const media = [], staged = new Map(); let firstFormat = 'image'
      for (const item of candidates.slice(0, 12)) {
        if (media.length >= 3) break
        if (item.size > 20 * 1024 * 1024) { skipped.push({ asset: item.asset, reason: 'asset-too-large' }); continue }
        try {
          const bytes = await reader.raw(row.github_repo, source.revision, item.asset, 20 * 1024 * 1024)
          const result = await renderer(bytes, item.asset)
          // Unchanged immutable files cost neither disk space nor the run's
          // publication budget. A refresh still validates and decodes the source.
          for (const [key, value] of result.files) {
            try { if ((await readFile(path.join(root, 'public', key))).equals(value)) result.files.delete(key) } catch { /* New asset. */ }
          }
          const extra = [...result.files].filter(([key]) => !files.has(key) && !staged.has(key)).reduce((n, [, bytes]) => n + bytes.length, 0)
          if (writtenBytes + extra > maxBytes) { skipped.push({ asset: item.asset, reason: 'run-byte-budget' }); continue }
          for (const [key, bytes] of result.files) { if (!files.has(key) && !staged.has(key)) writtenBytes += bytes.length; staged.set(key, bytes) }
          const title = row.name || row.slug
          media.push({ ...result.media, sourceUrl: `https://github.com/${row.github_repo}/blob/${source.revision}/${item.asset}`, kind: item.kind,
            title: { en: `${title} · ${formats[result.format].en}`, zh: `${title} · ${formats[result.format].zh}` },
            alt: { en: `${title}: ${item.label || path.posix.basename(item.asset)}`, zh: `${title}：${item.label || path.posix.basename(item.asset)}` },
            sourcePath: item.asset, documentPath: item.documentPath, format: result.format })
          if (media.length === 1) firstFormat = result.format
        } catch (error) {
          // Store stable diagnostics only. Decoder stderr can include raw source
          // bytes or terminal escapes and must never enter public manifests.
          const reason = /HTTP (\d+)/.exec(error.message)?.[0] || (error.code === 'ENOENT' ? 'renderer-unavailable' : error.code === 2 && item.asset.endsWith('.pptx') ? 'deck-has-no-thumbnail' : 'decode-or-fetch-failed')
          skipped.push({ asset: item.asset, reason })
        }
      }
      if (!media.length) { record(row, skipped.some(item => item.reason === 'run-byte-budget') ? 'deferred' : 'error', { ...evidence, reason: 'no-renderable-preview', skipped }); return }
      const licenseUrl = `/skill-previews/auto/LICENSE-${digest(source.license.bytes)}.txt`
      staged.set(licenseUrl, source.license.bytes)
      for (const [key, value] of staged) files.set(key, value)
      automatic.set(row.slug, {
        skillSlug: row.slug, repository: row.github_repo, revision: source.revision, sourceUrl,
        license: source.license.name, licenseUrl, licenseSourcePath: source.license.path, licenseSha256: source.license.sha256,
        documentSha256: evidence.documentSha256, format: formats[firstFormat],
        note: { en: 'Explore images and examples shared by the author. Open the original files for full-size artwork and animations.', zh: '浏览作者提供的图片与示例。打开原始文件，可查看完整尺寸的作品和动图。' },
        collectedAt: now, media,
      })
      record(row, 'collected', { ...evidence, previews: media.length, skipped })
    } catch (error) {
      const reason = /HTTP (\d+)/.exec(error.message)?.[0] || (/Incomplete repository tree/.test(error.message) ? 'incomplete-source-tree' : 'source-unavailable')
      record(row, 'error', { reason })
      // Authentication/rate-limit failures are global; fail instead of silently
      // treating hundreds of unvisited repositories as missing examples.
      if (/HTTP (401|403|429)/.test(error.message)) {
        await mkdir(path.join(root, 'artifacts'), { recursive: true })
        await writeFile(path.join(root, 'artifacts/skill-media-collection.json'), JSON.stringify({ checkedAt: now, failed: true, results }, null, 2) + '\n')
        throw Error(`Media collection stopped: ${reason}; previous catalog retained`)
      }
    }
  }
  const work = [...batch]; let fatal
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (work.length && !fatal) {
      const row = work.shift()
      try { await processRow(row) } catch (error) { fatal = error }
      if (results.length % 25 === 0) console.log(`Media collection: ${results.length}/${batch.length} checked, ${automatic.size} collected`)
    }
  }))
  if (fatal) throw fatal
  const report = { checkedAt: now, catalogRecords: rows.length, attempted: results.length, pending, collectedSkills: automatic.size, bytesAdded: writtenBytes, statuses: Object.fromEntries([...new Set(results.map(row => row.status))].map(status => [status, results.filter(row => row.status === status).length])), results }
  state.checkedAt = now
  state.records = Object.fromEntries(Object.entries(state.records).sort(([a], [b]) => a.localeCompare(b, 'en')))
  state.summary = { catalogRecords: rows.length, attempted: results.length, pending, collectedSkills: automatic.size, statuses: report.statuses }
  // Publish manifests only after every staged asset is ready; a network failure
  // cannot produce dangling card URLs. CI gates the commit before production.
  for (const [url, bytes] of files) { const target = path.join(root, 'public', url); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, bytes) }
  await mkdir(path.join(root, 'artifacts'), { recursive: true })
  for (const [file, value] of [['lib/skill-previews-auto.json', [...automatic.values()].sort((a, b) => a.skillSlug.localeCompare(b.skillSlug, 'en'))], ['lib/skill-media-sync.json', state], ['artifacts/skill-media-collection.json', report]]) await writeFile(path.join(root, file), JSON.stringify(value, null, 2) + '\n')
  console.log(JSON.stringify(state.summary))
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: { catalog: { type: 'string' }, limit: { type: 'string' }, refresh: { type: 'boolean', default: false }, 'cache-dir': { type: 'string' } } })
  const limit = Number(values.limit || 150)
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw Error('Limit must be 1–1000')
  await collectSkillMedia({ catalog: values.catalog ? JSON.parse(await readFile(values.catalog, 'utf8')) : undefined, limit, refresh: values.refresh, reader: githubReader({ cacheDir: values['cache-dir'] }) })
}
