// Source-based editorial guidance. This module never changes publication,
// index eligibility, installation permission or runtime evidence.
// @ts-expect-error Direct Node regression tests require TypeScript extensions.
import { PRESENTATION_SOURCES } from './presentation-pages.ts'
// @ts-expect-error Direct Node regression tests require TypeScript extensions.
import { SCENARIO_SOURCES } from './scenario-pages.ts'

export interface SkillGrowthProfile {
  slug: string; repository: string; path: string; commit: string
  title: string; description: string; summary: string; setup: string; limitation: string
  relatedHref: string; relatedLabel: string
}

export const SKILL_GROWTH_PROFILES: readonly SkillGrowthProfile[] = [
  {
    slug: 'tt-a1i-archify', repository: 'tt-a1i/archify', path: 'archify/SKILL.md', commit: '0b636d9f2f410ce7c617dbfd8818b775d42e9d4d',
    title: 'Archify Skill: Architecture Diagrams, Mermaid and HTML Export',
    description: 'Explore Archify for architecture, workflow and sequence diagrams. Understand Mermaid input, HTML and image output, setup requirements and source limitations.',
    summary: 'Archify turns a system description or supported Mermaid input into an interactive HTML diagram. The linked source covers architecture, workflow, sequence, data-flow and lifecycle diagrams, with image and SVG export.',
    setup: 'Start with the diagram type, real components and relationships, and the format you need to share. Keep the complete source package and its Node.js CLI available; ask your agent to inspect the matching schema and validate the diagram before delivery.',
    limitation: 'A diagram is only as accurate as its input. For an existing codebase, check the diagram against repository evidence. Review labels and layout in the exported file. The source revision below is documentation, not an OpenAgentSkill runtime test; the current source status still applies.',
    relatedHref: '/rankings/best-design-creative-skills', relatedLabel: 'Compare design and visual creation skills',
  },
  {
    slug: 'everettfish-holo-card-studio', repository: 'EverettFish/holo-card-studio', path: 'SKILL.md', commit: 'b470957e0dea681eadc05e467a57bdc84b702333',
    title: 'Holo Card Studio Skill: Interactive 3D Cards with Blender',
    description: 'Explore Holo Card Studio for holographic cards, editable Blender scenes and Three.js websites. Check image layers, local requirements and mobile interaction.',
    summary: 'Holo Card Studio turns a description or reference image into a layered holographic card, an editable Blender scene and an interactive Three.js website. Choose it when the deliverable needs depth, foil effects and interaction.',
    setup: 'Prepare the subject, visual style and reference you can use. The documented pipeline needs Python with Pillow, Node.js and npm; it locates Blender or installs a portable copy inside the output project. Image generation depends on the available tool or separately approved service.',
    limitation: 'Check that image layers are transparent and aligned, then test rendering, dragging, flipping and the mobile layout in a browser. A saved Blender scene alone does not verify the website. Author examples and source documentation are not an independent runtime certification.',
    relatedHref: '/showcase?category=web', relatedLabel: 'Explore website and visual examples',
  },
  {
    slug: 'vox-director', repository: 'Alisa0808/vox-director', path: 'SKILL.md', commit: '6a85a7c341610442a6a5b1885e6e0217ab82a11f',
    title: 'Vox Director Skill: Narrated Paper-Collage Explainer Videos',
    description: 'Explore Vox Director for paper-collage explainers and ads. See author examples and check Atlas Cloud, FFmpeg, narration, captions and generation costs.',
    summary: 'Vox Director documents an end-to-end paper-collage video workflow: a topic becomes a script, collage images, motion, narration, music and captions. The source also describes talking-head and reference-photo inputs.',
    setup: 'Prepare a factual brief, audience, duration and any material you have permission to use. The linked revision requires an Atlas Cloud API key, local FFmpeg/ffprobe and Python with Pillow. Confirm service charges before generating media.',
    limitation: 'Inspect a representative image and motion sample before a full render. Check facts, voice, captions and audio in the final video. Author previews do not establish your own runtime, cost or output quality; this guidance does not change the registry’s source or review status.',
    relatedHref: '/guides/agent-skills-for-product-videos', relatedLabel: 'Plan a product video workflow',
  },
  ...PRESENTATION_SOURCES.map(source => ({
    slug: source.registrySlug, repository: source.repository, path: source.path, commit: source.commit,
    title: `${source.name} Skill: ${source.output}`,
    description: `${source.bestFor}. Compare ${source.output.toLowerCase()}, editing limits, requirements and source instructions.`,
    summary: source.summary,
    setup: `${source.requirements} ${source.cost}`,
    limitation: `${source.limitation} This overview compares the linked source instructions; it is not an installation or generated-deck test.`,
    relatedHref: '/best/presentation-generation', relatedLabel: 'Compare PPTX and HTML presentation workflows',
  })),
  ...SCENARIO_SOURCES.filter(source => source.registrySlug).map(source => ({
    slug: source.registrySlug!, repository: source.repository, path: source.path, commit: source.commit,
    title: `${source.name} Skill: ${source.role}`,
    description: `${source.output}. Check task fit, setup and limitations before choosing this skill.`,
    summary: `${source.name} provides instructions for ${source.role.toLowerCase()}. The linked source describes ${source.output.toLowerCase()}.`,
    setup: source.setup,
    limitation: `${source.limits} These source notes do not establish a successful installation or runtime test.`,
    relatedHref: source.topic === 'video' ? '/guides/agent-skills-for-product-videos' : '/rankings/best-design-creative-skills',
    relatedLabel: source.topic === 'video' ? 'Plan a video workflow' : 'Compare design and implementation workflows',
  })),
]

export function getSkillGrowthProfile(skill: { slug: string; github_repo?: string | null; source_path?: string | null }, locale = 'en') {
  if (locale !== 'en') return undefined
  return SKILL_GROWTH_PROFILES.find(profile => profile.slug === skill.slug &&
    profile.repository.toLowerCase() === skill.github_repo?.toLowerCase() &&
    (!skill.source_path || profile.path === skill.source_path))
}

export function growthProfileSource(profile: SkillGrowthProfile) {
  return `https://github.com/${profile.repository}/blob/${profile.commit}/${profile.path}`
}
