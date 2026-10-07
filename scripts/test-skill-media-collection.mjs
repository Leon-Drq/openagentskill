import assert from 'node:assert/strict'
import { readFile, writeFile, mkdtemp, mkdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { safePath, resolveAsset, documentPaths, discoverAssets, selectBatch, identity, digest } from './skill-media/discovery.mjs'
import { collectSkillMedia, fetchCatalog, githubReader } from './collect-skill-media.mjs'
import { renderAsset } from './skill-media/render.mjs'
import { MEDIA_FEED_SELECT, mediaFeedCursor } from '../lib/skills/media-feed.ts'

const rev = 'a'.repeat(40), now = '2026-10-07T00:00:00.000Z'
const blob = file => ({ path: file, type: 'blob', mode: '100644', size: 1024 })
const row = { slug: 'author-deck', github_repo: 'author/repo', source_path: 'skills/deck/SKILL.md', category: 'presentation', created_at: now }
for (const value of ['../secret', '/root/a', 'a\\b', 'a/../b', 'a\n.png', 'a/%2e%2e/b']) assert.equal(safePath(value), false)
for (const value of ['https://evil.test/x.png', 'http://127.0.0.1/x.png', 'https://raw.githubusercontent.com.evil.test/author/repo/main/a.png', 'https://user:secret@github.com/author/repo/blob/main/a.png', 'data:image/png;base64,AAAA', 'file:///tmp/a.png', '../../../escape.png']) assert.equal(resolveAsset(value, 'skills/deck/SKILL.md', 'author/repo', rev, 'main'), null)
assert.equal(resolveAsset('./examples/cover.png', row.source_path, row.github_repo, rev, 'main'), 'skills/deck/examples/cover.png')
assert.equal(resolveAsset('https://github.com/author/repo/blob/main/examples/deck.png?raw=true', row.source_path, row.github_repo, rev, 'main'), 'examples/deck.png')
assert.equal(resolveAsset('https://raw.githubusercontent.com/author/repo/feature/slides/example.png', row.source_path, row.github_repo, rev, 'feature/slides'), 'example.png')

const tree = ['README.md', row.source_path, 'skills/deck/README.md', 'skills/deck/examples/cover.png', 'skills/deck/examples/demo.mp4', 'skills/deck/examples/logo.png', 'skills/deck/restricted/LICENSE', 'skills/deck/restricted/example.png', 'skills/other/SKILL.md', 'skills/other/examples/cover.png'].map(blob)
assert.deepEqual(documentPaths(row, tree), [row.source_path, 'skills/deck/README.md'])
assert.deepEqual(documentPaths({ ...row, source_path: 'missing/SKILL.md' }, tree), [], 'Do not substitute the root README for an unknown nested skill')
assert.deepEqual(documentPaths({ ...row, source_path: null, repository: 'https://github.com/author/repo/tree/main/skills/deck' }, tree), [row.source_path, 'skills/deck/README.md'])
const docs = [{ path: row.source_path, text: '![Deck preview](examples/cover.png)\n<video src="examples/demo.mp4"></video>\n![Company logo](examples/logo.png)\n![Sample](restricted/example.png)\n![External](https://other.example/a.png)\n```md\n![Unrelated](../other/examples/cover.png)\n```' }]
const found = discoverAssets(docs, tree, { repository: row.github_repo, revision: rev, ref: 'main', sourcePath: row.source_path })
assert.deepEqual(found.candidates.map(item => item.asset), ['skills/deck/examples/cover.png', 'skills/deck/examples/demo.mp4'])
assert.ok(found.skipped.some(item => item.reason === 'nested-license'))
assert.ok(found.skipped.some(item => item.reason === 'external-or-unresolved-source'))
assert.ok(!found.candidates.some(item => item.asset.includes('/other/')))
const rootDiscovery = discoverAssets([{ path: 'SKILL.md', text: '' }], [...tree, blob('SKILL.md'), blob('examples/root.png')], { repository: row.github_repo, revision: rev, ref: 'main', sourcePath: 'SKILL.md' })
assert.equal(rootDiscovery.candidates.length, 0, 'A monorepo root cannot claim sibling examples')
const branding = discoverAssets([{ path: 'README.md', text: '![Brand](assets/repo-dark.png)\n![App](assets/appicon.png)\n![acot](assets/repository-header.png)\n![Project](assets/repo_header.webp)\n# Sponsors\n![Partner](assets/partner.png)\n# Usage\n![Architecture](assets/diagram.png)' }], ['assets/repo-dark.png', 'assets/appicon.png', 'assets/repository-header.png', 'assets/repo_header.webp', 'assets/partner.png', 'assets/diagram.png'].map(blob), { repository: row.github_repo, revision: rev, ref: 'main' })
assert.deepEqual(branding.candidates.map(item => item.asset), ['assets/diagram.png'], 'Brand and sponsor art are not Skill previews')
assert.equal(branding.candidates[0].kind, 'reference', 'Documentation is not an independently verified output example')
const markup = discoverAssets([{ path: 'README.md', text: '<!-- ![Hidden](hidden.png) -->\n![<b>Actual chart</b><script>ignored</script>](chart.png)\n<!-- unclosed ![Hidden](hidden.png)' }], ['hidden.png', 'chart.png'].map(blob), { repository: row.github_repo, revision: rev, ref: 'main' })
assert.deepEqual(markup.candidates.map(item => [item.asset, item.label]), [['chart.png', 'Actual chart']], 'Parse comments and caption markup instead of partially stripping tag strings')
const state = { [row.slug]: { identity: identity(row), nextAt: '2026-10-08T00:00:00Z' } }
assert.equal(selectBatch([row], state, { now }).batch.length, 0)
assert.equal(selectBatch([{ ...row, source_path: 'skills/new/SKILL.md' }], state, { now }).batch.length, 1)
assert.notEqual(identity({ ...row, source_path: null, repository: 'https://github.com/author/repo/tree/main/one' }), identity({ ...row, source_path: null, repository: 'https://github.com/author/repo/tree/main/two' }), 'Legacy URL-only source directories remain distinct')
const queue = Array.from({ length: 12 }, (_, i) => ({ ...row, slug: `older-${i}`, created_at: '2026-01-01' }))
assert.ok(selectBatch([...queue, { ...row, slug: 'new-other', category: 'development' }], {}, { now, limit: 6 }).batch.some(item => item.slug === 'new-other'), 'New Skills get slots outside visual categories')

let pages = 0
assert.equal((await fetchCatalog({ fetcher: async () => Response.json(++pages === 1 ? { records: [row], next: row.slug } : { records: [{ ...row, slug: 'next-skill' }], next: null }) })).length, 2)
await assert.rejects(fetchCatalog({ fetcher: async () => new Response(null, { status: 503 }) }), /503/)
await assert.rejects(fetchCatalog({ fetcher: async () => Response.json({ records: [row], next: 'wrong-cursor' }) }), /pagination/)
await assert.rejects(fetchCatalog({ fetcher: async () => Response.json({ records: [], next: null }) }), /Empty/)
assert.throws(() => mediaFeedCursor('a,listing_status.eq.pending'))
assert.doesNotMatch(MEDIA_FEED_SELECT, /email|submitted_by|review|token|owner_publication/)

const require = createRequire(import.meta.url)
const sharp = require(require.resolve('sharp', { paths: [require.resolve('next/package.json')] }))
const sampleImage = color => sharp({ create: { width: 900, height: 600, channels: 3, background: color } }).composite([{ input: Buffer.from('<svg width="900" height="600"><rect x="90" y="70" width="580" height="320" fill="white"/></svg>') }]).png().toBuffer()
let bytes = await sampleImage('blue')
const rendered = await renderAsset(bytes, 'examples/cover.png')
assert.equal(rendered.media.width, 900)
assert.equal((await sharp(rendered.files.get(rendered.media.cardSrc)).metadata()).width, 720)
assert.equal(digest(rendered.files.get(rendered.media.originalSrc)), rendered.media.sha256)
assert.ok(rendered.files.get(rendered.media.cardSrc).length < 180 * 1024)
await assert.rejects(renderAsset(Buffer.from('<html>HTTP 200 Error</html>'), 'a.png'))
await assert.rejects(renderAsset(await sharp({ create: { width: 900, height: 600, channels: 3, background: 'white' } }).png().toBuffer(), 'blank.png'), /blank-preview/)
await assert.rejects(renderAsset(Buffer.from('<html>HTTP 200 Error</html>'), 'a.mp4'), /invalid-video/)
const decoder = async (_program, args) => {
  const input = args.includes('-singlefile') ? args.at(-1) + '.png' : args.at(-1)
  await writeFile(input, bytes); return { stdout: bytes }
}
assert.equal((await renderAsset(Buffer.from('%PDF-1.4 test'), 'a.pdf', { execFile: decoder })).format, 'pdf-cover')
assert.equal((await renderAsset(Buffer.from('\0\0\0\x20ftypisom'), 'a.mp4', { execFile: decoder })).format, 'video')
assert.equal((await renderAsset(Buffer.from('PK\x03\x04'), 'a.pptx', { execFile: async () => ({ stdout: bytes }) })).format, 'pptx-cover')
const gif = await sharp(bytes).gif().toBuffer()
assert.ok((await renderAsset(gif, 'a.gif')).media.originalSrc.endsWith('.gif'))

// Run with system decoders in the collection workflow (also exercised locally).
// Fixtures are generated here; no repository code or document macros run.
if (process.env.MEDIA_NATIVE_TESTS === '1') {
  const exec = promisify(execFile), nativeDir = await mkdtemp(path.join(tmpdir(), 'oas-native-media-'))
  try {
    const clip = path.join(nativeDir, 'sample.mp4')
    await exec(process.env.FFMPEG_BIN || 'ffmpeg', ['-nostdin', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=12', '-t', '1', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', clip], { timeout: 30000 })
    assert.equal((await renderAsset(await readFile(clip), 'sample.mp4')).format, 'video')
    const content = '0.1 0.3 0.8 rg 40 40 400 220 re f\n'
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 400] /Contents 4 0 R >>', `<< /Length ${content.length} >>\nstream\n${content}endstream`]
    let pdf = '%PDF-1.4\n'; const offsets = []
    for (const [index, object] of objects.entries()) { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` }
    const xref = pdf.length
    pdf += `xref\n0 5\n0000000000 65535 f \n${offsets.map(offset => String(offset).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
    assert.equal((await renderAsset(Buffer.from(pdf), 'sample.pdf')).format, 'pdf-cover')
    const thumbnail = path.join(nativeDir, 'thumbnail.png'), deck = path.join(nativeDir, 'sample.pptx')
    await writeFile(thumbnail, bytes)
    await exec(process.env.PYTHON_BIN || 'python3', ['-c', 'import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1],"w") as z:z.write(sys.argv[2],"docProps/thumbnail.png")', deck, thumbnail])
    assert.equal((await renderAsset(await readFile(deck), 'sample.pptx')).format, 'pptx-cover')
    console.log('Native ffmpeg video, PDF first page, and PowerPoint embedded cover decoding passed.')
  } finally { await rm(nativeDir, { recursive: true, force: true }) }
}

const fixture = await mkdtemp(path.join(tmpdir(), 'oas-skill-media-test-'))
try {
  await mkdir(path.join(fixture, 'lib'))
  await mkdir(path.join(fixture, 'scripts/skill-media'), { recursive: true })
  const put = async (file, value) => writeFile(path.join(fixture, file), JSON.stringify(value))
  for (const file of ['skill-previews-auto', 'skill-previews', 'skill-preview-bindings']) await put(`lib/${file}.json`, [])
  await put('lib/showcase-groups.json', {})
  await put('scripts/skill-media/exclusions.json', [])
  await put('lib/skill-media-sync.json', { version: 1, checkedAt: null, records: {} })
  let licensed = true, calls = 0, fail = false
  const reader = {
    repository: async () => {
      calls++
      if (fail) throw Error('Source HTTP 403')
      return { revision: rev, ref: 'main', tree: [blob(row.source_path), blob('skills/deck/examples/cover.png')], license: licensed ? { name: 'MIT', path: 'LICENSE', sha256: digest('MIT'), bytes: Buffer.from('MIT') } : null }
    },
    raw: async (_repo, _revision, file) => file.endsWith('.md') ? Buffer.from('![Author result](examples/cover.png)') : bytes,
  }
  const run = options => collectSkillMedia({ root: fixture, catalog: [row], now, reader, ...options })
  assert.equal((await run()).statuses.collected, 1)
  const first = await readFile(path.join(fixture, 'lib/skill-previews-auto.json'), 'utf8')
  const media = JSON.parse(first)[0].media[0]
  assert.ok((await stat(path.join(fixture, 'public', media.cardSrc))).size)
  const priorCalls = calls
  assert.equal((await run()).attempted, 0)
  assert.equal(calls, priorCalls, 'Idempotent reruns do not download known sources')
  assert.equal(await readFile(path.join(fixture, 'lib/skill-previews-auto.json'), 'utf8'), first)
  bytes = await sampleImage('red')
  await run({ now: '2026-11-08T00:00:00.000Z', refresh: true })
  const updated = await readFile(path.join(fixture, 'lib/skill-previews-auto.json'), 'utf8')
  assert.notEqual(JSON.parse(updated)[0].media[0].src, media.src, 'Content changes get new cache-safe URLs')
  fail = true
  await assert.rejects(run({ now: '2026-12-09T00:00:00.000Z' }), /previous catalog retained/)
  assert.equal(await readFile(path.join(fixture, 'lib/skill-previews-auto.json'), 'utf8'), updated)
  fail = false; licensed = false
  assert.equal((await run({ now: '2026-12-09T00:00:00.000Z' })).statuses['needs-review'], 1)
  assert.equal(JSON.parse(await readFile(path.join(fixture, 'lib/skill-previews-auto.json'), 'utf8')).length, 0)
  licensed = true
  bytes = await sampleImage('green')
  assert.equal((await run({ now: '2027-01-09T00:00:00.000Z', maxBytes: 1 })).statuses.deferred, 1, 'Budget overflow stays in the retry queue')
} finally { await rm(fixture, { recursive: true, force: true }) }

let tokenSent = false
const remote = githubReader({ token: 'test-only-token', fetcher: async (url, options) => {
  if (url.startsWith('https://api.github.com/')) { assert.equal(options.headers.Authorization, 'Bearer test-only-token'); tokenSent = true }
  else assert.equal(options.headers.Authorization, undefined)
  if (url.endsWith('/author/repo')) return Response.json({ private: false, default_branch: 'main' })
  if (url.includes('/commits/')) return Response.json({ sha: rev })
  if (url.includes('/git/trees/')) return Response.json({ tree: [blob('README.md'), blob('LICENSE')] })
  if (url.includes('/license?')) return Response.json({ path: 'LICENSE', license: { spdx_id: 'MIT' } })
  return new Response('Permission is hereby granted, free of charge')
} })
assert.equal((await remote.repository(row)).license.name, 'MIT')
assert.ok(tokenSent)

// Production manifests are checked in the same suite as collector behavior.
const automatic = JSON.parse(await readFile('lib/skill-previews-auto.json', 'utf8'))
assert.equal(new Set(automatic.map(item => item.skillSlug)).size, automatic.length)
for (const item of automatic) {
  assert.match(item.revision, /^[a-f0-9]{40}$/)
  assert.match(item.documentSha256, /^[a-f0-9]{64}$/)
  assert.ok((await stat(`public${item.licenseUrl}`)).size)
  assert.ok(item.media.length > 0 && item.media.length <= 3)
  for (const media of item.media) {
    const original = media.videoSrc || media.originalSrc
    assert.equal(digest(await readFile(`public${original}`)), media.sha256)
    for (const url of [media.src, media.cardSrc, media.previewSrc, original]) assert.ok(url.startsWith('/skill-previews/auto/') && (await stat(`public${url}`)).size)
    assert.ok((await stat(`public${media.cardSrc}`)).size < 180 * 1024)
    assert.ok(media.sourceUrl.startsWith(`https://github.com/${item.repository}/blob/${item.revision}/`))
  }
}
console.log(`Automatic media: exact association, safe sources, public pagination, fair queue/retries, source changes, real image decoding, decoder contracts, license handling, fail-safe publication, and ${automatic.length} collected Skills passed.`)
