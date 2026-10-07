import 'server-only'
import previews from './skill-previews.json'
import type { SkillPreviewCardData, SkillSourcePreview } from './skill-preview-shared'

const registry = new Map((previews as SkillSourcePreview[]).map(preview => [preview.skillSlug, preview]))
// An interface or an input image alone is not an output example.
export const SOURCE_EXAMPLE_SKILL_SLUGS = [...registry.values()]
  .filter(preview => preview.media.some(image => ['example', 'template', 'style'].includes(image.kind)))
  .map(preview => preview.skillSlug)

export const getSkillSourcePreview = (slug: string) => registry.get(slug) || null
export function getSkillPreviewCardData(slug: string): SkillPreviewCardData | null {
  const preview = getSkillSourcePreview(slug)
  return preview ? { media: preview.media[0], imageCount: preview.media.length, format: preview.format } : null
}

// Link to author galleries when redistribution permission is not established.
// These are references, not local examples, and never affect example counts.
export const SOURCE_GALLERY_LINKS: Record<string, string> = {
  'adobe-research-custom-diffusion': 'https://nupurkmr9.github.io/custom-diffusion/results.html',
  'foundationvision-var': 'https://github.com/FoundationVision/VAR/blob/78b95394fc5896192e3a003e4b295f8ea743c48f/README.md',
}
