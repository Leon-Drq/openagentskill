import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { boundedFetch, candidates, digest, identity, planItem, slugFor } from './gallery/core.mjs'

export async function syncGallery({ root = fileURLToPath(new URL('../', import.meta.url)), fetcher = fetch, now = new Date().toISOString(), summaryFile = process.env.GITHUB_STEP_SUMMARY } = {}) {
const read = async (file) => JSON.parse(await readFile(path.join(root,file), 'utf8'))
const save = async (file, data) => writeFile(path.join(root,file), `${JSON.stringify(data,null,2)}\n`)
const require = createRequire(import.meta.url)
const sharp = require(require.resolve('sharp', { paths: [require.resolve('next/package.json')] }))
const config = await read('scripts/gallery/sources.json')
const sources = await read('lib/showcase-sources.json')
const groups = await read('lib/showcase-groups.json')
const curated = await read('lib/showcase-curation.json')
const manifest = await read('lib/showcase-media.json')
const previous = await read('lib/showcase-auto.json')
const priorStatus = await read('lib/showcase-sync.json')
const entries = new Map(previous.map((item) => [identity(item.source, item.asset), item]))
const curatedKeys = new Set(curated.flatMap((item) => item.assets.map((asset) => identity(groups[item.group].source, asset))))
const knownHashes = new Set([...Object.values(manifest).map((item) => item.sha256), ...previous.map((item) => item.sha256)])
const status = { checkedAt: now, updatedAt: priorStatus.updatedAt, sources: [], added: 0, updated: 0, unchanged: 0, skipped: 0, deferred: 0 }
const fetchBytes = (url, maxBytes) => boundedFetch(url, { maxBytes, fetcher, token: process.env.GITHUB_TOKEN })
const api = async (url) => JSON.parse((await fetchBytes(`https://api.github.com/${url}`, 12*1024*1024)).toString())
const raw = (source, revision, asset) => `https://raw.githubusercontent.com/${source.repo}/${revision}/${asset.split('/').map(encodeURIComponent).join('/')}`
const pendingFiles = new Map()
let downloads = 0
for (const sourceId of [...new Set(config.rules.map((rule) => rule.source))]) {
  const source = sources[sourceId]
  const record = { source: sourceId, repository: source.repo, revision: null, candidates: 0, missing: [], skips: [], error: null }
  status.sources.push(record)
  try {
    const commit = await api(`repos/${source.repo}/commits/HEAD`)
    if (!/^[a-f0-9]{40}$/.test(commit.sha)) throw new Error('Invalid commit revision')
    record.revision = commit.sha
    const tree = await api(`repos/${source.repo}/git/trees/${commit.sha}?recursive=1`)
    const found = candidates(tree, config.rules.filter((rule) => rule.source === sourceId))
    record.candidates = found.length
    if (!found.length) throw new Error('Configured source paths are empty; source review required')
    const license = await fetchBytes(raw(source, commit.sha, source.licensePath), 100000)
    const pinnedLicense = await readFile(path.join(root,`public/showcase/curated-${sourceId}-LICENSE.txt`))
    if (license.toString().replace(/\r\n/g,'\n').trim() !== pinnedLicense.toString().replace(/\r\n/g,'\n').trim()) throw new Error('License changed; source review required')
    record.missing = previous.filter((entry) => entry.source === sourceId && !found.some((item) => item.path === entry.asset)).map((entry) => entry.slug)
    // Existing automatic cases get priority over discovery; stable sorting prevents churn.
    found.sort((a,b) => Number(entries.has(identity(sourceId,b.path))) - Number(entries.has(identity(sourceId,a.path))))
    for (const item of found) {
      const key = identity(sourceId,item.path)
      const old = entries.get(key)
      if (curatedKeys.has(key)) continue // Human-selected historical snapshots remain immutable.
      if (item.nested) { record.skips.push({ path: item.path, reason: 'nested-license-or-notice' }); status.skipped++; continue }
      if (old?.blobSha === item.sha) { status.unchanged++; continue }
      if ((!old && status.added >= config.maxNewPerRun) || downloads >= config.maxAssetsPerRun) { status.deferred++; continue }
      if (item.size > 10*1024*1024) { record.skips.push({ path: item.path, reason: 'byte-limit' }); status.skipped++; continue }
      downloads++
      // Transport failures abort publication; a corrupt image is skipped and recorded.
      const bytes = await fetchBytes(raw(source,commit.sha,item.path), 10*1024*1024)
      const hash = digest(bytes)
      const action = planItem({ old, hash, knownHashes })
      if (action === 'unchanged') { status.unchanged++; continue }
      if (action === 'duplicate') { record.skips.push({ path: item.path, reason: 'duplicate-content' }); status.skipped++; continue }
      let metadata, card, preview
      try {
        metadata = await sharp(bytes, { limitInputPixels: 40000000 }).metadata()
        if (!['png','jpeg','webp'].includes(metadata.format) || (metadata.pages || 1) !== 1 || metadata.width < 240 || metadata.height < 160 || (metadata.orientation && metadata.orientation !== 1)) throw new Error('Unsupported image')
        card = await sharp(bytes,{ limitInputPixels:40000000 }).resize({width:720,withoutEnlargement:true}).webp({quality:78}).toBuffer()
        if (card.length >= 180*1024) card = await sharp(bytes,{ limitInputPixels:40000000 }).resize({width:720,withoutEnlargement:true}).webp({quality:50}).toBuffer()
        if (card.length >= 180*1024) throw new Error('Thumbnail too large')
        preview = await sharp(bytes,{limitInputPixels:40000000}).resize({width:1600,withoutEnlargement:true}).webp({quality:84}).toBuffer()
      } catch { record.skips.push({path:item.path,reason:'invalid-or-oversized-image'}); status.skipped++; continue }
      const slug = old?.slug || slugFor(sourceId,item.path)
      const base = `auto-${hash.slice(0,24)}`
      const ext = metadata.format === 'jpeg' ? 'jpg' : metadata.format
      for (const [name, data] of [[`${base}.${ext}`,bytes],[`${base}.card.webp`,card],[`${base}.preview.webp`,preview]]) pendingFiles.set(`public/showcase/${name}`,data)
      const title = item.path.split('/').pop().replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ')
      entries.set(key, { source:sourceId,group:item.rule.group,asset:item.path,slug,title,category:item.rule.category || groups[item.rule.group].category,revision:commit.sha,blobSha:item.sha,sha256:hash,media:{src:`/showcase/${base}.${ext}`,width:metadata.width,height:metadata.height},createdAt:old?.createdAt || now.slice(0,10),updatedAt:now.slice(0,10) })
      knownHashes.add(hash)
      status[action]++
    }
  } catch (error) { record.error = error.message }
}
await mkdir(path.join(root,'artifacts'),{recursive:true})
await save('artifacts/gallery-sync-report.json',status)
if (summaryFile) await writeFile(summaryFile, `## Gallery sync\n\nAdded: ${status.added}; updated: ${status.updated}; unchanged: ${status.unchanged}; skipped: ${status.skipped}; deferred: ${status.deferred}.\n\n${status.sources.map((s)=>`- ${s.repository}: ${s.error || `${s.candidates} candidates; ${s.missing.length} missing (retained)`}`).join('\n')}\n`, {flag:'a'})
if (status.sources.some((source) => source.error)) {
  console.error(JSON.stringify(status,null,2))
  throw new Error('Gallery source check failed; catalog and assets were not published')
}
for (const [file, bytes] of pendingFiles) await writeFile(path.join(root,file),bytes)
if (status.added || status.updated) status.updatedAt = now.slice(0,10)
await save('lib/showcase-auto.json',[...entries.values()].sort((a,b)=>a.slug.localeCompare(b.slug,'en')))
await save('lib/showcase-sync.json',status)
console.log(JSON.stringify({ added:status.added,updated:status.updated,total:entries.size,deferred:status.deferred,sources:status.sources.length }))

return status
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await syncGallery()
