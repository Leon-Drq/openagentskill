// Registry selections are not Gallery artwork, additional cases or runtime evidence.
// Sources inspected on 2026-09-08; the linked detail page owns current review status.
export const SHOWCASE_VIDEO_SKILLS = [
  {
    slug: 'noamdorr-saas-product-demo-video-saas-product-demo-video',
    name: 'SaaS Product Demo Video',
    purpose: { en: 'Turn product screenshots, brand assets and a soundtrack into a short Remotion product demo.', zh: '将产品截图、品牌素材与配乐制作成简短的 Remotion 产品演示视频。' },
    requirements: { en: 'Node.js, Python and Remotion. Check Remotion licensing; optional AI analysis or voice services may cost extra.', zh: '需要 Node.js、Python 与 Remotion；需核对 Remotion 许可，可选 AI 分析或配音服务可能收费。' },
    source: 'https://github.com/noamdorr/saas-product-demo-video/blob/6ddaee236ea94fc2ff6d6abfddb663fdef4fe72e/saas-product-demo-video/SKILL.md',
  },
  {
    slug: 'heygen-com-hyperframes-product-launch-video',
    name: 'HyperFrames · Product Launch Video',
    purpose: { en: 'Build a product launch, feature reveal or website promo from a URL or brief.', zh: '从产品网址或需求简报制作发布视频、功能介绍与网站宣传片。' },
    requirements: { en: 'Requires the HyperFrames toolchain and companion skills. Hosted media services may charge. Inspect command-execution and environment-access findings before use.', zh: '需要 HyperFrames 工具链及配套技能；托管媒体服务可能收费。使用前请检查命令执行、环境文件访问等告警。' },
    source: 'https://github.com/heygen-com/hyperframes/blob/e5d89f770fbe01d8c243999dac59f3c39a62d66d/skills/product-launch-video/SKILL.md',
  },
  {
    slug: 'heygen-com-hyperframes-general-video',
    name: 'HyperFrames · General Video',
    purpose: { en: 'Create or edit multi-scene compositions, brand reels and footage remixes.', zh: '创建或编辑多场景视频、品牌短片与素材混剪。' },
    requirements: { en: 'Requires HyperFrames and its companion skills. Local media can be reused; hosted generation, voice and media providers have separate terms and fees.', zh: '需要 HyperFrames 及配套技能；可复用本地素材，托管生成、配音与媒体服务各有使用条款和费用。' },
    source: 'https://github.com/heygen-com/hyperframes/blob/e5d89f770fbe01d8c243999dac59f3c39a62d66d/skills/general-video/SKILL.md',
  },
  {
    slug: 'remotion-dev-skills',
    name: 'Remotion Agent Skills',
    purpose: { en: 'Author React-based product videos, animated UI scenes and reusable compositions.', zh: '用 React 编写产品视频、动态 UI 场景与可复用视频组件。' },
    requirements: { en: 'Requires a Node.js / Remotion project. Check Remotion’s separate commercial license and any generation-provider fees.', zh: '需要 Node.js / Remotion 项目；商业使用请核对 Remotion 单独许可及生成服务费用。' },
    source: 'https://github.com/remotion-dev/skills/blob/11986e44eeb672b083354e68967f2b194df73b7c/README.md',
  },
  {
    slug: 'browser-use-video-use',
    name: 'Video Use',
    purpose: { en: 'Edit existing demos and tutorials: trim filler, add captions and refine audio or visuals.', zh: '剪辑已有的产品演示与教程：去除口癖、添加字幕、调整声音和画面。' },
    requirements: { en: 'Local editing dependencies plus an ElevenLabs key for transcription. Hosted transcription can incur fees and sends audio to the provider.', zh: '需要本地剪辑依赖；转录需 ElevenLabs 密钥，可能产生费用，并将音频发送给服务商。' },
    source: 'https://github.com/browser-use/video-use/blob/9575612f066aa517354790a645fd90f9f95a743b/README.md',
  },
] as const
