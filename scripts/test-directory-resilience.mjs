import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const migration = read('supabase/migrations/20261019134149_directory_rls_safe_deduplication.sql')
const previous = read('supabase/migrations/20261018143659_skill_product_metadata.sql')
const projection = sql => sql.match(/select\s+(id, slug,[\s\S]*?)\s+from public\.skills s/i)[1].replace(/\s+/g, ' ')
assert.equal(projection(migration), projection(previous), 'Public view columns and their order stay compatible')
assert.match(migration, /security_invoker = true/)
assert.doesNotMatch(migration, /security definer|disable row level security|alter table|update public\.skills/i)
assert.match(migration, /directory_sources as materialized/i)
assert.match(migration, /duplicate_ids as materialized/i)
assert.match(migration, /lower\(github_repo\) as normalized_repo/)
assert.match(migration, /older\.source_path=s\.source_path/)
assert.match(migration, /\(older\.created_at,older\.id\)<\(s\.created_at,s\.id\)/)
assert.equal((migration.match(/ai_review_approved=true or (?:s\.)?listing_status in \('owner_published','static_checked'\)/g) || []).length, 2)
assert.equal((migration.match(/public\.is_directory_skill\(/g) || []).length, 2)

// This read-only fixture can also be executed against Postgres with --sql.
// Exercise the actual migration CTE, substituting only a small source relation
// and the independently tested directory-scope predicate.
const body = migration.slice(migration.indexOf('with directory_sources'), migration.indexOf(';\n\nNOTIFY'))
  .replace(/public\.skills/g, 'test_skills')
  .replace(/public\.is_directory_skill\(name,github_repo,category,tags,frameworks\)/g, 'is_directory')
  .replace(/select id, slug,[\s\S]*?from test_skills s/, 'select s.id from test_skills s')
const fixture = `begin read only;
with test_skills(id,created_at,github_repo,source_path,ai_review_approved,listing_status,is_directory) as (values
 (1,1,'Owner/Repo','SKILL.md',true,'reviewed',true),
 (2,2,'owner/repo','SKILL.md',true,'reviewed',true),
 (3,3,'OWNER/REPO','SKILL.md',false,'owner_published',true),
 (4,1,'Owner/Repo','nested/SKILL.md',false,'static_checked',true),
 (5,1,'Owner/Repo','skill.md',true,'reviewed',true),
 (6,0,'Owner/Repo','SKILL.md',false,'rejected',true),
 (7,0,'Owner/Repo','SKILL.md',true,'reviewed',false),
 (8,1,null,'SKILL.md',true,'reviewed',true),
 (9,2,null,'SKILL.md',true,'reviewed',true),
 (10,1,'other/repo',null,true,'reviewed',true),
 (11,2,'other/repo',null,true,'reviewed',true),
 (12,1,'Owner/Repo','SKILL.md',true,'reviewed',true),
 (13,null,'Owner/Repo','SKILL.md',true,'reviewed',true),
 (14,null,'Owner/Repo','SKILL.md',true,'reviewed',true),
 (15,1,'hidden/repo','SKILL.md',false,'pending',true)
), actual as (${body}), expected(id) as (values(1),(4),(5),(8),(9),(10),(11),(13),(14))
select not exists ((select id from actual except select id from expected)
 union all (select id from expected except select id from actual)) as passed;
rollback;`
if (process.argv.includes('--sql')) {
  console.log(fixture)
} else {
  for (const path of ['app/skills/error.tsx', 'app/cached-public/[locale]/skills/error.tsx', 'app/cached-public/[locale]/directory/error.tsx']) {
    assert.match(read(path), /'use client'/)
    assert.match(read(path), /SkillPageError as default/)
  }
  const error = read('components/skill-page-error.tsx')
  assert.match(error, /<SiteHeader/)
  assert.match(error, /<SiteFooter/)
  assert.match(error, /onRetry=\{retry\}/)
  assert.doesNotMatch(error, /error\.(message|stack)|window\.location|fetch\(/)
  const recovery = read('components/directory-recovery.tsx')
  assert.match(recovery, /onRetry \? onRetry\(\) : router\.refresh\(\)/)
  assert.match(recovery, /RETRY_COOLDOWN_MS = 60_000/)
  assert.match(recovery, /attempted\.current \|\| !ready/)
  assert.match(recovery, /navigator\.onLine/)
  assert.match(read('scripts/test-render-cost.mjs'), /requireHealthy: true/)
  console.log('Directory recovery: canonical SQL, RLS, route boundaries and bounded retry checks passed.')
}
