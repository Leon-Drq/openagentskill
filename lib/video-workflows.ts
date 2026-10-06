export interface VideoWorkflowSource {
  repository: string
  path: string
  ref: string
  sha256: string
}

export interface VideoWorkflowListing {
  slug: string
  github_repo: string
  source_path?: string | null
  source_commit_sha?: string | null
  source_content_hash?: string | null
  listing_status?: string | null
  ai_review_approved?: boolean | null
}

export const VIDEO_WORKFLOWS = [
  {
    id: 'code-video', label: 'Motion graphics', name: 'xilo-opus-video',
    repository: 'Kianzzz/xilo-opus-video', path: 'skills/xilo-opus-video/SKILL.md',
    creator: 'xilo', tutorial: 'https://x.com/xilo2991/status/2104912748794589515',
    input: 'A topic, product brief or visual idea.',
    output: 'Three concepts with previews, followed by a code-driven video after you choose a direction.',
    setup: 'A coding agent, browser rendering with Playwright, and FFmpeg. Review the proposed style before rendering.',
    limit: 'Best suited to authored motion graphics. It is not a footage-generation model.',
  },
  {
    id: 'whiteboard-video', label: 'Whiteboard explainers', name: 'whiteboard-video',
    repository: 'trustfuture/simon-skills', path: 'skills/whiteboard-video/SKILL.md',
    creator: 'Simon', tutorial: 'https://x.com/HanZhang415188/status/2103030353174630574',
    input: 'A topic or source material you want to explain.',
    output: 'Hand-drawn scenes with narration, captions and cover images.',
    setup: 'Keep the shared video-common folder. Requires Node.js, FFmpeg, Playwright, Codex CLI image generation and Volcengine TTS credentials.',
    limit: 'Downloading SKILL.md alone is insufficient. Voice generation uses an external service with its own terms and fees.',
  },
  {
    id: 'wedding-video', label: 'Wedding stories', name: 'Wedding Video Guided Wizard',
    repository: 'aaronyi97/wedding-video-guided-wizard', path: 'SKILL.md',
    creator: 'Aaron Yi', tutorial: 'https://x.com/AaronYiaazw/status/2098023055239139696',
    input: 'The couple’s story, reference photos and preferred visual style.',
    output: 'A 14-stage production plan covering script, scenes, generated footage and a subtitled wedding film.',
    setup: 'An English or Chinese guided conversation, external image/video generation tools, and manual review checkpoints.',
    limit: 'A guided production workflow: you approve the script and create or select assets along the way.',
  },
  {
    id: 'jianying-editing', label: 'Editable video drafts', name: 'Jianying Editor',
    repository: 'luoluoluo22/jianying-editor-skill', path: 'SKILL.md',
    creator: 'luoluoluo22', tutorial: 'https://x.com/xaiwind/status/2106324762347880468',
    input: 'Your video clips, audio, captions and editing instructions.',
    output: 'An editable draft for the Jianying desktop editor.',
    setup: 'Jianying desktop and the repository’s local editing dependencies. Check the supported app version.',
    limit: 'The README specifies manual export on macOS. This is a Jianying workflow; CapCut compatibility is not established.',
  },
  {
    id: 'seedance-workflows', label: 'Shot plans & video prompts', name: 'Awesome Seedance',
    repository: 'LearnPrompt/awesome-seedance', path: 'agents/skills/seedance-production-workflow/SKILL.md',
    creator: 'LearnPrompt / 卡尔', tutorial: 'https://x.com/aiwarts/status/2102240456092626951',
    input: 'A brief, reference assets and the type of clip you want to make.',
    output: 'Shot plans, generation prompts and a review workflow, with 15 Skill entry points for different styles and tasks.',
    setup: 'Choose a Skill and keep its referenced files. Use a separate video-generation provider to produce footage.',
    limit: 'Case counts are not Skill counts. Repository code, curated text and original media have different licenses; check each source before reuse.',
  },
] as const

export const VIDEO_RELATED_GUIDES = [
  { creator: 'Miles', title: 'A Codex video production workflow', url: 'https://x.com/miles_mazy/status/2097177704282136838', href: '/skills/heygen-com-hyperframes-general-video', linkLabel: 'Explore HyperFrames' },
  { creator: '雪踏乌云', title: 'Creating video with Codex and Hypit', url: 'https://x.com/Pluvio9yte/status/2100070815874285734', href: '/skills/hypit-ai-hypit-hypit', linkLabel: 'Explore Hypit' },
  { creator: '观默', title: 'Motion design references and source code', url: 'https://x.com/guanmo_ai/status/2105146205915283737', href: 'https://github.com/guanmo-ai/awesome-ai-motion', linkLabel: 'Browse the reference library' },
  { creator: '三个三', title: 'Characters, shots and pacing for AI animation', url: 'https://x.com/3three_AI/status/2100477301976891873', href: null, linkLabel: null },
  { creator: '宝玉', title: 'How code becomes a video', url: 'https://x.com/dotey/status/2105181393638531536', href: '/skills/remotion-dev-skills', linkLabel: 'Explore Remotion' },
] as const

export function videoSourceUrl(source: VideoWorkflowSource) {
  return `https://github.com/${source.repository}/blob/${source.ref}/${source.path}`
}

// A source link is always available. An internal detail link requires an actual
// public record for the same pinned source, never a guessed slug or repo-only match.
export function findVideoWorkflowListing(source: VideoWorkflowSource, listings: VideoWorkflowListing[]) {
  return listings.find((listing) =>
    listing.github_repo.toLowerCase() === source.repository.toLowerCase() &&
    listing.source_path === source.path &&
    listing.source_commit_sha === source.ref &&
    listing.source_content_hash === source.sha256 &&
    (listing.ai_review_approved === true || ['owner_published', 'static_checked'].includes(listing.listing_status || ''))
  )
}
