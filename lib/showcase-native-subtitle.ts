// @ts-expect-error Direct Node regression tests require the TypeScript extension.
import { showcaseText as tx, type ShowcaseCase } from './showcase-shared.ts'

export const NATIVE_SUBTITLE_REVISION = 'f9485e20f03fc0b9e5dfd77d03d5be24f7cebdcd'
export const NATIVE_SUBTITLE_EXAMPLE: ShowcaseCase = {
  slug: 'native-subtitle-video-to-quote-card',
  skillSlug: 'chengyi-ai-native-subtitle-quote-image', category: 'image',
  title: tx('JFK: “We choose to go to the moon” — speech quote card', '肯尼迪“我们选择登月”：真实演讲金句长图'),
  description: tx('Six lines from John F. Kennedy’s 1962 Rice University speech become a 3:4 quote card with real archival frames. English subtitles are added from the official transcript in script mode.', '从肯尼迪 1962 年莱斯大学演讲中选取六行原话，配合真实档案画面制作 3:4 金句长图；依据官方文字稿，以脚本模式后期绘制英文字幕。'),
  input: tx('NASA’s 28-second Rice University speech excerpt from its Shuttle–Mir history archive, preserved byte-for-byte with source 352 × 240 pixels and audio. The source has no burned-in subtitles. Six English lines were checked against the JFK Library transcript; six representative source frames illustrate the quotation; word-level audio alignment was not verified.', 'NASA Shuttle–Mir 历史档案提供的 28 秒演讲片段，保留源文件字节、352×240 像素与声音。源画面没有烧录字幕；六行英文原话已对照肯尼迪图书馆文字稿，六个代表性画面用于展示这段引语，未核验逐词音频对齐。'),
  output: tx('One 1080 × 1440 JPG: Kennedy speaking at Rice Stadium above five tightly stacked subtitle strips. The text is post-production script subtitles; the archival frames are cropped and enlarged, without recovering new detail.', '一张 1080×1440 JPG：主图为肯尼迪在莱斯体育场演讲，下方紧凑拼接五条字幕。文字为后期脚本字幕；档案画面经过裁切和放大，不代表恢复了新的清晰细节。'),
  requirements: tx('Python 3.10+, Pillow, FFmpeg or imageio-ffmpeg, and a suitable local font. Use footage you may process and publish and check quotations against a reliable transcript. The local renderer needs no model API key; your agent may have its own usage fees.', '需要 Python 3.10+、Pillow、FFmpeg 或 imageio-ffmpeg，以及合适的本地字体。使用有权处理和发布的影像，依据可靠文字稿核对引语。本地渲染不需要模型 API 密钥，Agent 本身可能有用量费用。'),
  prompt: tx('Use native-subtitle-quote-image in script-subtitle mode with jfk-rice-input.mpg and script.json. Use the six checked English lines from John F. Kennedy’s September 12, 1962 Rice University speech, without inventing, translating or rewriting the quotation. Draw these post-production subtitles onto the real timestamped video frames and render a 3:4 card at 1080 pixels wide. Open the output to check the face, line order, readability and clipping. Credit NASA for footage, the JFK Library for the transcript and Chengyi for the Skill; label the text as added script subtitles.', '使用 native-subtitle-quote-image 的脚本字幕模式处理 jfk-rice-input.mpg 和 script.json。使用肯尼迪 1962 年 9 月 12 日莱斯大学演讲的六行已核对英文原话，不编造、翻译或改写引语。在真实时间点的视频画面上绘制后期字幕，生成宽 1080 像素的 3:4 长图。打开成品检查人物、句子顺序、可读性与裁字情况；注明 NASA 影像来源、肯尼迪图书馆文字稿和程意 Skill 作者，并标明字幕为后期脚本字幕。'),
  promptKind: 'suggested', provenance: 'platform', creatorId: 'openagentskill',
  sourceUrl: 'https://github.com/chengyi-ai/native-subtitle-quote-image/blob/' + NATIVE_SUBTITLE_REVISION + '/skills/native-subtitle-quote-image/SKILL.md',
  sourceRevision: NATIVE_SUBTITLE_REVISION,
  license: 'NASA archival footage; OpenAgentSkill worked example', licenseUrl: '/media/examples/native-subtitle/README.md',
  productionNote: tx('Prepared by OpenAgentSkill on October 6, 2026 (Los Angeles) using the cataloged v2.1.1 CLI at the pinned commit. Footage: NASA’s Shuttle–Mir history archive; the JFK Library identifies its NASA film of this speech as Public Domain; quotation: JFK Library official transcript. Our contribution is excerpt selection, checked script, frame selection and actual Skill render. Subtitles are added in script mode. We opened the full-size output to check all six lines and the speaker’s frame. This records one local English script render; other modes, installation and general compatibility were not tested. No endorsement by the speaker or NASA is implied.', '本站于洛杉矶时间 2026 年 10 月 6 日，使用目录已收录的固定版本 v2.1.1 CLI 制作。影像来自 NASA Shuttle–Mir 历史档案；肯尼迪图书馆将其 NASA 演讲影片标为公有领域；引语对照肯尼迪图书馆官方文字稿。本站负责片段选取、台词核对、选帧和实际 Skill 渲染。字幕由脚本模式后期绘制。已打开原尺寸成品检查六行字幕与人物画面。本次记录覆盖一次本地英文脚本渲染，未测试其他模式、安装与通用兼容性，也不表示演讲者或 NASA 的背书。'),
  media: [{ src: '/media/examples/native-subtitle/output/jfk-we-choose-the-moon.jpg', width: 1080, height: 1440,
    alt: tx('John F. Kennedy speaking at Rice University in 1962, with six added English script-subtitle lines including “We choose to go to the moon” and “not because they are easy, but because they are hard”.', '肯尼迪 1962 年在莱斯大学演讲的真实画面，下方为后期绘制的六行英文字幕，包含“我们选择登月”“不是因为容易，而是因为困难”的原话。') }],
  reproduction: {
    resources: [
      { href: '/media/examples/native-subtitle/jfk-rice-input.mpg', label: tx('NASA speech excerpt (28s, with audio)', 'NASA 演讲片段（28 秒，有声）') },
      { href: '/media/examples/native-subtitle/script.json', label: tx('Checked English lines & timestamps', '已核对的英文台词与时间点') },
      { href: '/media/examples/native-subtitle/source.json', label: tx('Footage, transcript & frame selection', '影像、文字稿与选帧说明') },
      { href: '/media/examples/native-subtitle/run.json', label: tx('Actual run record', '实际运行记录') },
      { href: '/media/examples/native-subtitle/README.md', label: tx('Credits & reproduction guide', '署名与复现说明') },
    ],
    command: 'python3 native-subtitle-quote-image/skills/native-subtitle-quote-image/scripts/native_subtitle_stitch.py render-script jfk-rice-input.mpg \\\n  --script script.json --out jfk-quote-card.jpg --aspect 3:4 --width 1080 \\\n  --font /path/to/Arial.ttf',
  },
  cardFit: 'contain', updatedAt: '2026-10-06',
}
