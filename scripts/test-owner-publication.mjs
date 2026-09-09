import assert from 'node:assert/strict'
import './test-review-provenance.mjs'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { isOwnerPublishAuthorized } = await import('../lib/security/owner-publish-auth.ts')
const { OwnerPublicationSchema } = await import('../lib/skills/owner-publication-schema.ts')
const { prepareOwnerPublication, publishOwnerSkill } = await import('../lib/skills/owner-publication.ts')
const { evaluateSkillSubmissionPolicy } = await import('../lib/skills/submission-policy.ts')
const { getSkillTrustProfile, getSkillTrustProfileV5 } = await import('../lib/trust.ts')
const { buildSkillAudit } = await import('../lib/audits.ts')
const { getAgentSafetyProfile } = await import('../lib/agent-safety.ts')
const { getSkillDecisionProfile } = await import('../lib/decision.ts')
const { isSearchIndexEligible } = await import('../lib/seo/search-indexability.ts')

const secret = 'test-only-owner-token-'.repeat(3)
const request = (token) => new Request('http://localhost:3000/api/admin/skills/publish', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
assert.equal(isOwnerPublishAuthorized(request(secret), secret), true)
for (const token of [undefined, '', 'cron-token', `${secret}x`, `${secret.slice(0, -1)}X`]) assert.equal(isOwnerPublishAuthorized(request(token), secret), false)
assert.equal(isOwnerPublishAuthorized(request(secret), ''), false, 'no localhost/dev fallback')
assert.equal(isOwnerPublishAuthorized(request('short'), 'short'), false)

const input = { repository: 'fixture/owner-skill', reason: 'Explicit owner curation test', requestId: 'e456a9f1-e92c-4c51-a1fb-214d36d18f11', dryRun: true }
assert.equal(OwnerPublicationSchema.safeParse(input).success, true)
for (const extra of [{ ai_review_approved: true }, { scores: { security: 10 } }, { verified: true }, { listing_status: 'reviewed' }, { owner: true }]) {
  assert.equal(OwnerPublicationSchema.safeParse({ ...input, ...extra }).success, false, 'caller must not supply review state')
}
assert.equal(OwnerPublicationSchema.safeParse({ ...input, reason: '' }).success, false)

let privateRepo = false
let paths = ['SKILL.md']
let rateLimited = false
let name = 'Fixture Skill'
const commit = 'a'.repeat(40)
const calls = []
const originalFetch = globalThis.fetch
globalThis.fetch = async (url) => {
  const target = new URL(url)
  calls.push(target.href)
  assert.equal(target.origin, 'https://api.github.com', 'dry-run must not publish or call an AI provider')
  if (rateLimited) return new Response('', { status: 429 })
  if (target.pathname === '/repos/fixture/owner-skill') return Response.json({
    private: privateRepo, full_name: 'fixture/owner-skill', stargazers_count: 0, forks_count: 0,
    updated_at: new Date().toISOString(), pushed_at: new Date().toISOString(), default_branch: 'main', license: { spdx_id: 'MIT' },
  })
  if (target.pathname.endsWith('/commits/main')) return Response.json({ sha: commit })
  if (target.pathname.includes('/git/trees/')) {
    assert.ok(target.pathname.includes(commit))
    return Response.json({ tree: paths.map(path => ({ path, type: 'blob', size: 180 })), truncated: false })
  }
  if (target.pathname.includes('/contents/')) {
    assert.equal(target.searchParams.get('ref'), commit, 'content must be pinned to resolved revision')
    return new Response(`---\nname: ${name}\ndescription: A fixture skill for source preparation tests with zero GitHub stars.\n---\n# Instructions\nRead the input and return a short plain-text summary.\n`)
  }
  throw new Error(`Unexpected test request: ${target.href}`)
}
let prepared
try {
  prepared = await prepareOwnerPublication(input)
  assert.equal(prepared.skill.github_stars, 0, 'owner lane has no star gate')
  assert.match(prepared.skill.install_command, new RegExp(commit))
  assert.equal(prepared.skill.source_ref, commit)
  assert.match(prepared.skill.source_content_hash, /^[a-f0-9]{64}$/)
  assert.equal(prepared.scan.executed, false)
  const dry = await publishOwnerSkill(input)
  assert.equal(dry.dry_run, true)
  assert.equal(dry.ai_review_approved, false)
  assert.equal(dry.skill.verified, undefined)
  name = 'Bad $(command) name'
  assert.doesNotMatch((await prepareOwnerPublication(input)).skill.install_command, /\$\(|command/)
  name = 'Fixture Skill'
  paths = ['SKILL.md', 'nested/SKILL.md']
  await assert.rejects(prepareOwnerPublication(input), error => error.status === 422)
  paths = ['SKILL.md']
  privateRepo = true
  await assert.rejects(prepareOwnerPublication(input), /Only public repositories/)
  privateRepo = false
  rateLimited = true
  const before = calls.length
  await assert.rejects(prepareOwnerPublication(input))
  assert.equal(calls.length - before, 1, 'GitHub rate limit must stop the request, not retry repeatedly')
} finally { globalThis.fetch = originalFetch }

const skill = {
  ...prepared.skill, id: 'test-id', listing_status: 'owner_published', ai_review_approved: false,
  ai_review_score: null, ai_review_issues: [], ai_review_suggestions: [], github_stars: 50000,
  quality_score: 99, verified: false, publisher_verified: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
}
for (const getTrust of [getSkillTrustProfile, getSkillTrustProfileV5]) {
  const trust = getTrust(skill)
  assert.equal(trust.autoInstall.allowed, false)
  assert.notEqual(trust.installReadiness.policy, 'agent_install_candidate')
  assert.ok(['review', 'risk'].includes(trust.tier), 'popularity must not imply owner publication is reviewed')
}
const audit = buildSkillAudit(skill)
assert.equal(getSkillDecisionProfile(skill).readinessLabel, 'Needs manual review')
assert.equal(getSkillDecisionProfile(skill).adoptionStage, 'Review')
assert.notEqual(audit.risk_level, 'safe_to_try')
const safety = getAgentSafetyProfile(skill, audit)
assert.equal(safety.auto_install_allowed, false)
assert.equal(safety.human_review_required, true)
assert.equal(isSearchIndexEligible(skill), false)
const risky = { ...skill, owner_publication: { channel: 'owner', static_analysis: { riskLevel: 'critical' } } }
assert.equal(buildSkillAudit(risky).risk_level, 'risky')
assert.equal(getAgentSafetyProfile(risky, buildSkillAudit(risky)).blocked, true)

const review = { approved: true, totalScore: 36, scores: { security: 9, quality: 9, usefulness: 9, compliance: 9 }, issues: [], suggestions: [], reviewModel: 'test-model', reviewTime: new Date().toISOString() }
const submission = { stars: 0, hasReadme: false, hasSkillDocument: true, staticAnalysis: { passed: true, riskLevel: 'low', issues: [] }, review }
assert.equal(evaluateSkillSubmissionPolicy(submission).approved, true, 'normal zero-star reviewed submissions remain possible')
assert.equal(evaluateSkillSubmissionPolicy({ ...submission, review: { ...review, approved: false, scores: { ...review.scores, security: 5 } } }).approved, false)
assert.equal(evaluateSkillSubmissionPolicy({ ...submission, staticAnalysis: { passed: false, riskLevel: 'critical', issues: ['Fixture finding'] } }).approved, false)

const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const route = source('app/api/admin/skills/publish/route.ts')
assert.ok(route.indexOf('!isOwnerPublishAuthorized(request)') < route.indexOf('request.text()'))
assert.match(route, /no-store/)
assert.match(route, /export async function GET/)
assert.match(route, /select\('request_id', \{ head: true \}\)/)
const sql = source('supabase/migrations/20260907165513_owner_skill_publication.sql')
assert.match(sql, /security invoker/)
assert.match(sql, /current_user <> 'service_role'/)
assert.match(sql, /revoke all on function public.publish_owner_skill.*from public, anon, authenticated/)
assert.match(sql, /previous_review/)
assert.match(sql, /replayed/)
assert.doesNotMatch(sql, /update public.skill_submissions/)
assert.doesNotMatch(sql, /^\s*ai_review_approved\s*=\s*true/m)
assert.match(source('app/skills/[slug]/page.tsx'), /<OwnerPublicationNote/)
console.log('Owner publication tests passed: authorization, strict input, pinned source, no LLM, no DB writes on dry-run, private-source protection, truthful trust/safety and unchanged user gates.')
