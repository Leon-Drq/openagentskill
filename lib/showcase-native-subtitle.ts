// @ts-expect-error Direct Node regression tests require the TypeScript extension.
import { showcaseText as tx, type ShowcaseCase } from './showcase-shared.ts'

export const NATIVE_SUBTITLE_REVISION = 'f9485e20f03fc0b9e5dfd77d03d5be24f7cebdcd'
export const NATIVE_SUBTITLE_EXAMPLE: ShowcaseCase = {
  slug: 'native-subtitle-video-to-quote-card',
  skillSlug: 'chengyi-ai-native-subtitle-quote-image', category: 'image',
  title: tx('Video to quote card: preserve burned-in subtitles', '视频变长图：保留画面里的原字幕'),
  description: tx('An original 10-second graphic video becomes a 3:4 quote card. Five timestamped frames preserve the English captions already burned into the input.', '将原创 10 秒图形演示视频做成 3:4 字幕长图，取五个时间点，保留输入画面已有的英文字幕。'),
  input: tx('Our silent 1080 × 1080 graphic clip, with five original English caption lines burned into the video. These are workflow tips, not an interview or a quotation from another person.', '本站原创的无声 1080×1080 图形视频，含五句已烧录的英文流程提示；不是采访，也不是他人引语。'),
  output: tx('One 1080 × 1440 JPG, a timestamp manifest and a contact sheet. The first frame forms the main image; the next four form subtitle strips.', '一张 1080×1440 JPG、时间点清单与总览图；第一帧构成主图，后四帧构成字幕条。'),
  requirements: tx('Python 3.10+, Pillow and FFmpeg or imageio-ffmpeg. Use a local clip you may process and publish. The local renderer needs no model or provider API key; your agent may have its own usage fees.', '需要 Python 3.10+、Pillow，以及 FFmpeg 或 imageio-ffmpeg；使用有权处理和发布的本地视频。本地渲染脚本不需要模型或服务商 API 密钥，Agent 本身可能有用量费用。'),
  prompt: tx('Use native-subtitle-quote-image in native subtitle mode. Use the provided original demo input.mp4 and manifest.json. Keep the burned-in English subtitle pixels; do not retype, translate or rewrite them. Render one 3:4 card at 1080 pixels wide with --band-top 0.80 --band-bottom 0.90. Use frames at 1, 3, 5, 7 and 9 seconds. Open the result and check all five caption lines for clipping and correct order. This is an original graphic demonstration, not an interview quotation.', '使用 native-subtitle-quote-image 的原生字幕模式，处理提供的原创 input.mp4 与 manifest.json。保留视频画面中的英文字幕像素，不重绘、翻译或改写。输出宽 1080 像素的 3:4 长图，使用 --band-top 0.80 --band-bottom 0.90，时间点为 1、3、5、7、9 秒。打开成品检查五句字幕的完整性与顺序；标明这是原创图形演示，不是采访引语。'),
  promptKind: 'suggested', provenance: 'platform', creatorId: 'openagentskill',
  sourceUrl: `https://github.com/chengyi-ai/native-subtitle-quote-image/blob/${NATIVE_SUBTITLE_REVISION}/skills/native-subtitle-quote-image/SKILL.md`,
  sourceRevision: NATIVE_SUBTITLE_REVISION,
  license: 'Original platform demonstration', licenseUrl: '/media/examples/native-subtitle/README.md',
  productionNote: tx('Rendered by OpenAgentSkill on October 6, 2026 (Los Angeles), using the cataloged v2.1.1 CLI at the pinned commit. We created the input clip, ran the unmodified native renderer and opened the full-size output. Five caption lines were readable, in order and not clipped. Python 3.12.14, Pillow 12.3.0 and FFmpeg 7.1 on macOS. This records one local English render, not agent installation, online downloading, translation, script-subtitle mode, general runtime compatibility or security approval. Newer upstream releases may behave differently.', 'OpenAgentSkill 于洛杉矶时间 2026 年 10 月 6 日，使用目录已收录的固定版本 v2.1.1 CLI 渲染。本站制作输入视频，运行未修改的原生渲染脚本，并打开原尺寸成品检查；五句字幕可读、顺序正确、无裁字。环境为 macOS、Python 3.12.14、Pillow 12.3.0 与 FFmpeg 7.1。此记录仅覆盖一次本地英文渲染，不代表 Agent 安装、在线视频下载、翻译、脚本字幕模式、通用运行兼容性或安全认证；上游更新版本的行为可能不同。'),
  media: [{ src: '/media/examples/native-subtitle/output/01_video-to-quote-card.jpg', width: 1080, height: 1440,
    alt: tx('Native subtitle quote card: an original Video to quote card graphic above five English caption lines extracted from frames at 1, 3, 5, 7 and 9 seconds.', '原生字幕长图：上方为本站原创 Video to quote card 图形，下方保留 1、3、5、7、9 秒画面里的五句英文字幕。') }],
  reproduction: {
    resources: [
      { href: '/media/examples/native-subtitle/input.mp4', label: tx('Input video (10s, silent)', '输入视频（10 秒，无声）') },
      { href: '/media/examples/native-subtitle/manifest.json', label: tx('Timestamp JSON', '时间点 JSON') },
      { href: '/media/examples/native-subtitle/run.json', label: tx('Actual run record', '实际运行记录') },
      { href: '/media/examples/native-subtitle/README.md', label: tx('Setup & reproduction guide', '配置与复现说明') },
    ],
    command: 'python3 native-subtitle-quote-image/skills/native-subtitle-quote-image/scripts/native_subtitle_stitch.py render input.mp4 \\\n  --manifest manifest.json --out-dir quote-card-output \\\n  --band-top 0.80 --band-bottom 0.90 --aspect 3:4 --width 1080',
  },
  cardFit: 'contain', updatedAt: '2026-10-06',
}
