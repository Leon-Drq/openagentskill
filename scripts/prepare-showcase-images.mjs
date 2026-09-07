// Rebuild lightweight display assets; keep licensed originals byte-for-byte.
import { readdir, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const sharp = require(require.resolve('sharp', { paths: [require.resolve('next/package.json')] }))
const directory = fileURLToPath(new URL('../public/showcase/', import.meta.url))
const originals = (await readdir(directory)).filter((file) => /\.(png|jpe?g|webp)$/.test(file) && !/\.(card|preview)\.webp$/.test(file))
let before = 0
let after = 0
for (const file of originals) {
  const source = path.join(directory, file)
  const base = file.replace(/\.[^.]+$/, '')
  for (const [kind, width, quality] of [['card', 720, 80], ['preview', 1600, 86]]) {
    const target = path.join(directory, `${base}.${kind}.webp`)
    await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(target)
    if (kind === 'card') after += (await stat(target)).size
  }
  before += (await stat(source)).size
}
console.log(`${originals.length} originals preserved; card images ${Math.round(before / 1024)} KB → ${Math.round(after / 1024)} KB.`)
