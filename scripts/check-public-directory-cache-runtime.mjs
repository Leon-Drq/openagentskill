import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { unstable_dev } from 'wrangler'
process.env.WRANGLER_SEND_METRICS = 'false'
mkdirSync('.codex-tmp', { recursive: true })
const directory = mkdtempSync(resolve('.codex-tmp/directory-cache-runtime-'))
const config = resolve(directory, 'wrangler.json'), main = resolve('scripts/fixtures/public-directory-cache-worker.mjs')
writeFileSync(config, JSON.stringify({ name: 'oas-directory-local-test', main, compatibility_date: '2026-10-01',
  compatibility_flags: ['nodejs_compat'], vars: { LOCAL_CACHE_TEST: '1' }, workers_dev: false,
  d1_databases: [{ binding: 'TAGS', database_name: 'tags-test', database_id: '00000000-0000-4000-8000-000000000000' }] }))
let worker
try {
  worker = await unstable_dev(main, { config, local: true, persistTo: resolve(directory, 'state'), ip: '127.0.0.1', port: 0,
    inspectorPort: 0, logLevel: 'error', experimental: { disableExperimentalWarning: true } })
  const response = await worker.fetch('http://localhost/check')
  const result = await response.json()
  assert.equal(response.status, 200, JSON.stringify(result)); assert.equal(result.passed, true)
  writeFileSync(resolve(directory, 'report.json'), JSON.stringify(result, null, 2)); console.log(result)
} finally { await worker?.stop() }
