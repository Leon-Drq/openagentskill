import snapshot from './skillry-snapshot.json'
import editorial from './skillry-editorial.json'

type Editorial = { title: { en: string; zh: string }; description: { en: string; zh: string }; usage: { en: string; zh: string }; version?: string; versionObservedAt?: string }
const notes: Record<string, Editorial> = editorial
const formats: Record<string, { en: string; zh: string }> = {
  image: { en: 'image', zh: '图像' }, presentation: { en: 'presentation', zh: '演示文稿' },
  html: { en: 'web interface', zh: '网页与界面' }, video: { en: 'video', zh: '视频' },
}
function translatedTitle(name: string) {
  if (name.endsWith(' Style OG Image')) return name.replace(' Style OG Image', ' 风格分享卡片')
  return name
}
const activeSlugs = new Set(snapshot.entries.map(item => item.sourceSlug))
export const SKILLRY_LISTINGS = [...snapshot.entries, ...snapshot.archived].map(item => {
  const note = notes[item.sourceSlug]
  const format = formats[item.outputType]
  const tasks = item.tags.filter(tag => tag.kind === 'task').map(tag => tag.label).slice(0, 2)
  const styles = item.tags.filter(tag => tag.kind === 'style').map(tag => tag.label).slice(0, 3)
  const focus = [...tasks, ...styles].join(' · ')
  const sourceUrl = `https://skillry.dev/skills/${item.sourceSlug}`
  return {
    slug: `skillry-${item.sourceSlug.replace(/^bs-/, '')}`,
    provider: 'skillry', identifier: `skill-skillry-${item.sourceSlug}`,
    skillName: item.name, title: note?.title || { en: item.name, zh: translatedTitle(item.name) },
    description: note?.description || {
      en: `${item.name} is a ${format.en} workflow available on Skillry. Its source catalog highlights ${focus || 'visual composition'}. Compare the public examples with your brief before choosing this skill.`,
      zh: `${item.name} 是 Skillry 提供的${format.zh}技能。原站标注的任务与风格包括 ${focus || item.name}。可先查看案例，再根据创作需求选择。`,
    },
    author: { name: 'Skillry', url: 'https://skillry.dev' }, sourceUrl, sourcePostUrl: sourceUrl,
    version: note?.version || null, versionObservedAt: note?.versionObservedAt || null, bundleSha256: null,
    license: 'Skillry-terms', licenseUrl: 'https://skillry.dev/terms',
    commercialUse: 'outputs-permitted-package-redistribution-restricted',
    licenseNote: {
      en: 'Acquire the package on Skillry. Its terms permit personal and internal business use; generated outputs remain subject to third-party rights. Package redistribution requires a separate license.',
      zh: '在 Skillry 获取技能包，按原站条款用于个人或企业内部工作；生成成果还需遵守第三方权利，技能包再分发需要单独许可。',
    },
    limitations: {
      en: 'Setup instructions and access requirements are provided by Skillry. Agent, model and service costs are separate from acquiring the skill.',
      zh: '设置步骤和获取要求以 Skillry 原站为准。Agent、模型及其他服务费用与技能获取费用分开。',
    },
    usage: note?.usage || {
      en: `Prepare a brief for ${item.name}, including the intended audience, content and desired ${format.en} output. Review the source examples and follow the package instructions on Skillry. Check the finished work against your brief.`,
      zh: `为 ${item.name} 准备受众、内容和${format.zh}成果需求。参考原站案例，在 Skillry 获取技能并按包内说明设置，最后核对生成成果与需求是否一致。`,
    },
    examples: [], tags: [...item.tags.map(tag => tag.value), item.priceUsdCents === 0 ? 'free' : 'paid', ...(item.featured ? ['featured'] : [])],
    outputType: item.outputType, previewImages: item.previewImages, previewVideo: item.previewVideo,
    listingEvidence: { featured: item.featured, priceUsdCents: item.priceUsdCents, downloadCount: item.downloadCount,
      observedAt: item.observedAt, sourceDocumentSha256: item.sourceDocumentSha256, sourceUrl: 'https://skillry.dev/skills' },
    publishedAt: item.publishedAt, active: activeSlugs.has(item.sourceSlug), seoIndexable: Boolean(note),
    publication: { channel: 'owner-curated-external', reason: 'Site owner requested Free and paid Skillry Skills with source download counts strictly greater than 10, under owner-confirmed partner permission for descriptions and example display.' },
    runtimeVerified: false, aiReviewed: false, autoInstallAllowed: false,
  }
})
