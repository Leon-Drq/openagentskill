import { z } from 'zod'
import { SKILLRY_LISTINGS } from './skillry-catalog'
import { externalSourceHref } from './external-outbound'

// Editorial metadata only. Never mirror bundles or turn these records into
// GitHub SkillRecords: external discovery is not installation authorization.
const httpsUrl = z.string().url().refine(value => {
  const url = new URL(value)
  return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
}, 'Use a stable HTTPS URL without credentials or signed query parameters.')
const localized = z.object({ en: z.string().min(1), zh: z.string().min(1) }).strict()
const RedSkillSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  provider: z.literal('redskill'),
  identifier: z.string().regex(/^skill-[a-z0-9-]+$/),
  skillName: z.string().min(1),
  title: localized,
  description: localized,
  author: z.object({ name: z.string().min(1), url: httpsUrl }).strict(),
  sourceUrl: httpsUrl,
  sourcePostUrl: httpsUrl,
  version: z.string().min(1),
  bundleSha256: z.string().regex(/^[a-f0-9]{64}$/),
  license: z.literal('CC-BY-NC-4.0'),
  licenseUrl: httpsUrl,
  commercialUse: z.literal('not-permitted-without-separate-permission'),
  licenseNote: localized,
  limitations: localized,
  usage: localized,
  examples: z.array(z.object({ title: localized, description: localized }).strict()).min(1),
  tags: z.array(z.string().min(1)).min(1),
  publishedAt: z.string().datetime(),
  runtimeDemo: z.object({
    video: z.string().regex(/^\/media\/external\/[a-z0-9/-]+\.mp4$/),
    poster: z.string().regex(/^\/media\/external\/[a-z0-9/-]+\.webp$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    recordedAt: z.string().datetime(),
    publishedAt: z.string().datetime(),
    durationSeconds: z.number().positive(),
    environment: z.string().min(1),
    scope: localized,
    displayPermission: z.literal('site-owner-confirmed-noncommercial-display'),
  }).strict().optional(),
  publication: z.object({ channel: z.literal('owner-curated-external'), reason: z.string().min(10) }).strict(),
  runtimeVerified: z.literal(false),
  aiReviewed: z.literal(false),
  autoInstallAllowed: z.literal(false),
}).strict()
const skillrySourceUrl = httpsUrl.refine(value => /^https:\/\/skillry\.dev\/skills\/bs-[a-z0-9-]+$/.test(value), 'Use the original Skillry product URL.')
const SkillrySchema = RedSkillSchema.extend({
  provider: z.literal('skillry'),
  author: z.object({ name: z.literal('Skillry'), url: z.literal('https://skillry.dev') }).strict(),
  sourceUrl: skillrySourceUrl,
  sourcePostUrl: skillrySourceUrl,
  bundleSha256: z.null(),
  license: z.literal('Skillry-terms'),
  licenseUrl: z.literal('https://skillry.dev/terms'),
  commercialUse: z.literal('outputs-permitted-package-redistribution-restricted'),
  examples: z.array(z.object({ title: localized, description: localized }).strict()).length(0),
  runtimeDemo: z.undefined().optional(),
  outputType: z.enum(['image', 'presentation', 'html', 'video']),
  version: z.string().min(1).nullable(), versionObservedAt: z.string().datetime().nullable(),
  active: z.boolean(), seoIndexable: z.boolean(),
  previewVideo: z.string().url().refine(value => {
    const url = new URL(value); return url.origin === 'https://skillry.dev' && !url.username && !url.password && !url.hash && /^\/skills\/bs-[a-z0-9-]+\/media\/preview\.mp4$/.test(url.pathname) && [...url.searchParams.keys()].every(key => key === 'v')
  }).nullable(),
  previewImages: z.array(z.string().url().refine(value => {
    const url = new URL(value)
    return url.origin === 'https://skillry.dev' && !url.username && !url.password && !url.hash &&
      /^\/skills\/bs-[a-z0-9-]+\/media\/preview-\d+\.webp$/.test(url.pathname) &&
      [...url.searchParams.keys()].every(key => key === 'v' || key === 'variant') && url.searchParams.get('variant') === 'detail'
  }, 'Use an original public Skillry example image.')).min(1).max(16),
  listingEvidence: z.object({
    featured: z.boolean(), priceUsdCents: z.number().int().nonnegative().max(1000000), downloadCount: z.number().int().min(11),
    observedAt: z.string().datetime(), sourceDocumentSha256: z.string().regex(/^[a-f0-9]{64}$/), sourceUrl: z.literal('https://skillry.dev/skills'),
  }).strict(),
}).strict()
// Resources are directory companions, never installable Skills or review approvals.
const ResourceSchema = RedSkillSchema.extend({
  provider: z.literal('resource'),
  identifier: z.string().regex(/^github:[\w.-]+\/[\w.-]+$/),
  resourceType: z.literal('font-library'),
  sourceCommit: z.string().regex(/^[a-f0-9]{40}$/),
  manifestUrl: httpsUrl,
  articlePath: z.string().regex(/^\/blog\/[a-z0-9-]+$/),
  sourcePreviews: z.array(z.object({
    src: httpsUrl, sourceUrl: httpsUrl, alt: localized,
    width: z.number().int().positive().max(8000), height: z.number().int().positive().max(8000),
  }).strict()).max(8).default([]),
  bundleSha256: z.null(),
  license: z.literal('OFL-1.1'),
  commercialUse: z.literal('permitted-subject-to-font-license'),
  runtimeDemo: z.undefined().optional(),
  examples: z.array(z.object({ title: localized, description: localized }).strict()).length(0),
}).strict()
export const ExternalSkillSchema = z.discriminatedUnion('provider', [RedSkillSchema, SkillrySchema, ResourceSchema])
export type ExternalSkill = z.infer<typeof ExternalSkillSchema>

export function validateExternalCatalog(input: unknown): ExternalSkill[] {
  const entries = z.array(ExternalSkillSchema).parse(input)
  for (const entry of entries) if (entry.provider === 'resource') {
    const repo = entry.identifier.slice('github:'.length)
    for (const preview of entry.sourcePreviews) {
      const prefix = `https://raw.githubusercontent.com/${repo}/${entry.sourceCommit}/images/`
      if (!preview.src.startsWith(prefix) || !/^[\w/-]+\.(png|webp|jpg)$/.test(preview.src.slice(prefix.length)) ||
        preview.sourceUrl !== `https://github.com/${repo}/blob/${entry.sourceCommit}/images/${preview.src.slice(prefix.length)}`) {
        throw new Error('Resource preview must link to the same pinned GitHub source')
      }
    }
  }
  for (const key of ['slug', 'identifier', 'sourceUrl', 'bundleSha256'] as const) {
    const values = entries.map(entry => entry[key]).filter(value => value !== null)
    if (new Set(values).size !== values.length) throw new Error(`Duplicate external ${key}`)
  }
  return entries
}

export const EXTERNAL_SKILLS = validateExternalCatalog([
  {
    slug: 'resource-qiaomu-cover-fonts', provider: 'resource', resourceType: 'font-library',
    identifier: 'github:joeseesun/qiaomu-cover-fonts', skillName: 'Qiaomu Cover Fonts',
    title: { en: 'Qiaomu Cover Fonts', zh: '乔木封面字库 · Qiaomu Cover Fonts' },
    description: {
      en: 'Free Chinese and Latin font assets for covers, image typography and video titles. 34 entries with source and license records. A supporting design resource, not an installable Agent Skill.',
      zh: '用于中文封面、图片排版与视频标题的免费中英文字库，含 34 个字体条目及来源、许可证记录。属于设计资源，不是可直接安装的 Agent Skill。',
    },
    author: { name: 'joeseesun', url: 'https://github.com/joeseesun' },
    sourceUrl: 'https://github.com/joeseesun/qiaomu-cover-fonts',
    sourcePostUrl: 'https://github.com/joeseesun/qiaomu-cover-fonts',
    sourceCommit: '415ea71650d6ba896759a2d7fde05ac5317ca3d1',
    manifestUrl: 'https://github.com/joeseesun/qiaomu-cover-fonts/blob/415ea71650d6ba896759a2d7fde05ac5317ca3d1/index.json',
    articlePath: '/blog/qiaomu-cover-fonts-chinese-images-video-titles',
    sourcePreviews: [
      { path: 'banner.png', height: 540, en: 'Qiaomu Cover Fonts: the author’s font-library cover', zh: '乔木字库：作者提供的字库封面' },
      { path: 'chinese/zh-01.png', height: 300, en: 'Noto Serif SC: Chinese specimen in three weights', zh: '思源宋体：三种字重的中文样张' },
      { path: 'chinese/zh-02.png', height: 300, en: 'Noto Sans SC: Chinese specimen in three weights', zh: '思源黑体：三种字重的中文样张' },
      { path: 'chinese/zh-03.png', height: 300, en: 'Zhuque Fangsong: Chinese type specimen', zh: '朱雀仿宋：中文字体样张' },
      { path: 'chinese/zh-04.png', height: 300, en: 'LXGW WenKai: Chinese type specimen', zh: '霞鹜文楷：中文字体样张' },
    ].map(({ path, height, en, zh }) => ({
      src: `https://raw.githubusercontent.com/joeseesun/qiaomu-cover-fonts/415ea71650d6ba896759a2d7fde05ac5317ca3d1/images/${path}`,
      sourceUrl: `https://github.com/joeseesun/qiaomu-cover-fonts/blob/415ea71650d6ba896759a2d7fde05ac5317ca3d1/images/${path}`,
      width: 1960, height, alt: { en, zh },
    })),
    version: '1.0.0', bundleSha256: null,
    license: 'OFL-1.1', licenseUrl: 'https://openfontlicense.org/open-font-license-official-text/',
    commercialUse: 'permitted-subject-to-font-license',
    licenseNote: {
      en: 'The manifest labels all entries OFL-1.1. Creative outputs and redistribution of font files have different obligations. Keep individual copyright/license notices and observe Reserved Font Names when modifying fonts. No blanket legal clearance is implied.',
      zh: '目录中各条目标注 OFL-1.1。使用字体制作作品与重新分发字体文件的义务不同；分发时保留各字体版权及许可，修改时注意保留字体名。本站不提供一揽子法律担保。',
    },
    usage: {
      en: 'Choose a headline and body font from the manifest, download only the files you need from the source, and retain their licenses. Generate a background first, then compose exact Chinese text in a font-capable tool. For video, render titles or overlays using the same assets.',
      zh: '从目录挑选标题与正文字体，仅从原仓库下载需要的文件并保留许可。先生成底图，再用支持字体的工具叠加准确的中文；视频可使用同一套字体制作标题或文字叠加层。',
    },
    limitations: {
      en: 'The inspected manifest contains 19 Chinese and 15 Latin entries, including separate weights: 33 WOFF2 files and one TTF. Character coverage varies. Desktop editor import support must be checked; no CapCut, Premiere or DaVinci compatibility test was performed. The repository has no SKILL.md.',
      zh: '已核对目录含 19 个中文、15 个西文字体条目（包括不同字重），其中 33 个 WOFF2、1 个 TTF。各字体字形覆盖不同，桌面剪辑软件需确认导入格式；未进行剪映、Premiere 或达芬奇兼容测试。仓库不含 SKILL.md。',
    },
    examples: [], tags: ['fonts', 'typography', 'design', 'Chinese fonts', 'video titles', 'qiaomu', 'joeseesun', '乔木', '字库', '字体', '封面', '中文', '视频剪辑'],
    publishedAt: '2026-10-11T06:00:00.000Z',
    publication: { channel: 'owner-curated-external', reason: 'Owner explicitly requested this font resource in the Skills directory, separately from its published editorial article.' },
    runtimeVerified: false, aiReviewed: false, autoInstallAllowed: false,
  },
  ...SKILLRY_LISTINGS,
  {
    slug: 'redskill-curtain-branch-swallow', provider: 'redskill',
    identifier: 'skill-curtain-branch-swallow', skillName: 'p5-animation',
    title: { en: 'p5.js animations: rain, branches & swallows', zh: 'p5.js 创意动画：雨帘、花枝与飞燕' },
    description: {
      en: 'Describe a rain curtain, growing flowering branches or a flock of swallows. This RedSkill package adapts three p5.js templates into sketch.js code with custom colors, density and speed.',
      zh: '用一句话描述雨帘、开花的树枝或飞过的燕群，基于三套 p5.js 模板输出 sketch.js 代码，可定制颜色、数量与速度。',
    },
    author: { name: '流白Livo', url: 'https://www.xiaohongshu.com/user/profile/687e6455000000001e00b765' },
    sourceUrl: 'https://xhslink.cn/o/2WbYk12a1h4',
    sourcePostUrl: 'https://www.xiaohongshu.com/explore/6a632c13000000000a03a59a',
    version: '1.0.0',
    bundleSha256: '481b20db720959d2268cb3fb9ee4251dad0aa9ea800a46ff242932a586ef6f69',
    license: 'CC-BY-NC-4.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
    commercialUse: 'not-permitted-without-separate-permission',
    licenseNote: {
      en: 'The package README declares CC BY-NC 4.0 and requires attribution and noncommercial use. It also mentions share-alike terms; ask the author to clarify this discrepancy before redistribution. Commercial use requires separate permission.',
      zh: '技能包 README 声明 CC BY-NC 4.0，要求署名并限非商业用途；另有“相同方式共享”的表述，转载分发前请向作者确认。商用需要单独获得授权。',
    },
    limitations: {
      en: 'Requires a compatible coding agent and a p5.js runtime/editor. Some templates load images from an external CDN. Our recording covers only the three default templates in a local browser. RedSkill’s supplied installer uses Bash and Unix-only Python interfaces; native Windows installer compatibility and end-to-end agent compatibility remain untested.',
      zh: '需要兼容的编程 Agent 与 p5.js 运行环境或编辑器；部分模板从外部 CDN 加载图片。本站录像仅覆盖本地浏览器中的三套默认模板。RedSkill 安装器依赖 Bash 和 Unix 专用 Python 接口，原生 Windows 安装器及完整 Agent 流程的兼容性仍未测试。',
    },
    usage: {
      en: 'Open the author’s post and use its RedSkill entry to obtain the package. Review the license and files in your own environment. Describe an animation to your coding agent, then review the generated sketch.js in the p5.js editor. We do not host the package or install it on your behalf.',
      zh: '打开作者原帖，通过帖内 RedSkill 入口获取技能。在自己的环境中查看许可与文件后，向编程 Agent 描述动画需求，再到 p5.js 编辑器检查生成的 sketch.js。本站不托管技能包，也不代你安装。',
    },
    examples: [
      { title: { en: 'Rain curtain', zh: '雨帘' }, description: { en: 'Hanging raindrops respond to pointer movement; adjust density, color and falling speed.', zh: '帘线上的雨滴响应鼠标动作，可调整密度、颜色与下落速度。' } },
      { title: { en: 'Flowering branches', zh: '花枝' }, description: { en: 'Branches grow, divide and bloom with a gentle sway; adjust branch count and flower color.', zh: '树枝自然生长、分叉、开花并轻轻摇摆，可调整枝条数量与花色。' } },
      { title: { en: 'Swallow flock', zh: '飞燕' }, description: { en: 'A flock follows curved flight paths with flapping wings and trailing tails; adjust count, color and timing.', zh: '燕群沿弧线飞过，伴随扑翼和拖尾，可调整数量、颜色与飞行节奏。' } },
    ],
    tags: ['p5.js', 'p5js', 'creative coding', 'web animation', 'design', 'rain', 'branch', 'swallow', '雨帘', '花枝', '飞燕', '创意编程', '网页动画'],
    publishedAt: '2026-09-11T05:28:00.000Z',
    runtimeDemo: {
      video: '/media/external/p5-animation/runtime-v1.mp4',
      poster: '/media/external/p5-animation/poster-v1.webp',
      sha256: 'b58b7d7a40c1d1d9cbbd374b10e27ae80b1ddcc3eb66de42959f8bbff63ccf6f',
      recordedAt: '2026-09-11T07:15:53.653Z', publishedAt: '2026-09-11T10:01:01.000Z',
      durationSeconds: 21, environment: 'Windows 10 · Chrome 152 · p5.js 1.11.11',
      scope: {
        en: 'A real local browser recording of version 1.0.0: rain curtain (0–8s), flowering branches (8–16s), swallows (16–21s). Default template parameters; pointer and flock-start interactions supplied by the test harness. Silent, 720p. This is not a security audit or a certification of other environments or agent workflows.',
        zh: '版本 1.0.0 的本地浏览器实录：雨帘（0–8 秒）、花枝（8–16 秒）、飞燕（16–21 秒）。使用模板默认参数，测试程序触发鼠标交互和燕群起飞。无声，720p。这不是安全审核，也不代表其他环境或 Agent 完整流程已通过认证。',
      },
      displayPermission: 'site-owner-confirmed-noncommercial-display',
    },
    publication: { channel: 'owner-curated-external', reason: 'Site owner requested listing the RedSkill package with the supplied author post and noncommercial license notice.' },
    runtimeVerified: false, aiReviewed: false, autoInstallAllowed: false,
  },
])

export function externalSkillHref(slug: string) { return `/skills/${slug}` }
export function getExternalSkill(slug: string) { return EXTERNAL_SKILLS.find(entry => entry.slug === slug) }
// Reject unknown external pages before streaming starts, preserving a real 404.
export function isMissingExternalSkillPath(pathname: string) {
  const match = pathname.match(/^\/skills\/(?:external\/)?((?:skillry-|redskill-|resource-)[^/]+)\/?$/) || pathname.match(/^\/skills\/external\/([^/]+)\/?$/)
  if (!match) return false
  try { return !getExternalSkill(decodeURIComponent(match[1])) } catch { return true }
}
export function searchExternalSkills(query = '') {
  const terms = query.normalize('NFKC').toLocaleLowerCase().trim().slice(0, 200).split(/\s+/).filter(Boolean)
  return EXTERNAL_SKILLS.filter(entry => {
    if (entry.provider === 'skillry' && !entry.active) return false
    const haystack = [entry.provider, entry.slug, entry.identifier, entry.skillName, entry.author.name, ...Object.values(entry.title), ...Object.values(entry.description), ...entry.tags].join(' ').normalize('NFKC').toLocaleLowerCase()
    return terms.every(term => haystack.includes(term))
  })
}

export function externalSkillDiscoveryRecord(entry: ExternalSkill) {
  return {
    type: entry.provider === 'resource' ? 'design-resource' : 'external-platform-skill', slug: entry.slug, name: entry.title.en,
    description: entry.description.en, provider: entry.provider, identifier: entry.identifier,
    url: `https://www.openagentskill.com${externalSkillHref(entry.slug)}`,
    source_url: entry.sourceUrl, acquisition_url: externalSourceHref(entry.sourceUrl),
    author: entry.provider === 'skillry' ? null : entry.author,
    publisher: entry.provider === 'skillry' ? entry.author : null, version: entry.version,
    ...(entry.provider === 'resource' ? { resource_type: entry.resourceType, source_commit: entry.sourceCommit, manifest_url: entry.manifestUrl, article_url: `https://www.openagentskill.com${entry.articlePath}`,
      examples: entry.sourcePreviews.map(preview => ({ image_url: preview.src, source_url: preview.sourceUrl, attribution: entry.author.name, runtime_verified: false })) } : {}),
    version_source: entry.provider === 'resource' ? 'Versioned GitHub manifest; not automatically synchronized' : entry.provider === 'skillry'
      ? entry.versionObservedAt ? `Skillry public product page observed at ${entry.versionObservedAt}` : 'Version not recorded; check Skillry for the current package version'
      : 'RedSkill bundle manifest observed at publication; not automatically synchronized',
    ...(entry.provider === 'skillry' ? { output_type: entry.outputType, listing_evidence: entry.listingEvidence, active: entry.active,
      source_video_url: entry.previewVideo,
      examples: entry.previewImages.map(src => ({ image_url: src, source_url: entry.sourceUrl, attribution: 'Skillry', runtime_verified: false })) } : {}),
    bundle_sha256: entry.bundleSha256, license: entry.license, license_note: entry.licenseNote.en,
    commercial_use: entry.commercialUse, publication_channel: entry.publication.channel,
    ai_reviewed: false, runtime_verified: false, auto_install_allowed: false,
    human_review_required: true, install_command: null,
    runtime_demo: entry.runtimeDemo ? {
      video_url: `https://www.openagentskill.com${entry.runtimeDemo.video}`,
      poster_url: `https://www.openagentskill.com${entry.runtimeDemo.poster}`,
      sha256: entry.runtimeDemo.sha256, recorded_at: entry.runtimeDemo.recordedAt,
      duration_seconds: entry.runtimeDemo.durationSeconds,
      environment: entry.runtimeDemo.environment, scope: entry.runtimeDemo.scope.en,
      security_certification: false,
    } : null,
  }
}
