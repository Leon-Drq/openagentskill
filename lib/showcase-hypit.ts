// Author-hosted examples: neither a fresh execution nor reusable stock footage.
// @ts-expect-error Direct Node regression tests require the TypeScript extension.
import { showcaseText as tx, type ShowcaseCase } from './showcase-shared.ts'

export const HYPIT_REVISION = '9c9918d0cedf2f06574ab0d517b1b6b0afb56a66'
const source = `https://github.com/hypit-ai/hypit/blob/${HYPIT_REVISION}`
const base = {
  skillSlug: 'hypit-ai-hypit-hypit', category: 'video' as const,
  creatorId: 'hypit-ai', provenance: 'author' as const, evidenceKind: 'work' as const,
  promptKind: 'suggested' as const, sourceRevision: HYPIT_REVISION,
  license: 'Author-hosted media · reuse permission not established',
  licenseUrl: '/showcase/hypit-NOTICES.txt', updatedAt: '2026-09-21',
  requirements: tx(
    'Hypit Skill, a compatible coding agent and the Hypit runtime. New generated footage or voices may require paid third-party services and credentials. Confirm a budget before running. The software has additional commercial license conditions; example footage has separate rights.',
    '需要 Hypit Skill、兼容的编程 Agent 和 Hypit 运行环境。生成新画面或声音可能需要付费第三方服务及凭据，请先确认预算。软件许可证含额外商业限制，示例视频素材权利另行核对。',
  ),
}

export const HYPIT_SHOWCASE_CASES: ShowcaseCase[] = [
  {
    ...base, slug: 'hypit-football-ranking',
    title: tx('A football debate, built for the feed', '把足球话题做成榜单短视频'),
    description: tx('An author-produced vertical short pairs a presenter with a persistent tier board, timed reveals and captions.', '作者制作的竖屏短片，将讲解人、分层榜单、动态揭晓和字幕放进同一画面。'),
    input: tx('A ranking topic, your own criteria, an approved script and licensed visual assets.', '榜单主题、自定评价标准、确认后的脚本与有权使用的视觉素材。'),
    output: tx('A 720 × 1280 author-hosted MP4, approximately 20 seconds. Rankings are entertainment, not an objective player assessment.', '作者托管的 720 × 1280 MP4，约 20 秒。榜单属于娱乐表达，并非客观球员评测。'),
    sourceUrl: `${source}/README.md#examples`,
    videoUrl: 'https://github.com/user-attachments/assets/f573bdac-62da-4b5d-825d-54d5880a7026',
    productionNote: tx(
      'Published by Hypit AI in its repository README. Preview frame extracted at 2 seconds; video remains on the author’s GitHub attachment. We inspected the media, not a new Hypit run. The author reports $1.15 for the original production; this is unverified historical spending, not a quote for your task. Faces, sports imagery, voices and music may have third-party rights. No endorsement or permission to reuse the footage is implied.',
      '由 Hypit AI 发布于仓库 README。封面取自第 2 秒，视频仍由作者的 GitHub 附件提供。本站检查素材，未重新运行 Hypit。作者报告原案例花费 1.15 美元；这是未经本站核实的历史费用，并非当前任务报价。人物、体育图像、声音和音乐可能涉及第三方权利，不代表背书或素材再利用授权。',
    ),
    prompt: tx(
      'Use Hypit to plan an original 20-second vertical ranking video about [my topic] for [audience]. Ask for my criteria and assets. Propose the script, persistent tier board, reveal beats and readable captions. Use only licensed assets and consenting or fictional presenters; do not copy the example’s faces, voices, music or claims. Explain dependencies, license restrictions and estimated service costs, then wait for approval before installation or paid generation. Deliver MP4 and editable production files; verify audio, captions and framing.',
      '使用 Hypit，为 [受众] 策划一条关于 [我的主题] 的原创 20 秒竖屏榜单视频。先索取评价标准与素材，提出脚本、固定榜单、揭晓节奏和清晰字幕。仅使用获授权素材与获同意或虚构的讲解人，不复制示例的人脸、声音、音乐或表述。说明依赖、许可限制与服务费用预估，确认后才安装或付费生成。交付 MP4 和可编辑制作文件，检查音频、字幕及构图。',
    ),
    media: [{ src: '/showcase/hypit-football-ranking.jpg', width: 720, height: 1280, alt: tx('Actual frame from Hypit’s football ranking short, with a presenter, captions and tier board.', 'Hypit 足球榜单短片真实画面，包含讲解人、字幕与分层榜单。') }],
  },
  {
    ...base, slug: 'hypit-product-explainer',
    title: tx('A product story in motion', '让产品解说与画面一起推进'),
    description: tx('A Chinese-language explainer combines an AI presenter, website demonstrations and coordinated motion graphics.', '中文产品解说片结合 AI 讲解人、网页演示与配合叙事的动态图形。'),
    input: tx('Your product brief, verified claims, approved narration and authorized screen recordings.', '产品简报、已核实的表述、确认后的旁白与获准使用的录屏。'),
    output: tx('A 1080 × 1920 author-hosted MP4, approximately 137 seconds, with an editable production documented upstream.', '作者托管的 1080 × 1920 MP4，约 137 秒；上游提供可编辑制作项目说明。'),
    sourceUrl: `${source}/examples/complex-explainer/README.md`,
    videoUrl: 'https://storage.googleapis.com/hypit-public-assets/assets/examples/complex-explainer/v1/20260914/final.mp4',
    productionNote: tx(
      'Author example linked from the pinned project README; preview frame extracted at 28 seconds. The upstream notes describe 17 accepted performances and project-owned animated scenes. The default render reuses supplied media rather than generating all material again. We did not reproduce the workflow or verify costs. Product comparisons, token counters and marketing statements belong to the author and are not our benchmarks. The external video can change independently of the pinned source; reuse rights are not established.',
      '固定版本项目 README 中链接的作者案例，封面取自第 28 秒。上游说明包含 17 段已选表演素材与项目内动画场景；默认渲染复用已有素材，不会全部重新生成。本站未复现工作流或核实费用。产品比较、Token 数字和营销表述属于作者内容，不是本站评测。外部视频可能独立于固定源码版本变化，尚未确认素材再利用授权。',
    ),
    prompt: tx(
      'Use Hypit to plan a 60–90 second original vertical explainer for [my product]. Request my verified product facts and authorized recordings. Propose narration, a presenter layout, screen demonstrations and word-linked motion graphics. Clearly distinguish illustrative diagrams from measured results. Use a consenting or fictional presenter and licensed music. Confirm the script, available runtime, license conditions and generation budget before execution. Deliver MP4 and editable production files, and check captions, source claims and mobile readability.',
      '使用 Hypit，为 [我的产品] 策划 60–90 秒原创竖屏解说片。先索取已核实的产品事实和获授权录屏，提出旁白、讲解人布局、屏幕演示与词语联动动态图形。明确区分示意图与实测结果，使用获同意或虚构的讲解人及获授权音乐。执行前确认脚本、运行环境、许可条件和生成预算。交付 MP4 与可编辑制作文件，检查字幕、事实来源和手机可读性。',
    ),
    media: [{ src: '/showcase/hypit-product-explainer.jpg', width: 1080, height: 1920, alt: tx('Actual frame from Hypit’s product explainer showing a presenter above a website demonstration.', 'Hypit 产品解说片真实画面，上方讲解人配合下方网页演示。') }],
  },
]
