import { skillTaxonomy, type TaxonomyInput, type SkillTaxonomy } from './taxonomy'
// Source-specific display corrections, checked against each GitHub repository's
// own description on 2026-09-12. Never changes review, publication or install state.
const sourceCategories: Record<string, string> = {
  'obra/superpowers': 'coding-agents',
  'yanliudesign/mono-color-skill': 'design-creative',
  'op7418/guizang-ppt-skill': 'presentation',
  'zarazhangrui/frontend-slides': 'presentation',
  'alisa0808/vox-director': 'video-creation',
  'tt-a1i/archify': 'design-creative',
}

export function skillPresentationOverride(skill: { github_repo?: string | null; repository?: string | null; source_path?: string | null }) {
  const repo = (skill.github_repo || skill.repository || '').replace(/^https?:\/\/github\.com\//i, '').split('/').slice(0, 2).join('/').toLowerCase()
  // Historical repository corrections only apply to records without an exact package path.
  return skill.source_path ? undefined : sourceCategories[repo]
}

export function skillPresentationCategory(skill: TaxonomyInput & Partial<SkillTaxonomy> & { category: string; github_repo?: string | null; repository?: string | null }) {
  if (skill.taxonomy_version === 1 && skill.primary_category) return skill.primary_category
  return skillPresentationOverride(skill) || skillTaxonomy(skill).primary_category
}
