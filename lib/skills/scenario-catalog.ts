// Official ZIP inspected as data only. No Skill code or media is mirrored here.
export const SCENARIO_AUTO_EDIT = {
  slug: 'scenario-auto-edit', provider: 'scenario', identifier: 'scenario-auto-edit',
  skillName: 'Scenario Auto Edit',
  title: { en: 'Scenario Auto Edit', zh: 'Scenario Auto Edit · AI 口播剪辑' },
  description: {
    en: 'Turn a talking-head clip into an edited video with tighter cuts, word captions, type behind the speaker, music and a rebuilt background. A Claude Code Skill combining local Apple Vision with Scenario MCP.',
    zh: '把一段口播素材剪成完整视频：删停顿、逐词字幕、人物背后大字、配乐与背景重建。通过 Claude Code 编排本地 Apple Vision 和 Scenario MCP。',
  },
  author: { name: 'Scenario', url: 'https://www.scenario.com' },
  sourceUrl: 'https://www.scenario.com/explorations/auto-edit/',
  sourcePostUrl: 'https://www.scenario.com/explorations/auto-edit/',
  downloadUrl: 'https://www.scenario.com/explorations/auto-edit/downloads/scenario-auto-edit-skill.zip',
  version: null, versionObservedAt: '2026-10-14T15:07:55.000Z',
  bundleSha256: 'ab415d3ebeeb9e41889f9b130f8536c13e8ec5f5644567bf9747d742c1c6a0be',
  license: 'MIT-declared', licenseUrl: 'https://www.scenario.com/explorations/auto-edit/',
  commercialUse: 'check-package-and-service-terms',
  licenseNote: {
    en: 'SKILL.md declares MIT. The inspected ZIP has no separate LICENSE file or release version. This declaration does not license the official demo, input footage, fonts or Scenario services; check their own terms before commercial use or redistribution.',
    zh: 'SKILL.md 声明 MIT；核查的 ZIP 没有独立 LICENSE 文件或版本号。此声明不涵盖官方样片、输入素材、字体及 Scenario 服务，商用或分发时需分别确认其条款。',
  },
  usage: {
    en: 'On an Apple Silicon Mac, connect Scenario MCP to Claude Code and download the official ZIP. Inspect the files, then place the scenario-auto-edit folder in ~/.claude/skills/. Prepare Python 3.10+, ffmpeg, Xcode command line tools and the documented Python packages. Use a fresh project folder and run /scenario-auto-edit raw.mov with your own clip. Review the proposed cut and cloud cost estimate before generation.',
    zh: '在 Apple Silicon Mac 上为 Claude Code 连接 Scenario MCP，下载并检查官方 ZIP，将 scenario-auto-edit 文件夹放入 ~/.claude/skills/。准备 Python 3.10+、ffmpeg、Xcode 命令行工具及文档要求的 Python 依赖。在新的项目目录中，对自己的素材使用 /scenario-auto-edit raw.mov；生成前确认剪辑方案及云端费用估算。',
  },
  limitations: {
    en: 'Designed for one on-camera speaker. Apple Vision cutouts require macOS; the complete workflow is not supported on native Windows. Upstream reports complete edits tested only in English. Other languages need suitable fonts and caption checks. Cloud background editing uploads video to Scenario. Generated sound, music and video use paid services; local preprocessing also downloads transcription models and fonts. Reruns can replace generated project files. OpenAgentSkill has inspected the package and official demo, but has not run the editing pipeline.',
    zh: '主要面向单人口播。Apple Vision 抠像依赖 macOS，原生 Windows 无法直接跑完整流程。上游仅报告完整英文剪辑测试；中文等语言需准备合适字体并检查字幕。云端背景编辑会把视频上传至 Scenario，音效、音乐和视频生成涉及付费服务；本地预处理也会下载转写模型和字体。重新运行可能覆盖项目中的生成文件。本站已检查技能包及官方样片，尚未运行完整剪辑流程。',
  },
  examples: [],
  sourceDemo: {
    video: 'https://www.scenario.com/explorations/auto-edit/media/ai-edit.mp4',
    poster: 'https://www.scenario.com/explorations/auto-edit/media/ai-edit-poster.webp',
    rawVideo: 'https://www.scenario.com/explorations/auto-edit/media/raw.mp4',
    rawPoster: 'https://www.scenario.com/explorations/auto-edit/media/raw-poster.webp',
    cover: 'https://www.scenario.com/exploration-covers/auto-edit.webp',
    attribution: 'Scenario',
  },
  tags: ['video editing', 'talking head', 'auto edit', 'Claude Code', 'Scenario MCP', 'Apple Vision', 'captions', 'music', '口播', '自动剪辑', '字幕', '视频', '人物抠像'],
  publishedAt: '2026-10-14T15:07:55.000Z',
  publication: { channel: 'owner-curated-external', reason: 'Site owner requested listing the official Scenario Auto Edit Skill from its product page. The official ZIP contains SKILL.md; the linked GitHub main tree has no matching auto-edit directory at inspection.' },
  runtimeVerified: false, aiReviewed: false, autoInstallAllowed: false,
}
