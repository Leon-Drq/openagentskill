import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { toResolveWebResponse } from '../lib/resolve-web-response.ts'

const candidate = {
  skill: { slug: 'example', name: 'Example', description: 'A task', repository: 'owner/repo', github_repo: 'owner/repo', github_stars: 20, long_description: 'x'.repeat(50000) },
  recommendation_reasons: ['Task match'],
  source_evidence: { canOfferInstall: true, notice: 'Recorded, not runtime verified' },
  safety: { blocked: false, human_review_required: true, auto_install_allowed: false },
  use_cases: [{ slug: 'design', title: 'Design', unrelated: 'x'.repeat(5000) }],
  audit: { largeDetails: 'x'.repeat(30000) },
}
const full = {
  selected: candidate, alternatives: [candidate], review_candidates: [candidate],
  policy_decision: { status: 'human_review' }, meta: { registry_status: 'live_pool' },
  recommendation_lanes: [candidate], install_receipt: { largeDetails: 'x'.repeat(30000) },
}
const before = JSON.stringify(full)
const web = toResolveWebResponse(full)
assert.equal(JSON.stringify(full), before, 'projection cannot mutate the machine response')
assert.deepEqual(web.selected.safety, full.selected.safety)
assert.deepEqual(web.selected.source_evidence, full.selected.source_evidence)
assert.deepEqual(web.policy_decision, full.policy_decision)
assert.equal(web.meta.registry_status, 'live_pool')
assert.deepEqual(web.review_candidates, [{ skill: { slug: 'example', name: 'Example' } }])
assert.ok(JSON.stringify(web).length < before.length / 10, 'web projection must avoid repeated contracts')
assert.equal(toResolveWebResponse({ ...full, selected: null }).selected, null)
assert.equal(toResolveWebResponse({ ...full, meta: { registry_status: 'snapshot_only' } }).meta.registry_status, 'snapshot_only')
const read = path => readFileSync(path, 'utf8')
const home = read('components/home-page-enhanced.tsx')
assert.doesNotMatch(home, /import .*from ['"].*(?:showcase|home-creators)/)
assert.match(read('components/home-page.tsx'), /showcase=\{<HomeShowcaseStatic/)
assert.doesNotMatch(read('components/home-creators.tsx'), /use client|useI18n/)
const resolve = read('app/resolve/page.tsx')
assert.match(resolve, /<Suspense/)
assert.match(resolve, /await resolveAgentSkill/)
assert.match(resolve, /initialResult=\{result\}/)
assert.match(resolve, /robots: \{ index: !hasQuery, follow: true \}/)
const results = read('components/resolve-results.tsx')
assert.match(results, /attempt === 0 && \(initialResult !== undefined \|\| initialError\)/, 'hydration must not repeat server search')
assert.match(results, /format: 'web'/, 'retries must use the slim response too')
assert.match(read('app/api/agent/resolve/route.ts'), /return NextResponse.json\(payload\)/, 'default API contract stays available')
assert.match(read('lib/db/skills.ts'), /rowLimit <= 800/, 'resolver pool fits into a single database page')
assert.doesNotMatch(read('lib/agent-resolve.ts'), /const getResolveCandidatePool = unstable_cache/, 'fallback candidate pools must not enter a second success cache')
assert.match(read('app/shortlists/[lane]/social/[slide]/opengraph-image.tsx'), /runtime = 'nodejs'/)
console.log('Web performance: slim response, unchanged safety/source decisions, SSR search, no duplicate fetch and server editorial boundaries passed.')
