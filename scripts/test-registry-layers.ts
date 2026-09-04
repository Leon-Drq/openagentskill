import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

const migration = read('supabase/migrations/20260904081124_registry_coverage_stats.sql').toLowerCase()
for (const requirement of [
  'create table if not exists public.registry_coverage_stats',
  'enable row level security',
  'registry_coverage_stats_select_public',
  'grant select on table public.registry_coverage_stats to anon, authenticated',
  'grant execute on function public.refresh_registry_coverage_stats()',
  'count(*) filter (where ai_review_approved = true)',
  "status in ('fast_track', 'review_required', 'publishing', 'publication_error')",
  'union',
]) {
  assert.ok(migration.includes(requirement), `coverage migration must contain: ${requirement}`)
}
assert.ok(
  migration.indexOf('revoke all on function public.refresh_registry_coverage_stats()') <
    migration.indexOf('grant execute on function public.refresh_registry_coverage_stats()'),
  'coverage refresh must revoke broad execution before granting service-role access'
)

const coverageRoute = read('app/api/registry/stats/route.ts')
assert.match(coverageRoute, /discovered_projects/)
assert.match(coverageRoute, /validated_skills/)
assert.match(coverageRoute, /installable_skills/)
assert.match(coverageRoute, /agent_proven_skills/)
assert.match(coverageRoute, /'X-Robots-Tag': 'noindex'/)

const discoveryRoute = read('app/api/cron/skill-candidates-discover/route.ts')
assert.match(discoveryRoute, /refreshRegistryCoverageStats\(\)/)

const home = read('components/home-page-enhanced.tsx')
assert.match(home, /stats: \['Installable skills'/)
assert.match(home, /discoveredProjectsLabel/)
assert.match(home, /validatedSkillsLabel/)

const outcomes = read('lib/agent-outcomes.ts')
assert.match(outcomes, /openagentskill-agent-outcome-v4/)
assert.match(outcomes, /source_version: input\.sourceVersion \|\| null/)

const outcomeRoute = read('app/api/agent/outcome/route.ts')
assert.match(outcomeRoute, /\.from\('skill_versions'\)/)
assert.match(outcomeRoute, /Source version is not recorded for this skill/)
assert.match(outcomeRoute, /source_version_verified/)

const receipt = read('lib/agent-install-receipt.ts')
assert.match(receipt, /openagentskill-install-receipt-v2/)
assert.match(receipt, /source_version: selected\.skill\.source_version \|\| null/)

console.log('Registry layer and version-attribution regression tests passed.')
