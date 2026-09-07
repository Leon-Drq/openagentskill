// Maintainer-only asset import. Fetches pinned, explicitly selected public files;
// never runs source-repository code or changes registry approval state.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const require = createRequire(import.meta.url)
const sharp = require(require.resolve('sharp', { paths: [require.resolve('next/package.json')] }))
const root = fileURLToPath(new URL('../', import.meta.url))
const entries = JSON.parse(await readFile(path.join(root, 'lib/showcase-curation.json'), 'utf8'))
const sources = JSON.parse(await readFile(path.join(root, 'lib/showcase-sources.json'), 'utf8'))
const target = path.join(root, 'public/showcase')
const cache = process.argv[2] ? path.resolve(process.argv[2]) : null
const manifest = {}
await mkdir(target, { recursive: true })
async function get(source, sourcePath) {
  if (!/^[a-f0-9]{40}$/.test(source.revision) || sourcePath.includes('..')) throw Error('Invalid immutable source')
  const url = `https://raw.githubusercontent.com/${source.repo}/${source.revision}/${sourcePath}`
  if (cache) {
    const id = source.repo.toLowerCase().replace('/', '--')
    try {
      const tree = JSON.parse(await readFile(path.join(cache, `${id}.json`), 'utf8'))
      const blob = tree.tree.find((item) => item.path === sourcePath)
      if (tree.sha === source.revision && blob?.sha) {
        const body = await readFile(path.join(cache, id, sourcePath.replaceAll('/', '__')))
        const hash = createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex')
        if (hash === blob.sha) return body
      }
    } catch { /* fetch pinned source */ }
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' })
  if (!response.ok) throw Error(`${response.status}: ${url}`)
  const body = Buffer.from(await response.arrayBuffer())
  if (body.length > 10_000_000) throw Error(`Oversized asset: ${url}`)
  return body
}
for (const [id, source] of Object.entries(sources)) {
  const license = await get(source, source.licensePath)
  await writeFile(path.join(target, `curated-${id}-LICENSE.txt`), license)
}
await writeFile(path.join(target, 'curated-motion-NOTICES.md'), await get(sources.open, 'plugins/_official/video-templates/HYPERFRAMES-ATTRIBUTIONS.md'))
for (const entry of entries) {
  const sourceId = entry.group === 'motion' ? 'open' : sources[entry.group] ? entry.group : 'baoyu'
  const source = sources[sourceId]
  for (let i = 0; i < entry.assets.length; i++) {
    const sourcePath = entry.assets[i]
    const filename = `curated-${entry.slug}-${i + 1}${path.extname(sourcePath)}`
    const dest = path.join(target, filename)
    const body = await get(source, sourcePath)
    await writeFile(dest, body)
    const meta = await sharp(body).metadata()
    if (!meta.width || !meta.height || meta.width < 600) throw Error(`Small or invalid image: ${filename}`)
    manifest[`${entry.slug}:${i}`] = { src: `/showcase/${filename}`, width: meta.width, height: meta.height,
      sha256: createHash('sha256').update(body).digest('hex'), sourceUrl: `https://raw.githubusercontent.com/${source.repo}/${source.revision}/${sourcePath}` }
  }
}
await writeFile(path.join(root, 'lib/showcase-media.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Imported ${entries.length} curated cases; ${Object.keys(manifest).length} original images with SHA-256 provenance.`)
