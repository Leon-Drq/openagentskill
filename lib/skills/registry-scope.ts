export interface RegistryScopeRecord {
  name?: string | null
  description?: string | null
  long_description?: string | null
  tagline?: string | null
  category?: string | null
  tags?: string[] | null
  frameworks?: string[] | null
  github_repo?: string | null
}

const MCP_ONLY_CATEGORY = /^(?:mcp|mcp[-_\s]?(?:server|servers|registry)|model[-_\s]?context[-_\s]?protocol)$/i
const MCP_ONLY_MARKER = /^(?:mcp[-_\s]?(?:server|servers|client|host|gateway|proxy|registry)|model[-_\s]?context[-_\s]?protocol)$/i
const MCP_SERVER_IDENTITY = /\bmcp[-_\s]?(?:server|servers|client|host|gateway|proxy|registry)\b|\bmodel context protocol\b/i
const BARE_MCP_IDENTITY = /(^|[^a-z0-9])mcp([^a-z0-9]|$)/i
const SKILL_IDENTITY = /(^|[^a-z0-9])skills?([^a-z0-9]|$)/i

export function isMcpOnlyCategory(category: string | null | undefined) {
  return MCP_ONLY_CATEGORY.test((category || '').trim())
}

/**
 * Exclude MCP-only products without hiding Agent Skills that merely inspect,
 * configure, secure, or otherwise mention MCP servers in their instructions.
 */
export function isMcpOnlySkillRecord(record: RegistryScopeRecord) {
  if (isMcpOnlyCategory(record.category)) return true

  const markers = [...(record.tags || []), ...(record.frameworks || [])]
    .map((value) => value.trim())
    .filter(Boolean)
  if (markers.some((value) => MCP_ONLY_MARKER.test(value))) return true

  const identity = [record.name, record.github_repo].filter(Boolean).join(' ')
  if (MCP_SERVER_IDENTITY.test(identity)) return true

  const skillIdentity = [identity, ...markers].join(' ')
  return BARE_MCP_IDENTITY.test(identity) && !SKILL_IDENTITY.test(skillIdentity)
}
