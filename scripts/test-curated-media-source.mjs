import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { curatedSourceUrls, fetchCuratedBytes } from './skill-media/curated-source.mjs'

const source = { repository: 'author/skill', revision: 'a'.repeat(40) }
const urls = curatedSourceUrls(source, 'example.mp4', 'v1.2')
assert.equal(urls.sourceUrl, 'https://github.com/author/skill/releases/download/v1.2/example.mp4')
assert.equal(curatedSourceUrls(source, 'docs/image.png').download, `https://raw.githubusercontent.com/author/skill/${source.revision}/docs/image.png`)
for (const [file, tag] of [['../secret', undefined], ['x.mp4', '../main'], ['folder/x.mp4', 'v1.2'], ['x.mp4', 'v1?token=secret'], ['x%2f.mp4', 'v1']]) {
  assert.throws(() => curatedSourceUrls(source, file, tag))
}
assert.throws(() => curatedSourceUrls({ ...source, revision: 'main' }, 'x.mp4', 'v1'))
const bytes = Buffer.from('original author video bytes')
const hash = createHash('sha256').update(bytes).digest('hex')
let calls = 0
const fetcher = async (url, options) => {
  calls++
  assert.equal(options.redirect, 'manual')
  assert.equal(options.headers, undefined, 'No credential is forwarded to media hosts')
  return url.hostname === 'github.com'
    ? new Response(null, { status: 302, headers: { location: 'https://release-assets.githubusercontent.com/example' } })
    : new Response(bytes)
}
assert.deepEqual(await fetchCuratedBytes(urls.download, hash, 100, { fetcher }), bytes)
assert.equal(calls, 2)
for (const location of ['https://attacker.example/video', 'http://release-assets.githubusercontent.com/file', 'https://user:secret@release-assets.githubusercontent.com/file', 'https://release-assets.githubusercontent.com:1234/file']) {
  await assert.rejects(fetchCuratedBytes(urls.download, hash, 100, { fetcher: async () => new Response(null, { status: 302, headers: { location } }) }))
}
await assert.rejects(fetchCuratedBytes('https://attacker.example/video', hash, 100), /source host/)
await assert.rejects(fetchCuratedBytes(urls.download, 'b'.repeat(64), 100, { fetcher }), /hash changed/)
await assert.rejects(fetchCuratedBytes(urls.download, hash, 3, { fetcher }), /too large/)
await assert.rejects(fetchCuratedBytes(urls.download, hash, 100, { fetcher: async () => new Response(null, { status: 302, headers: { location: 'https://release-assets.githubusercontent.com/loop' } }) }), /Too many/)
await assert.rejects(fetchCuratedBytes(urls.download, hash, 100, { fetcher: async () => new Response('not found', { status: 404 }) }), /unavailable/)
const pinnedRaw = curatedSourceUrls(source, 'docs/image.png').download
const pointer = Buffer.from(`version https://git-lfs.github.com/spec/v1\noid sha256:${hash}\nsize ${bytes.length}\n`)
const lfsFetch = async (url, options) => {
  const target = new URL(url)
  assert.ok(!options.headers?.Authorization)
  if (target.hostname === 'raw.githubusercontent.com') return new Response(pointer)
  assert.equal(target.href, `https://media.githubusercontent.com/media/author/skill/${source.revision}/docs/image.png`)
  assert.equal(options.redirect, 'error')
  return new Response(bytes)
}
assert.deepEqual(await fetchCuratedBytes(pinnedRaw, hash, 1024, { fetcher: lfsFetch }), bytes)
await assert.rejects(fetchCuratedBytes(pinnedRaw, 'b'.repeat(64), 1024, { fetcher: lfsFetch }), /hash changed/, 'LFS pointer integrity does not replace the reviewed source hash')
console.log('Curated media: exact source paths, trusted release redirects, byte limits and SHA-256 pinning passed.')
