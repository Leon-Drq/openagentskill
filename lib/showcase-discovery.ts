// @ts-expect-error Direct Node regression tests require the TypeScript extension.
import { SHOWCASE_CASES, filterShowcaseCases, localizeShowcase, getShowcaseTags } from './showcase.ts'
// @ts-expect-error Direct Node regression tests require the TypeScript extension.
import { buildShowcaseTaskPackage, type ShowcaseAgentTarget } from './showcase-task.ts'

export function searchShowcaseWorkflows({ query = '', category = 'all', limit = 8, offset = 0, locale = 'en' } = {}) {
  const matches = filterShowcaseCases(category, query)
  const start = Number.isFinite(offset) ? Math.min(1000, Math.max(0, Math.floor(offset))) : 0
  const size = Number.isFinite(limit) ? Math.min(20, Math.max(1, Math.floor(limit))) : 8
  return {
    schema_version: 'openagentskill-workflow-list-v1',
    total: matches.length,
    offset: start,
    next_offset: start + size < matches.length ? start + size : null,
    notice: 'Curated references, templates and examples. Not proof of installation, compatibility or runtime safety. Read the task package and current skill review before use.',
    items: matches.slice(start, start + size).map(item => ({
      slug: item.slug, title: localizeShowcase(item.title, locale), description: localizeShowcase(item.description, locale),
      category: item.category, tags: getShowcaseTags(item).map(tag => tag.id), skill_slug: item.skillSlug,
      evidence_kind: item.evidenceKind || 'work', provenance: item.provenance, updated_at: item.updatedAt,
      url: `https://www.openagentskill.com/showcase/${item.slug}`,
      task_package_url: `https://www.openagentskill.com/api/agent/showcase/${item.slug}`,
    })),
  }
}

export function getShowcaseTaskPackage(slug: string, locale = 'en', agent: ShowcaseAgentTarget = 'auto') {
  const item = SHOWCASE_CASES.find(entry => entry.slug === slug)
  return item ? buildShowcaseTaskPackage(item, locale, agent) : null
}
