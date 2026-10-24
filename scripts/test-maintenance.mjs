import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const { NextRequest, NextResponse } = require('next/server')
function compile(file, deps) {
  const output = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  new Function('exports', 'require', output)(exports, name => { assert.ok(name in deps, name); return deps[name] })
  return exports
}
const policy = compile('lib/data-maintenance.ts', {})
let dataCalls = 0, cacheCalls = 0
const forbidden = () => { dataCalls++; throw new Error('Unexpected live read') }
const route = compile('app/api/mcp/route.ts', {
  'next/server': { NextResponse }, zod: require('zod'),
  '@/lib/data-maintenance': policy,
  '@/lib/agent-resolve': { resolveAgentSkill: forbidden },
  '@/lib/db/skills': { searchSkills: forbidden },
  '@/lib/registry': { buildInstallHandoff: forbidden },
  '@/lib/skill-fallbacks': { getSkillBySlugOrFallbackStrict: forbidden },
  '@/lib/ranking-snapshots': { getLatestRankingSnapshot: forbidden },
  '@/lib/showcase-discovery': { searchShowcaseWorkflows: () => ({ source: 'static-workflows' }) },
  '@/lib/showcase-task': { SHOWCASE_AGENT_TARGETS: ['auto', 'codex'] },
  '@/lib/i18n/config': { locales: ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id'] },
  '@/lib/skills/source-evidence': { getSkillSourceEvidence: forbidden },
  '@/lib/skills/review-evidence': { getReviewEvidence: forbidden },
})
const downloads = compile('lib/skills/downloads.ts', {
  'server-only': {}, 'next/server': { NextResponse },
  'next/cache': { unstable_cache: () => async () => { cacheCalls++; return { example: 7 } } },
  '@/lib/data-maintenance': policy, '@/lib/supabase/admin': { createAdminClient: forbidden }, './download-policy': {},
  './media-query': compile('lib/skills/media-query.ts', {}),
})
const home = compile('lib/home-page-data.ts', {
  'next/cache': { unstable_cache: fn => async (...args) => { cacheCalls++; return fn(...args) } },
  '@/lib/data-maintenance': policy,
  '@/lib/registry-stats': { getApprovedRegistrySkillCount: forbidden },
  '@/lib/db/skills': { getAgentOutcomeStatsMapStrict: forbidden },
  '@/lib/ranking-snapshots': { getLatestRankingSnapshot: forbidden },
  '@/lib/github-owner': { getGitHubOwner: forbidden },
  '@/lib/registry-coverage': { getRegistryCoverageStats: forbidden },
})
const post = (method, params) => route.POST(new NextRequest('https://www.openagentskill.com/api/mcp', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 42, method, params }),
}))
const before = process.env.SUPABASE_DATA_PAUSED
try {
  process.env.SUPABASE_DATA_PAUSED = '1'
  for (const method of ['initialize', 'ping', 'tools/list']) assert.equal((await post(method)).status, 200)
  assert.equal((await post('tools/call', { name: 'find_workflows', arguments: {} })).status, 200)
  for (const name of ['search_skills', 'resolve_task', 'get_skill', 'get_install_plan', 'get_rankings', 'report_outcome']) {
    const response = await post('tools/call', { name, arguments: {} })
    assert.equal(response.status, 503)
    assert.equal(response.headers.get('retry-after'), '600')
    const body = await response.json()
    assert.equal(body.id, 42)
    assert.equal(body.jsonrpc, '2.0')
    assert.equal(body.error.data.code, 'data_temporarily_unavailable')
    assert.ok(!('result' in body), 'No successful install/review/outcome is fabricated')
  }
  assert.equal(await downloads.getDownloadTotals(['example']), null)
  const landing = await home.getHomePageData()
  assert.equal(landing.stats.evidenceExact, false)
  assert.equal(landing.stats.totalSkillsExact, false)
  assert.equal(landing.stats.totalSkills, 35_296)
  assert.equal(landing.stats.totalSkillsAsOf, '2026-10-11')
  assert.equal(landing.stats.dataPaused, true)
  assert.deepEqual(landing.featuredSkills, [])
  assert.equal(cacheCalls, 0, 'Even a stale cache lookup can cause background work: skip it')
  assert.equal(dataCalls, 0)
  delete process.env.SUPABASE_DATA_PAUSED
  assert.deepEqual(await downloads.getDownloadTotals(['example']), { example: 7 })
  assert.equal(cacheCalls, 1)

  // A cold-cache failure stays dated; successful reads replace it, even when
  // the live count is lower. Historical metadata must never become a floor.
  let countResult = null
  const recoveringHome = compile('lib/home-page-data.ts', {
    'next/cache': { unstable_cache: fn => fn },
    '@/lib/data-maintenance': policy,
    '@/lib/registry-stats': { getApprovedRegistrySkillCount: async () => countResult },
    '@/lib/db/skills': { getAgentOutcomeStatsMapStrict: async () => ({}) },
    '@/lib/ranking-snapshots': { getLatestRankingSnapshot: async () => null },
    '@/lib/github-owner': { getGitHubOwner: forbidden },
    '@/lib/registry-coverage': { getRegistryCoverageStats: async () => null },
  })
  for (const unavailable of [null, { count: 99_999, exact: false }]) {
    countResult = unavailable
    const { stats } = await recoveringHome.getHomePageData()
    assert.equal(stats.totalSkills, 35_296)
    assert.equal(stats.totalSkillsExact, false)
    assert.equal(stats.totalSkillsAsOf, '2026-10-11')
    assert.equal(stats.dataPaused, false)
  }
  for (const count of [36_000, 0]) {
    countResult = { count, exact: true }
    const { stats } = await recoveringHome.getHomePageData()
    assert.equal(stats.totalSkills, count)
    assert.equal(stats.totalSkillsExact, true)
    assert.equal(stats.totalSkillsAsOf, null)
    assert.equal(stats.dataPaused, false)
  }
} finally {
  if (before === undefined) delete process.env.SUPABASE_DATA_PAUSED; else process.env.SUPABASE_DATA_PAUSED = before
}
console.log('Maintenance: protocol discovery, static tools, explicit 503, retry hints, zero data/cache reads and recovery passed.')
