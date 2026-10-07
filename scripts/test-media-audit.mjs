import assert from 'node:assert/strict'
import { publicMediaUrl, mediaSignature, probeMedia } from './audit-skill-media.mjs'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as react from 'react'
import * as jsx from 'react/jsx-runtime'
import * as icons from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'

for (const url of ['http://skillry.dev/a', 'https://localhost/a', 'https://127.0.0.1/a', 'https://skillry.dev.evil.example/a', 'https://user:password@skillry.dev/a', 'https://skillry.dev:8443/a', 'https://arbitrary-bucket.s3.amazonaws.com/a']) assert.throws(() => publicMediaUrl(url))
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 0, 0, 0, 0])
const mp4 = Buffer.from('\0\0\0\x20ftypisom')
assert.equal(mediaSignature(png, 'image'), true)
assert.equal(mediaSignature(mp4, 'video'), true)
assert.equal(mediaSignature(png, 'video'), false)
assert.equal(mediaSignature(Buffer.from('<html>Unavailable</html>'), 'image'), false)
const calls = []
await probeMedia('https://skillry.dev/preview.webp', 'image', async (url, options) => { calls.push({ url, options }); return new Response(png, { status: 206 }) })
assert.equal(calls[0].options.headers.Range, 'bytes=0-63')
await assert.rejects(probeMedia('https://skillry.dev/preview.webp', 'image', async () => new Response('<html>Error</html>')), /Not a supported image/)
await assert.rejects(probeMedia('https://skillry.dev/preview.webp', 'image', async () => new Response(null, { status: 404 })), /HTTP 404/)
let redirects = 0
await assert.rejects(probeMedia('https://github.com/user-attachments/a', 'video', async () => {
  redirects++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/secrets' } })
}), /Unapproved media host/)
assert.equal(redirects, 1, 'Do not fetch an unapproved redirect destination')
let cancelled = false
await probeMedia('https://skillry.dev/preview.mp4', 'video', async () => new Response(new ReadableStream({
  start(controller) { controller.enqueue(mp4); controller.enqueue(Buffer.alloc(32)) },
  cancel() { cancelled = true },
})))
assert.ok(cancelled, 'Stop the response stream instead of downloading a full video')

// Exercise the actual player markup at each state; posters are not a playback
// prerequisite and a failed video always offers its original URL and retry.
let state = [], index = 0
const exports = {}
new Function('exports', 'require', ts.transpileModule(readFileSync('components/provider-video-preview.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)(exports, name => {
  if (name === 'react') return { ...react, useState: initial => [state[index++] ?? initial, () => {}] }
  if (name === 'react/jsx-runtime') return jsx
  if (name === 'lucide-react') return icons
  if (name === 'next/image') return { default: ({ fill, unoptimized, onError, ...props }) => { void fill; void unoptimized; void onError; return react.createElement('img', props) } }
  throw Error(name)
})
function render(values) {
  state = values; index = 0
  return renderToStaticMarkup(react.createElement(exports.ProviderVideoPreview, { src: '/actual.mp4', poster: '/poster.webp', title: 'Actual example', zh: false, compact: true }))
}
assert.doesNotMatch(render([false, false, false]), /<video|src="\/actual.mp4"/, 'SSR cannot preload video data')
assert.match(render([false, false, true]), /Play example: Actual example/, 'A broken poster must not remove playback')
assert.doesNotMatch(render([false, false, true]), /<img/)
assert.match(render([true, false, false]), /<video[^>]+src="\/actual.mp4"/)
assert.match(render([true, false, false]), /preload="none"/)
assert.match(render([true, true, false]), /href="\/actual.mp4"/)
assert.match(render([true, true, false]), /Retry preview/)
console.log('Media audit: safe redirects, range/signature checks, stream cancellation, and click-to-load video failure states passed.')
