import type { MotionLocale } from './shared'

const en = {
  skills: 'Skills', details: 'View details', original: 'Original by',
  lead: 'Watch the original animation, then unlock the instructions behind it. Read and copy the full text directly on this page after payment.',
  preview: 'Preview', about: 'About this Skill', included: 'What you get', use: 'How to use',
  aboutBody: 'Unlock the original prompt or Skill instructions associated with “{title}”. Copy the text into your AI tool and adapt it to your own content.',
  tags: 'Visual elements', previewNote: 'Original creator video. This purchase delivers text instructions; generated results depend on your model, inputs and tools.',
  packageNote: 'The complete original prompt, preserved as published. Payment unlocks on-page reading, copying and a text download.',
  skillNote: 'This source provides a Skill instead of a standalone prompt. You receive its original SKILL.md instructions. Use the linked repository for referenced scripts, dependencies and the original license.',
  deliverables: [
    ['Complete instructions', 'The original prompt, or the original SKILL.md for a Skill-based case.'],
    ['One-click copy', 'Read the unlocked text on this page and copy it into your AI tool.'],
    ['Text download', 'Keep a plain-text copy through My purchases.'],
    ['Original context', 'Creator attribution, source links and the unchanged original video preview.'],
  ],
  workflowTitle: 'From preview to your own creation',
  steps: ['Watch the preview and check the delivery type.', 'Purchase this item or subscribe to Pro, then copy the unlocked instructions.', 'Paste into your AI tool, add your own brief and assets, and refine the result.'],
  requirements: 'Tools & running costs',
  requirementsBody: 'Bring your own compatible AI tool. Some instructions refer to additional assets, scripts or dependencies in the original source. AI usage and external service fees are separate.',
  source: 'Creator & source', sourceBody: 'The instructions and preview retain their original creator attribution. Original source links remain available below.',
  sourceLink: 'View original case', post: 'Creator’s post', repository: 'Source repository',
  purchase: 'Unlock this Skill', single: 'One-time purchase', membership: 'Pro membership',
  singleBenefit: 'Full text access to this item, copying, text download and 12 months of published updates.',
  memberBenefit: 'Access all 233 motion prompts and Skill instructions, plus other released paid Skills, while your membership is active.',
  related: 'More motion Skills', all: 'View the collection', back: 'Back to motion Skills',
}
export type MotionDetailCopy = typeof en
const zh: MotionDetailCopy = {
  skills: '技能', details: '查看详情', original: '原作作者',
  lead: '先看原始动效，再获取背后的创作指令。付款确认后，即可在本页查看完整正文并一键复制。',
  preview: '效果预览', about: '关于这个 Skill', included: '购买后获得', use: '如何使用',
  aboutBody: '解锁「{title}」对应的原始提示词或 Skill 指令。复制到你的 AI 工具中，结合自己的文案与素材进行创作。',
  tags: '视觉元素', previewNote: '这里播放原作者视频。购买交付的是文字指令，生成效果取决于所用模型、输入素材与工具。',
  packageNote: '提供来源页面的完整原始提示词，保留原文。付款确认后，可在本页阅读、复制，也可下载 TXT 文本。',
  skillNote: '这个案例的原作者提供的是 Skill，没有单独的提示词。交付内容为原始 SKILL.md 指令；相关脚本、依赖和许可可通过下方原始仓库获取。',
  deliverables: [
    ['完整原始指令', '提示词案例提供原文；Skill 案例提供原始 SKILL.md 指令。'],
    ['一键复制', '在详情页读取已解锁正文，直接复制到你的 AI 工具。'],
    ['文本下载', '在「我的购买」中下载 TXT，方便保存与再次使用。'],
    ['原作与来源', '保留原作者署名、来源链接和未经替换的原始动效预览。'],
  ],
  workflowTitle: '从预览，到自己的创作',
  steps: ['观看原作预览，确认本项交付的是提示词还是 Skill 指令。', '单独购买或开通 Pro 会员，付款确认后复制完整正文。', '粘贴到 AI 工具中，补充自己的文案与素材，再根据结果调整。'],
  requirements: '工具与使用费用',
  requirementsBody: '需自备兼容的 AI 工具。部分指令会引用原始来源中的素材、脚本或依赖。模型使用和外部服务费用另计。',
  source: '作者与原始来源', sourceBody: '提示词、Skill 指令和视频保留原作者署名，以下链接可查看原始案例与创作背景。',
  sourceLink: '查看原始案例', post: '作者发布页', repository: '原始仓库',
  purchase: '解锁这个 Skill', single: '单独购买', membership: 'Pro 会员',
  singleBenefit: '解锁本项完整正文，支持复制、文本下载及 12 个月内发布的更新。',
  memberBenefit: '会员有效期内，可访问全部 233 项动效提示词与 Skill 指令，以及其他已发布的付费 Skill。',
  related: '更多动效 Skill', all: '查看全部', back: '返回动效分类',
}
export const motionDetailCopy = (locale: MotionLocale): MotionDetailCopy => locale === 'zh' ? zh : en
