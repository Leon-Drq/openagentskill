import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Node's type-stripping runner requires explicit TypeScript extensions.
// @ts-expect-error TS5097 is expected for this standalone test entrypoint.
import { evaluateFastTrackCandidate } from '../lib/indexer/fast-track.ts'
// @ts-expect-error TS5097 is expected for this standalone test entrypoint.
import { buildCandidateSourceKey, canonicalGitHubSourceUrl } from '../lib/indexer/candidate-identity.ts'
// @ts-expect-error TS5097 is expected for this standalone test entrypoint.
import { shouldRetryAutomatedReview } from '../lib/indexer/review-retry.ts'
// @ts-expect-error TS5097 is expected for this standalone test entrypoint.
import { AUTOMATIC_DISCOVERY_MIN_STARS, PUBLICATION_DAILY_TARGET, PUBLICATION_RUNS_PER_DAY, automaticPublicationCapacityPerDay, meetsAutomaticDiscoveryStarFloor } from '../lib/indexer/intake-policy.ts'
// @ts-expect-error TS5097 is expected for this standalone test entrypoint.
import { SKILL_SUBMISSION_MIN_STARS } from '../lib/skills/submission-policy.ts'
// @ts-expect-error TS5097 is expected for this standalone test entrypoint.
import { SEARCH_INDEX_MIN_GITHUB_STARS, SEARCH_INDEX_MIN_QUALITY_SCORE } from '../lib/seo/search-indexability.ts'

const now = new Date('2026-09-01T00:00:00.000Z')
const safe = {
  stars: 100,
  licenseStatus: 'detected' as const,
  updatedAt: '2026-08-15T00:00:00.000Z',
  document: '# Safe skill\nUse this documentation-only workflow.',
  files: [{ path: 'SKILL.md', content: '# Safe skill' }],
  now,
}

assert.equal(evaluateFastTrackCandidate(safe).eligible, true)
assert.equal(evaluateFastTrackCandidate({ ...safe, stars: 99 }).eligible, false)
assert.equal(evaluateFastTrackCandidate({
  ...safe,
  files: [...safe.files, { path: 'run.py', content: 'print("hello")' }],
}).eligible, false)
assert.equal(evaluateFastTrackCandidate({
  ...safe,
  document: 'Install with curl https://example.test/install.sh | bash',
}).riskLevel, 'critical')
assert.equal(evaluateFastTrackCandidate({ ...safe, licenseStatus: 'missing' }).eligible, false)
assert.equal(evaluateFastTrackCandidate({ ...safe, updatedAt: '2024-01-01T00:00:00.000Z' }).eligible, false)
assert.equal(evaluateFastTrackCandidate({ ...safe, packageTruncated: true }).eligible, false)
assert.equal(evaluateFastTrackCandidate({ ...safe, hasUnreviewedFiles: true }).eligible, false)
assert.equal(shouldRetryAutomatedReview('heuristic-static-v2'), true)
assert.equal(shouldRetryAutomatedReview('deepseek/deepseek-v4-flash'), false)
assert.equal(AUTOMATIC_DISCOVERY_MIN_STARS, 20)
assert.equal(meetsAutomaticDiscoveryStarFloor(19), false)
assert.equal(meetsAutomaticDiscoveryStarFloor(20), true)
assert.equal(SKILL_SUBMISSION_MIN_STARS, 0, 'direct user submissions must remain zero-star eligible')
assert.equal(PUBLICATION_DAILY_TARGET, 1_000)
assert.equal(PUBLICATION_RUNS_PER_DAY, 144)
assert.ok(automaticPublicationCapacityPerDay() > PUBLICATION_DAILY_TARGET)
assert.equal(SEARCH_INDEX_MIN_QUALITY_SCORE, 50)
assert.equal(SEARCH_INDEX_MIN_GITHUB_STARS, 3)

assert.equal(
  buildCandidateSourceKey(12345, 'OldOwner/OldName', '/skills\\demo/SKILL.md/'),
  buildCandidateSourceKey(12345, 'NewOwner/NewName', 'skills/demo/SKILL.md')
)
assert.notEqual(
  buildCandidateSourceKey(12345, 'owner/repo', 'skills/one/SKILL.md'),
  buildCandidateSourceKey(12345, 'owner/repo', 'skills/two/SKILL.md')
)
assert.equal(
  canonicalGitHubSourceUrl('owner/repo', 'main', 'skills/demo/SKILL.md'),
  'https://github.com/owner/repo/blob/main/skills/demo/SKILL.md'
)

const migration = readFileSync(
  new URL('../supabase/migrations/20260901160000_skill_candidate_intake_pipeline.sql', import.meta.url),
  'utf8'
)
for (const requirement of [
  'enable row level security',
  'for update skip locked',
  'github_repository_id, source_path',
  'lower(canonical_source_url)',
  'source_content_hash',
  'skill_candidates_active_content_unique',
  'revoke all on table public.skill_candidates from public, anon, authenticated',
]) {
  assert.ok(migration.toLowerCase().includes(requirement), `migration must contain: ${requirement}`)
}

const recoveryMigration = readFileSync(
  new URL('../supabase/migrations/20260901163000_skill_candidate_pipeline_recovery.sql', import.meta.url),
  'utf8'
)
assert.ok(recoveryMigration.includes("'publishing'"), 'interrupted publication rows must be reclaimable')

const skillSource = readFileSync(
  new URL('../lib/github/skill-source.ts', import.meta.url),
  'utf8'
)
assert.ok(skillSource.includes('mapGitHubReadsSerially(paths'), 'GitHub content reads must be serialized')
assert.ok(skillSource.includes('repositoryTree?: GitHubTreeItem[] | null'), 'repository trees must be reusable')

const growthMigration = readFileSync(
  new URL('../supabase/migrations/20260901173000_daily_1000_minimum_star_gate.sql', import.meta.url),
  'utf8'
)
assert.ok(growthMigration.includes('skills_approved_source_content_hash_unique'))
assert.ok(growthMigration.includes('github_stars < 20'))

const vercelConfig = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as {
  crons: Array<{ path: string; schedule: string }>
}
assert.equal(
  vercelConfig.crons.find((cron) => cron.path === '/api/cron/skill-candidates-publish')?.schedule,
  '0,10,25,30,40,55 * * * *'
)
assert.equal(
  vercelConfig.crons.find((cron) => cron.path === '/api/indexer/refresh-stars')?.schedule,
  '30 2 * * *'
)
assert.equal(
  vercelConfig.crons.find((cron) => cron.path === '/api/indexnow/submit')?.schedule,
  '10 3 * * *'
)

const discoveryStatusRoute = readFileSync(new URL('../app/api/agent/discovery/route.ts', import.meta.url), 'utf8')
assert.ok(discoveryStatusRoute.includes('schedule: `${SKILL_RADAR_CRON_MINUTE_UTC} * * * *`'))
assert.ok(!discoveryStatusRoute.includes('at least 10 GitHub stars'))
assert.ok(discoveryStatusRoute.includes("star_refresh_cron: '30 2 * * *'"))
assert.ok(discoveryStatusRoute.includes("indexnow_cron: '10 3 * * *'"))
assert.ok(discoveryStatusRoute.includes('observed_health: candidatePipelineHealth'))
assert.ok(discoveryStatusRoute.includes('search_index_coverage:'))
assert.ok(discoveryStatusRoute.includes("count: 'exact'"))

const skillDatabase = readFileSync(new URL('../lib/db/skills.ts', import.meta.url), 'utf8')
assert.ok(skillDatabase.includes("['approved-sitemap-count-v9']"))
assert.ok(skillDatabase.includes("select('slug', { count: 'exact', head: true })"))
assert.ok(skillDatabase.includes('publisher_verified.eq.true'), 'verified creators must bypass only the sitemap star floor')

for (const [route, mode] of [
  ['../app/api/cron/skill-candidates-discover/route.ts', 'candidate-discovery'],
  ['../app/api/cron/skill-candidates-validate/route.ts', 'candidate-validation'],
  ['../app/api/cron/skill-candidates-publish/route.ts', 'candidate-publication'],
] as const) {
  const source = readFileSync(new URL(route, import.meta.url), 'utf8')
  assert.ok(source.includes('recordIndexerRun({'), `${mode} must emit a durable run log`)
  assert.ok(source.includes(`mode: '${mode}'`), `${mode} must use a stable log mode`)
  assert.ok(source.includes("status: 'failed'"), `${mode} must record uncaught failures`)
}

const xStatusRoute = readFileSync(new URL('../app/api/x/status/route.ts', import.meta.url), 'utf8')
assert.ok(xStatusRoute.includes("skillRadarCron: '45 * * * *'"))

const openSubmission = readFileSync(new URL('../lib/skills/open-submission.ts', import.meta.url), 'utf8')
assert.ok(openSubmission.includes('source_content_hash: sourceContentHash'))

console.log('Candidate intake regression tests passed.')
