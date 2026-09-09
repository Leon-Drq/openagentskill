/** Upstream declarations, not a registry-generated release or a security approval. */
export interface SkillVersionEvidence {
  value: string | null
  source: 'skill_frontmatter' | 'plugin_manifest' | 'unknown'
  path: string | null
  ref: string | null
}

export function declaredSkillVersion(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const version = String(value).trim()
  // Preserve upstream versions such as 2.2 or v0.1.0; never pad or invent a release.
  return /^[vV]?\d+(?:\.\d+){0,3}(?:[-+][a-zA-Z0-9.-]+)?$/.test(version) && version.length <= 80 ? version : null
}

export function resolveSkillVersion(input: {
  name: string; path: string; ref: string; declared?: unknown
  pluginManifests?: { path: string; content: string }[]
}): SkillVersionEvidence {
  const declared = declaredSkillVersion(input.declared)
  if (declared) return { value: declared, source: 'skill_frontmatter', path: input.path, ref: input.ref }
  for (const file of input.pluginManifests || []) {
    try {
      const manifest = JSON.parse(file.content)
      // A monorepo/package version must not be borrowed from an unrelated plugin.
      if (manifest.name !== input.name) continue
      const value = declaredSkillVersion(manifest.version)
      if (value) return { value, source: 'plugin_manifest', path: file.path, ref: input.ref }
    } catch { /* Invalid optional metadata is not evidence. */ }
  }
  return { value: null, source: 'unknown', path: null, ref: input.ref }
}

export function getStoredSkillVersionEvidence(skill: {
  ai_review_score?: Record<string, unknown> | null
  owner_publication?: { static_analysis?: { version_evidence?: unknown } } | null
}): SkillVersionEvidence | null {
  const raw = skill.ai_review_score?.version_evidence || skill.owner_publication?.static_analysis?.version_evidence
  if (!raw || typeof raw !== 'object') return null
  const evidence = raw as SkillVersionEvidence
  if (!['skill_frontmatter', 'plugin_manifest', 'unknown'].includes(evidence.source)) return null
  return { value: declaredSkillVersion(evidence.value), source: evidence.source,
    path: typeof evidence.path === 'string' ? evidence.path : null,
    ref: typeof evidence.ref === 'string' ? evidence.ref : null }
}
