import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Node's type-stripping runner needs the explicit extension.
// @ts-expect-error TS5097 is expected for this standalone Node test entrypoint.
import { classifyXConnectionError } from '../lib/x/health.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const readProjectFile = (path: string) => readFileSync(`${root}/${path}`, 'utf8')

assert.deepEqual(classifyXConnectionError(new Error('Invalid server secret')), {
  code: 'secret_mismatch',
  reason: 'The application and database automation secrets are out of sync.',
  reauthorizationRequired: false,
  action: 'Apply the latest database migrations before running X automation.',
})

assert.equal(
  classifyXConnectionError(new Error('Wrong key or corrupt data')).reauthorizationRequired,
  true
)
assert.equal(
  classifyXConnectionError(new Error('Failed to load X OAuth connection')).code,
  'connection_check_failed'
)

const guardedSetupScripts = [
  'scripts/006_controlled_public_write_rpcs.sql',
  'scripts/007_quality_scoring_and_indexer_rpcs.sql',
  'scripts/008_indexer_run_logs.sql',
]

for (const path of guardedSetupScripts) {
  const sql = readProjectFile(path)
  assert.equal(
    sql.includes('v_expected_secret_hash constant text'),
    false,
    `${path} must delegate secret validation to assert_indexer_secret`
  )
  assert.match(sql, /perform public\.assert_indexer_secret\(p_server_secret\);/)
}

const xSetup = readProjectFile('scripts/009_x_auto_posting.sql')
assert.equal(
  xSetup.includes('074705db488fc272fdd4913f06b11cf5ca05b79ceb8af005ecdb6e2479a0af01'),
  false,
  'the retired automation secret digest must not remain in active setup SQL'
)

const repairMigration = readProjectFile(
  'supabase/migrations/20260823160820_unify_indexer_secret_and_restore_x_automation.sql'
)
assert.match(repairMigration, /v_rewritten_count <> 5/)
assert.match(repairMigration, /revoke all on function public\.assert_indexer_secret/)

const vercelConfig = JSON.parse(readProjectFile('vercel.json')) as {
  crons?: Array<{ path: string; schedule: string }>
}
assert.equal(
  vercelConfig.crons?.some(
    (cron) => cron.path === '/api/x/post-daily' && cron.schedule === '30 15,19,23 * * *'
  ),
  true,
  'the X daily publishing cron must remain configured'
)

console.log('X automation regression tests passed.')
