// Client-safe presentation types. The source registry remains on the server.
export type PreviewText = { en: string; zh: string }
export type PreviewKind = 'example' | 'template' | 'style' | 'interface' | 'input' | 'reference'
export interface SkillPreviewMedia {
  src: string
  cardSrc: string
  previewSrc: string
  width: number
  height: number
  sha256?: string
  videoSrc?: string
  originalSrc?: string
  sourceUrl: string
  kind: PreviewKind
  title: PreviewText
  alt: PreviewText
}
export interface SkillSourcePreview {
  skillSlug: string
  repository: string
  revision: string
  sourceUrl: string
  license: string
  licenseUrl: string
  format: PreviewText
  note: PreviewText
  /** Pinned Skill document establishing the relationship to an upstream template. */
  bindingUrl?: string
  media: SkillPreviewMedia[]
}
export type SkillPreviewCardData = Pick<SkillSourcePreview, 'format'> & {
  media: SkillPreviewMedia
  imageCount: number
}
export const previewText = (text: PreviewText, locale: string) => locale === 'zh' ? text.zh : text.en

const labels = {
  example: ['Author example', '作者案例'], template: ['Author template', '作者模板'],
  style: ['Author style reference', '作者风格参考'], interface: ['Tool interface', '工具界面'], input: ['Input image', '输入原图'],
  reference: ['Author documentation', '作者说明配图'],
  view: ['View previews', '查看预览'], empty: ['No visual example yet', '暂未收录效果图'],
  guide: ['Explore the skill', '查看技能说明'], unavailable: ['Preview unavailable', '预览暂不可用'],
  source: ['Original source', '原始来源'], full: ['Open full image', '查看原图'], original: ['Open original file', '打开原始文件'],
  title: ['A closer look', '先看看实际效果'], license: ['Image license', '图片许可'],
  binding: ['Referenced by this skill', '此技能的来源引用'],
  note: ['Images published by the source author. OpenAgentSkill has not independently reproduced these results.', '图片由来源作者发布，OpenAgentSkill 未独立复现这些结果。'],
} as const
export const previewCopy = (key: keyof typeof labels, locale: string) => labels[key][locale === 'zh' ? 1 : 0]
