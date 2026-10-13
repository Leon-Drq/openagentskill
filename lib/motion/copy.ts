import type { MotionLocale } from './shared'
const en = {
  paid: 'Paid', preview: 'Original preview', play: 'Play original', pause: 'Pause',
  sample: 'Original creator video', reducedMotion: 'Reduced motion is enabled. Use the player to start the video manually.',
  loadError: 'The original video could not load.',
  sampleNote: 'This is the original creator’s video, served from the same media address as Prompt Motion. It has not been redesigned or regenerated.',
  source: 'Original creator & source',
  sourceLead: 'The video and source prompt belong to the credited creator. This preview is the reference for the paid Skill; it is not presented as a verified Skill-generated result.',
  reference: 'View original case', repository: 'Original Skill repository',
  includes: 'Text delivery',
  deliverables: ['Read the complete original prompt or Skill instructions.', 'Copy the text into your AI tool.', 'Download a text copy from My purchases.'],
  access: 'Paid Skill', accessBody: 'Purchase this item or join Pro to unlock its original text instructions. The creator’s original video remains available as a preview.',
  accessDisabled: 'Sign in and purchase to unlock',
  reproduction: 'Unlock & copy instructions',
}
export type MotionCopy = typeof en
const zh: MotionCopy = {
  paid: '付费', preview: '原作预览', play: '播放原动效', pause: '暂停',
  sample: '原作者视频', reducedMotion: '已遵循减少动态效果设置，可使用播放器手动播放。',
  loadError: '原视频暂时无法加载。',
  sampleNote: '这里播放的是原作者的视频，与 Prompt Motion 使用同一个媒体地址，未重新设计或替换效果。',
  source: '原作者与来源',
  sourceLead: '视频和原始提示词属于署名作者。此处展示付费 Skill 的制作参考，不将原片标为已验证的 Skill 生成结果。',
  reference: '查看原始案例', repository: '原作者的 Skill 仓库',
  includes: '文字交付',
  deliverables: ['阅读完整原始提示词或 Skill 指令。', '一键复制到你的 AI 工具。', '在「我的购买」中下载文本副本。'],
  access: '付费 Skill', accessBody: '单独购买或开通 Pro，解锁本项原始文字指令。原作者视频继续作为预览展示。',
  accessDisabled: '登录并购买后解锁',
  reproduction: '付费解锁 · 一键复制',
}
export const motionCopy = (locale: MotionLocale): MotionCopy => locale === 'zh' ? zh : en
