import type { MotionLocale } from './shared'
const en = {
  paid: 'Paid', preview: 'Original preview', play: 'Play original', pause: 'Pause',
  sample: 'Original creator video', reducedMotion: 'Reduced motion is enabled. Use the player to start the video manually.',
  loadError: 'The original video could not load.',
  sampleNote: 'This is the original creator’s video, served from the same media address as Prompt Motion. It has not been redesigned or regenerated.',
  source: 'Original creator & source',
  sourceLead: 'The video and source prompt belong to the credited creator. This preview is the reference for the paid Skill; it is not presented as a verified Skill-generated result.',
  reference: 'View original case', repository: 'Original Skill repository',
  includes: 'Skill production requirements',
  deliverables: ['Follow the exact original case and its published prompt or Skill.', 'Preserve its composition, typography, colours, transitions and timing.', 'Compare the rendered result with the original before accepting delivery.'],
  access: 'Paid Skill', accessBody: 'Listed in the paid collection. Delivery must match the original reference. Reproduction and verification are not completed; checkout and package delivery are not yet open.',
  accessDisabled: 'Paid delivery not yet available',
  reproduction: 'Delivery in preparation',
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
  includes: 'Skill 制作要求',
  deliverables: ['严格对照这一条原始案例及其公开提示词或 Skill。', '保留原片构图、字体、配色、转场与时间节奏。', '生成结果须与原片对照核验后，才能作为交付。'],
  access: '付费 Skill', accessBody: '已归入付费目录，以原片效果作为交付标准。复现与核验尚未完成，购买与完整包交付暂未开放。',
  accessDisabled: '付费交付暂未开放',
  reproduction: '交付待完成',
}
export const motionCopy = (locale: MotionLocale): MotionCopy => locale === 'zh' ? zh : en
