import 'server-only'

import { unstable_cache } from 'next/cache'
import { withTimeout } from '@/lib/async'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'

const COVERAGE_QUERY_TIMEOUT_MS = 2_000

export interface RegistryCoverageStats {
  discoveredProjects: number
  validatedSkills: number
  installableSkills: number
  agentProvenSkills: number
  updatedAt: string | null
  exact: boolean
}

interface CoverageRow {
  discovered_projects: number | string
  validated_skills: number | string
  installable_skills: number | string
  agent_proven_skills: number | string
  updated_at: string
}

function normalizeCount(value: number | string | null | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0
}

async function fetchRegistryCoverageStats(): Promise<RegistryCoverageStats> {
  const { data, error } = await withTimeout(
    createPublicClient({ requestTimeoutMs: COVERAGE_QUERY_TIMEOUT_MS })
      .from('registry_coverage_stats')
      .select('discovered_projects,validated_skills,installable_skills,agent_proven_skills,updated_at')
      .eq('id', true)
      .maybeSingle(),
    COVERAGE_QUERY_TIMEOUT_MS,
    'registry coverage query'
  )

  if (error || !data) {
    throw new Error(error?.message || 'Registry coverage is not initialized')
  }

  const row = data as CoverageRow
  return {
    discoveredProjects: normalizeCount(row.discovered_projects),
    validatedSkills: normalizeCount(row.validated_skills),
    installableSkills: normalizeCount(row.installable_skills),
    agentProvenSkills: normalizeCount(row.agent_proven_skills),
    updatedAt: row.updated_at || null,
    exact: true,
  }
}

const getCachedRegistryCoverageStats = unstable_cache(
  fetchRegistryCoverageStats,
  ['public-registry-coverage-v1'],
  { revalidate: 300, tags: ['registry-coverage'] }
)

export async function getRegistryCoverageStats(): Promise<RegistryCoverageStats | null> {
  return getCachedRegistryCoverageStats().catch(() => null)
}

export async function refreshRegistryCoverageStats() {
  const { data, error } = await createAdminClient({ requestTimeoutMs: 20_000 })
    .rpc('refresh_registry_coverage_stats')

  if (error) {
    // Keep candidate ingestion backward compatible while the migration reaches
    // production. Coverage telemetry must never stop discovery.
    console.warn('[registry-coverage] refresh failed:', error.message)
    return { refreshed: false, error: error.message }
  }

  return { refreshed: true, data }
}
