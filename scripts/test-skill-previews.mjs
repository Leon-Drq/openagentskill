import assert from 'node:assert/strict'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire, register } from 'node:module'
import { createElement } from 'react'
import * as react from 'react'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import * as icons from 'lucide-react'
import { parse } from 'parse5'
import ts from 'typescript'
import { curatedSourceUrls } from './skill-media/curated-source.mjs'
import './test-curated-media-source.mjs'

register('./test-owner-publication-loader.mjs', import.meta.url)
const { getSkillSourcePreview, getSkillPreviewCardData, SOURCE_EXAMPLE_SKILL_SLUGS, SOURCE_GALLERY_LINKS } = await import('../lib/skill-previews.ts')
const shared = await import('../lib/skill-preview-shared.ts')
const showcase = await import('../lib/showcase.ts')
const routing = await import('../lib/i18n/market-routing.ts')
const sources = JSON.parse(readFileSync('lib/skill-preview-sources.json', 'utf8'))
const previews = JSON.parse(readFileSync('lib/skill-previews.json', 'utf8'))
const require = createRequire(import.meta.url)
const sharp = require(require.resolve('sharp', { paths: [require.resolve('next/package.json')] }))
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const file = url => `public${url}`
assert.equal(new Set(previews.map(item => item.skillSlug)).size, previews.length)
assert.deepEqual(sources.map(item => item.skillSlug), previews.map(item => item.skillSlug))
for (const preview of previews) {
  const source = sources.find(item => item.skillSlug === preview.skillSlug)
  assert.equal(getSkillSourcePreview(preview.skillSlug), getSkillSourcePreview(preview.skillSlug))
  assert.equal(preview.revision, source.revision)
  assert.match(preview.revision, /^[a-f0-9]{40}$/)
  assert.equal(digest(readFileSync(file(preview.licenseUrl))), source.licenseSha256)
  assert.equal(preview.media.length, source.media.length)
  assert.deepEqual(getSkillPreviewCardData(preview.skillSlug), { media: preview.media[0], imageCount: preview.media.length, format: preview.format })
  for (const [index, media] of preview.media.entries()) {
    assert.equal(media.sourceUrl, curatedSourceUrls(source, source.media[index].path, source.media[index].releaseTag).sourceUrl)
    if (source.media[index].releaseTag) assert.match(source.documentSha256, /^[a-f0-9]{64}$/, 'Release examples retain the pinned documentation identity')
    assert.equal(digest(readFileSync(file(media.videoSrc || media.originalSrc || media.src))), source.media[index].sha256)
    if (media.videoSrc) {
      const signature = readFileSync(file(media.videoSrc)).subarray(0, 8)
      assert.ok(signature.subarray(4).toString() === 'ftyp' || signature.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])), 'Preserve the actual video, not an image pretending to be video')
      assert.ok(media.videoSrc.startsWith(`/skill-previews/${preview.skillSlug}/`), 'Curated video is outside automatic pruning')
    }
    assert.equal(media.sha256, source.media[index].sha256)
    const poster = source.media[index].poster
    if (poster) {
      assert.equal(digest(readFileSync(file(media.posterOriginalSrc))), poster.sha256)
      assert.equal(media.posterSourceUrl, curatedSourceUrls(source, poster.path, poster.releaseTag).sourceUrl)
      assert.equal(media.posterSha256, poster.sha256)
    }
    const metadata = await sharp(file(media.src)).metadata()
    assert.equal(media.width, metadata.width); assert.equal(media.height, metadata.height)
    for (const [url, width] of [[media.cardSrc, 720], [media.previewSrc, 1600]]) {
      assert.ok(existsSync(file(url)))
      const variant = await sharp(file(url)).metadata()
      assert.equal(variant.format, 'webp'); assert.ok(variant.width <= width)
      assert.ok(Math.abs(variant.width / variant.height - media.width / media.height) < 0.005, 'Preserve the entire frame without distortion')
    }
    assert.ok(statSync(file(media.cardSrc)).size < 180 * 1024)
    for (const locale of ['en', 'zh']) assert.ok(media.alt[locale] && media.title[locale] && preview.format[locale] && preview.note[locale])
  }
}
assert.equal(getSkillSourcePreview('unrelated-ppt-master-fork'), null, 'Never attach a preview by name or broad repository similarity')
assert.ok(SOURCE_EXAMPLE_SKILL_SLUGS.includes('hugohe3-ppt-master'))
const stickmanSlug = 'kaomei-stickman-video-director-directing-stickman-videos'
assert.ok(SOURCE_EXAMPLE_SKILL_SLUGS.includes(stickmanSlug), 'Author videos participate in With examples filtering')
assert.equal(getSkillSourcePreview(stickmanSlug).media.filter(media => media.videoSrc).length, 3)
assert.match(getSkillPreviewCardData(stickmanSlug).media.sourceUrl, /style-3-demo\.mp4$/, 'New prehistoric style leads the directory preview')
const sweetySlug = 'threerocks-sweety-handdraw-video-sweety-handdraw-video'
assert.ok(SOURCE_EXAMPLE_SKILL_SLUGS.includes(sweetySlug), 'Hand-drawn author videos participate in With examples')
assert.equal(getSkillSourcePreview(sweetySlug).media.filter(media => media.videoSrc).length, 2)
assert.match(getSkillPreviewCardData(sweetySlug).media.sourceUrl, /snake-story\.mp4$/, 'The short snake fable leads the card preview')
assert.ok(!SOURCE_EXAMPLE_SKILL_SLUGS.includes('enricoros-big-agi'), 'Interface screenshots alone do not satisfy With examples')
assert.ok(!SOURCE_EXAMPLE_SKILL_SLUGS.includes('adobe-research-custom-diffusion'), 'A source-gallery link is not a locally collected example')
assert.ok(SOURCE_GALLERY_LINKS['adobe-research-custom-diffusion'])
assert.deepEqual(showcase.getShowcasesForSkill('liamgvchi-gc-minimal-zine-poster'), showcase.getShowcasesForSkill('liamgvchi-gc-minimal-zine-poster-v0-3'))
assert.ok(!showcase.SHOWCASE_SKILL_SLUGS.includes('liamgvchi-gc-minimal-zine-poster'), 'With examples queries the canonical record once, while old cards can still resolve their preview')
assert.equal(showcase.getShowcasesForSkill('unrelated-gc-minimal-zine-poster').length, 0)

let failedSrc = []
const dependencies = {
  '@/lib/skills/product-metadata': await import('../lib/skills/product-metadata.ts'),
  '@/lib/i18n/handoff-copy': await import('../lib/i18n/handoff-copy.ts'),
  react: { ...react, useState: () => [failedSrc, () => {}] }, 'react/jsx-runtime': jsx, 'lucide-react': icons,
  'next/image': { default: ({ fill, sizes, onError, ...props }) => { void fill; void sizes; void onError; return createElement('img', props) } },
  '@/components/crawl-link': { default: ({ children, prefetch, ...props }) => { void prefetch; return createElement('a', props, children) } },
  '@/lib/skill-preview-shared': shared, '@/lib/showcase-shared': showcase, '@/lib/i18n/market-routing': routing,
  '@/components/skill-preview-image': { SkillPreviewImage: ({ locale, ...props }) => { void locale; return createElement(dependencies['next/image'].default, props) } },
  '@/components/showcase-video-player': { ShowcaseVideoPlayer: ({ item }) => createElement('button', { 'data-gallery-video': item.videoUrl }, 'Play preview') },
  '@/components/provider-video-preview': { ProviderVideoPreview: ({ src }) => createElement('button', { 'data-provider-video': src }, 'Play preview') },
}
function component(path) {
  const exports = {}
  new Function('exports', 'require', ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)(exports, name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`); return dependencies[name]
  })
  return exports
}
const { SkillCardPreview } = component('components/skill-card-preview.tsx')
const { SkillSourcePreviews } = component('components/skill-source-previews.tsx')
const nodes = node => [node, ...(node.childNodes || []).flatMap(nodes)]
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('')
const render = (Component, props) => nodes(parse(renderToStaticMarkup(createElement(Component, props))))
const stickmanCard = getSkillPreviewCardData(stickmanSlug)
assert.ok(render(SkillCardPreview, { slug: stickmanSlug, name: 'Stickman Video Director', locale: 'en', category: 'Video & audio', sourcePreview: stickmanCard })
  .some(node => attr(node, 'data-provider-video') === stickmanCard.media.videoSrc), 'Directory card retains the author video')
const props = { slug: 'hugohe3-ppt-master', name: 'PPT Master', locale: 'zh', category: '演示文稿', sourcePreview: getSkillPreviewCardData('hugohe3-ppt-master') }
let all = render(SkillCardPreview, props)
assert.ok(all.some(node => node.tagName === 'img' && attr(node, 'alt') === props.sourcePreview.media.alt.zh && attr(node, 'class').includes('object-contain')))
assert.ok(all.some(node => node.tagName === 'a' && attr(node, 'href') === '/skills/hugohe3-ppt-master?lang=zh#visual-previews'))
failedSrc = [props.sourcePreview.media.cardSrc]
all = render(SkillCardPreview, props)
assert.ok(!all.some(node => node.tagName === 'img'))
assert.ok(all.some(node => node.tagName === 'p' && text(node).includes('预览暂不可用')))
failedSrc = []
all = render(SkillCardPreview, { ...props, sourcePreview: null })
assert.ok(all.some(node => node.tagName === 'p' && text(node).includes('暂未收录效果图')))
assert.ok(!all.some(node => /aspect-|min-h-52/.test(attr(node, 'class') || '')), 'Missing media must not reserve a giant empty cover')
all = render(SkillCardPreview, { ...props, sourcePreview: null, exampleUrl: 'https://www.openagentskill.com/blog/video-link-downloader-douyin-archive-workflow' })
assert.ok(all.some(node => node.tagName === 'a' && attr(node, 'data-product-example') !== undefined && text(node).includes('查看示例')))
assert.ok(!all.some(node => node.tagName === 'p' && text(node).includes('暂未收录效果图')), 'A real example link must not be presented as missing')
for (const exampleUrl of ['javascript:alert(1)', 'http://localhost/private', 'https://user:password@github.com/private']) {
  all = render(SkillCardPreview, { ...props, sourcePreview: null, exampleUrl })
  assert.ok(!all.some(node => attr(node, 'data-product-example') !== undefined), 'Reject unsafe example links')
}
const motionPreview = getSkillSourcePreview('alchaincyf-huashu-motion-huashu-motion')
assert.ok(SOURCE_EXAMPLE_SKILL_SLUGS.includes(motionPreview.skillSlug))
assert.match(motionPreview.media[0].originalSrc, /\.gif$/)
assert.equal(motionPreview.media[0].videoSrc, undefined, 'A GIF excerpt is not a complete playable video')
const slide = showcase.SHOWCASE_CASES.find(item => item.category === 'slides')
all = render(SkillCardPreview, { ...props, showcase: showcase.getShowcaseCardData(slide) })
assert.ok(all.some(node => node.tagName === 'img' && attr(node, 'src').includes(showcase.getShowcaseImageSrc(slide.media[0].src, 'card')) && attr(node, 'class').includes('object-contain')))
assert.ok(!all.some(node => node.tagName === 'img' && attr(node, 'src') === props.sourcePreview.media.cardSrc), 'Existing Gallery media takes precedence')
all = render(SkillCardPreview, { ...props, provider: { image: '/provider-preview.webp', exampleLabel: 'Source example' } })
assert.ok(all.some(node => node.tagName === 'img' && attr(node, 'src') === '/provider-preview.webp'))
failedSrc = ['/provider-preview.webp']
all = render(SkillCardPreview, { ...props, provider: { image: '/provider-preview.webp', exampleLabel: 'Source example' } })
assert.ok(all.some(node => node.tagName === 'img' && attr(node, 'src') === props.sourcePreview.media.cardSrc), 'A failed preferred image falls back to another real source')
failedSrc = []
all = render(SkillCardPreview, { ...props, provider: { image: '/poster.webp', video: '/example.mp4', exampleLabel: 'Source example' } })
assert.ok(all.some(node => attr(node, 'data-provider-video') === '/example.mp4'))
const videoCase = showcase.SHOWCASE_CASES.find(item => item.videoUrl)
all = render(SkillCardPreview, { ...props, showcase: showcase.getShowcaseCardData(videoCase) })
assert.ok(all.some(node => attr(node, 'data-gallery-video') === videoCase.videoUrl))
const bindings = JSON.parse(readFileSync('lib/skill-preview-bindings.json', 'utf8'))
for (const binding of bindings) {
  const preview = getSkillSourcePreview(binding.skillSlug)
  assert.ok(preview && SOURCE_EXAMPLE_SKILL_SLUGS.includes(binding.skillSlug))
  assert.equal(preview.bindingUrl, `https://github.com/${binding.repository}/blob/${binding.revision}/${binding.sourcePath}`)
  assert.match(binding.documentSha256, /^[a-f0-9]{64}$/)
  assert.match(binding.revision, /^[a-f0-9]{40}$/)
  assert.equal(getSkillSourcePreview('fork-' + binding.skillSlug), null)
  const expected = binding.caseSlugs.flatMap(slug => showcase.getShowcaseCase(slug).media.map(media => media.src))
  assert.deepEqual(preview.media.map(media => media.src), expected)
  all = render(SkillSourcePreviews, { preview, locale: 'zh' })
  assert.ok(all.some(node => attr(node, 'href') === preview.bindingUrl))
  assert.ok(all.some(node => node.tagName === 'p' && text(node) === preview.note.zh))
}
for (const preview of previews) {
  all = render(SkillSourcePreviews, { preview, locale: 'en' })
  assert.equal(all.filter(node => node.tagName === 'img').length, preview.media.filter(media => !media.videoSrc).length)
  assert.ok(all.some(node => attr(node, 'id') === 'visual-previews'))
  assert.ok(all.some(node => node.tagName === 'p' && text(node) === preview.note.en))
  for (const media of preview.media) {
    assert.ok(all.some(node => node.tagName === 'a' && attr(node, 'href') === media.sourceUrl))
    if (media.videoSrc) assert.ok(all.some(node => attr(node, 'data-provider-video') === media.videoSrc), 'Detail keeps a playable video')
    else assert.ok(all.some(node => node.tagName === 'a' && attr(node, 'href') === media.src))
    assert.ok(all.some(node => node.tagName === 'h3' && text(node) === media.title.en))
  }
}
console.log(`Skill previews: ${previews.length} exact skill bindings, ${previews.reduce((n, p) => n + p.media.length, 0)} source-checked previews, licenses, thumbnails, SSR links, video playback, media priority, complete-slide framing and missing/broken-image fallbacks passed.`)
