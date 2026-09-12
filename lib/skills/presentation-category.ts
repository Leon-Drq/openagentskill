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

export function skillPresentationOverride(skill: { github_repo?: string | null; repository?: string | null }) {
  const repo = (skill.github_repo || skill.repository || '').replace(/^https?:\/\/github\.com\//i, '').split('/').slice(0, 2).join('/').toLowerCase()
  return sourceCategories[repo]
}

export function skillPresentationCategory(skill: { category: string; github_repo?: string | null; repository?: string | null }) {
  return skillPresentationOverride(skill) || skill.category
}
