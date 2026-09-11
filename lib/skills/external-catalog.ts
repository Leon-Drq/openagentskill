import { z } from 'zod'

// Editorial metadata only. Never mirror bundles or turn these records into
// GitHub SkillRecords: external discovery is not installation authorization.
const httpsUrl = z.string().url().refine(value => {
  const url = new URL(value)
  return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
}, 'Use a stable HTTPS URL without credentials or signed query parameters.')
const localized = z.object({ en: z.string().min(1), zh: z.string().min(1) }).strict()
export const ExternalSkillSchema = z.object({
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
  publication: z.object({ channel: z.literal('owner-curated-external'), reason: z.string().min(10) }).strict(),
  runtimeVerified: z.literal(false),
  aiReviewed: z.literal(false),
  autoInstallAllowed: z.literal(false),
}).strict()
export type ExternalSkill = z.infer<typeof ExternalSkillSchema>

export function validateExternalCatalog(input: unknown): ExternalSkill[] {
  const entries = z.array(ExternalSkillSchema).parse(input)
  for (const key of ['slug', 'identifier', 'bundleSha256'] as const) {
    if (new Set(entries.map(entry => entry[key])).size !== entries.length) throw new Error(`Duplicate external ${key}`)
  }
  return entries
}

export const EXTERNAL_SKILLS = validateExternalCatalog([
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
      en: 'Requires a compatible coding agent and a p5.js runtime/editor. Some templates load images from an external CDN. RedSkill’s supplied installer uses Bash and Unix-only Python interfaces; native Windows compatibility is not established. OpenAgentSkill has not run these animations or certified agent compatibility.',
      zh: '需要兼容的编程 Agent 与 p5.js 运行环境或编辑器；部分模板从外部 CDN 加载图片。RedSkill 提供的安装器依赖 Bash 和 Unix 专用 Python 接口，尚未确认原生 Windows 兼容性。OpenAgentSkill 未运行这些动画，也未认证 Agent 兼容性。',
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
    publication: { channel: 'owner-curated-external', reason: 'Site owner requested listing the RedSkill package with the supplied author post and noncommercial license notice.' },
    runtimeVerified: false, aiReviewed: false, autoInstallAllowed: false,
  },
])

export function externalSkillHref(slug: string) { return `/skills/external/${slug}` }
export function getExternalSkill(slug: string) { return EXTERNAL_SKILLS.find(entry => entry.slug === slug) }
// Reject unknown external pages before streaming starts, preserving a real 404.
export function isMissingExternalSkillPath(pathname: string) {
  const match = pathname.match(/^\/skills\/external\/([^/]+)\/?$/)
  if (!match) return false
  try { return !getExternalSkill(decodeURIComponent(match[1])) } catch { return true }
}
export function searchExternalSkills(query = '') {
  const terms = query.normalize('NFKC').toLocaleLowerCase().trim().slice(0, 200).split(/\s+/).filter(Boolean)
  return EXTERNAL_SKILLS.filter(entry => {
    const haystack = [entry.slug, entry.identifier, entry.skillName, entry.author.name, ...Object.values(entry.title), ...Object.values(entry.description), ...entry.tags].join(' ').normalize('NFKC').toLocaleLowerCase()
    return terms.every(term => haystack.includes(term))
  })
}

export function externalSkillDiscoveryRecord(entry: ExternalSkill) {
  return {
    type: 'external-platform-skill', slug: entry.slug, name: entry.title.en,
    description: entry.description.en, provider: entry.provider, identifier: entry.identifier,
    url: `https://www.openagentskill.com${externalSkillHref(entry.slug)}`,
    source_url: entry.sourceUrl, author: entry.author, version: entry.version,
    version_source: 'RedSkill bundle manifest observed at publication; not automatically synchronized',
    bundle_sha256: entry.bundleSha256, license: entry.license, license_note: entry.licenseNote.en,
    commercial_use: entry.commercialUse, publication_channel: entry.publication.channel,
    ai_reviewed: false, runtime_verified: false, auto_install_allowed: false,
    human_review_required: true, install_command: null,
  }
}
