import { createRequire } from 'node:module'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { digest } from './discovery.mjs'

const exec = promisify(execFile)
const require = createRequire(import.meta.url)
const sharp = require(require.resolve('sharp', { paths: [require.resolve('next/package.json')] }))
// These programs only decode data. Never invoke a repository's scripts, HTML,
// macros, browser, package manager, or install instructions to obtain a preview.
export async function renderAsset(bytes, asset, { execFile = exec } = {}) {
  if (bytes.length > 20 * 1024 * 1024) throw Error('asset-too-large')
  const hash = digest(bytes), ext = path.posix.extname(asset).toLowerCase().slice(1)
  const base = `/skill-previews/auto/${hash}`
  const files = new Map(), frames = []
  let videoSrc, originalSrc, format = 'image'
  const temp = await mkdtemp(path.join(tmpdir(), 'oas-media-'))
  try {
    const input = path.join(temp, `source.${ext}`)
    await writeFile(input, bytes)
    if (['mp4', 'webm'].includes(ext)) {
      const signature = bytes.subarray(4, 8).toString() === 'ftyp' || bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
      if (!signature) throw Error('invalid-video')
      const poster = path.join(temp, 'poster.png')
      // Select a representative frame from a bounded, downscaled opening batch
      // so an empty opening frame does not hide an otherwise useful video.
      await execFile(process.env.FFMPEG_BIN || 'ffmpeg', ['-nostdin', '-v', 'error', '-protocol_whitelist', 'file', '-threads', '1', '-i', input, '-frames:v', '1', '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,thumbnail=60', '-threads', '1', poster], { timeout: 30000, maxBuffer: 100000 })
      frames.push(await readFile(poster)); videoSrc = `${base}.${ext}`; files.set(videoSrc, bytes); format = 'video'
    } else if (ext === 'pdf') {
      if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw Error('invalid-pdf')
      await execFile(process.env.PDFTOPPM_BIN || 'pdftoppm', ['-f', '1', '-l', '1', '-scale-to', '1600', '-singlefile', '-png', input, path.join(temp, 'page')], { timeout: 30000, maxBuffer: 100000 })
      frames.push(await readFile(path.join(temp, 'page.png'))); originalSrc = `${base}.pdf`; files.set(originalSrc, bytes); format = 'pdf-cover'
    } else if (ext === 'pptx') {
      // Read the author's embedded deck thumbnail, without opening Office or
      // executing macros. Bound both the ZIP and its uncompressed thumbnail.
      const code = 'import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as z:\n names=[n for n in z.namelist() if n.lower() in ("docprops/thumbnail.jpeg","docprops/thumbnail.jpg","docprops/thumbnail.png")]\n if not names: sys.exit(2)\n i=z.getinfo(names[0])\n if i.file_size>10000000: sys.exit(3)\n sys.stdout.buffer.write(z.read(i))'
      const result = await execFile(process.env.PYTHON_BIN || 'python3', ['-c', code, input], { timeout: 10000, maxBuffer: 10 * 1024 * 1024, encoding: 'buffer' })
      frames.push(result.stdout); originalSrc = `${base}.pptx`; files.set(originalSrc, bytes); format = 'pptx-cover'
    } else {
      const meta = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata()
      if (!['png', 'jpeg', 'webp', 'gif'].includes(meta.format)) throw Error('unsupported-image')
      if (meta.pages > 1) {
        // Animation intros are often blank. Use the most informative of a few
        // bounded frames instead of displaying an empty first frame forever.
        const candidates = [...new Set([0, Math.min(60, Math.floor(meta.pages / 3)), Math.min(120, Math.floor(meta.pages * 2 / 3))])]
        let best, entropy = -1
        for (const page of candidates) {
          const frame = await sharp(bytes, { page, pages: 1, limitInputPixels: 40_000_000 }).png().toBuffer()
          const stats = await sharp(frame).stats()
          if (stats.entropy > entropy) { best = frame; entropy = stats.entropy }
        }
        frames.push(best)
      } else frames.push(bytes)
      originalSrc = `${base}.${meta.format === 'jpeg' ? 'jpg' : meta.format}`
      files.set(originalSrc, bytes)
      format = meta.pages > 1 ? 'animation-poster' : 'image'
    }
    const frame = frames[0]
    const meta = await sharp(frame, { limitInputPixels: 40_000_000 }).metadata()
    const stats = await sharp(frame, { limitInputPixels: 40_000_000 }).stats()
    if (stats.entropy < 0.01 || stats.channels.every(channel => channel.stdev < 0.5)) throw Error('blank-preview')
    if (meta.width < 240 || meta.height < 160 || meta.width / meta.height > 4 || meta.height / meta.width > 6) throw Error('not-a-usable-preview')
    // Autorotate before recording dimensions. Browser ratios must match actual
    // derivatives, including portrait images with EXIF orientation.
    const { data: normalized, info } = await sharp(frame, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true })
    const previewSrc = `${base}.preview.webp`, cardSrc = `${base}.card.webp`
    files.set(previewSrc, normalized)
    let card = await sharp(normalized).resize({ width: 720, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()
    if (card.length >= 180 * 1024) card = await sharp(normalized).resize({ width: 720, withoutEnlargement: true }).webp({ quality: 48 }).toBuffer()
    if (card.length >= 180 * 1024) throw Error('thumbnail-too-large')
    files.set(cardSrc, card)
    return { files, format, media: { src: previewSrc, previewSrc, cardSrc, width: info.width, height: info.height, sha256: hash, ...(videoSrc ? { videoSrc } : {}), ...(originalSrc ? { originalSrc } : {}) } }
  } finally { await rm(temp, { recursive: true, force: true }) }
}
