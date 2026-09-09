import assert from 'node:assert/strict'
import { registerHooks, createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

// All external dependencies are replaced in this process. Never reads credentials,
// calls a real model, or inserts a production submission.
const require = createRequire(import.meta.url)
const rows = new Map(), skills = new Map(), calls = []
let failure = false, denyReview = false, staticFailure = false, clock = 0
const clone = value => value == null ? value : structuredClone(value)
function query(table) {
  let op = 'select', values, selected = false, options = {}, take = Infinity
  const filters = []
  const chain = {
    select(_columns, opts) { selected = true; options = opts || {}; return chain },
    eq(key, value) { filters.push(row => row[key] === value); return chain },
    gte() { return chain }, order() { return chain },
    limit(n) { take = n; return chain },
    or(expression) {
      if (expression.startsWith('status.eq.submitted')) filters.push(row => row.status === 'submitted' || row.status === 'processing' && Date.parse(row.updated_at) < Date.now() - 600000)
      else if (expression.startsWith('ai_review_approved')) filters.push(row => row.ai_review_approved === true || ['static_checked', 'owner_published'].includes(row.listing_status))
      return chain
    },
    update(value) { op = 'update'; values = value; return chain },
    insert(value) { op = 'insert'; values = value; return chain },
    async execute(single = false) {
      calls.push({ table, op })
      const store = table === 'skills' ? skills : rows
      if (table === 'activity_feed') return { data: null, error: null }
      if (op === 'insert') {
        const id = values.id || `skill-${skills.size}`
        if (store.has(id)) return { data: null, error: { code: '23505' } }
        const row = { id, ...clone(values), updated_at: new Date(Date.now() + ++clock).toISOString() }
        store.set(id, row)
        return { data: selected ? clone(row) : null, error: null }
      }
      let found = [...store.values()].filter(row => filters.every(filter => filter(row))).slice(0, take)
      if (op === 'update') found.forEach(row => Object.assign(row, clone(values), { updated_at: new Date(Date.now() + ++clock).toISOString() }))
      found = found.map(row => ({ ...clone(row), skills: row.skill_id ? clone(skills.get(row.skill_id)) : null }))
      return { data: options.head ? null : single ? found[0] || null : found, count: found.length, error: null }
    },
    maybeSingle() { return chain.execute(true) }, single() { return chain.execute(true) },
    then(resolve, reject) { return chain.execute().then(resolve, reject) },
  }
  return chain
}
const repo = { owner: 'fixture', repo: 'safe-skill', fullName: 'fixture/safe-skill', stars: 0, forks: 0, license: 'MIT', updatedAt: new Date().toISOString(), defaultBranch: 'main', hasReadme: false, hasSkillJson: false }
const commit = 'a'.repeat(40)
const skill = { owner: 'fixture', repo: 'safe-skill', ref: commit, path: 'SKILL.md', directory: '', sourceUrl: `https://github.com/fixture/safe-skill/blob/${commit}/SKILL.md`, document: 'Read the supplied draft and return a summary.', frontmatter: { name: 'Safe summary', description: 'Summarize a supplied draft.', tags: [], frameworks: [], license: 'MIT' } }
globalThis.__submissionTest = {
  db: { from: query, rpc: async () => ({ error: null }) },
  repository: async () => { calls.push('github'); if (failure) throw Error('offline'); return repo },
  discover: async () => { calls.push('discover'); if (failure) throw Error('offline'); return { skills: [skill], tree: [], truncated: false } },
  snapshot: async () => ({ files: [{ path: skill.path, content: skill.document }], fingerprint: 'test-package', truncated: false, hasUnreviewedFiles: false }),
  scan: () => ({ passed: !staticFailure, riskLevel: staticFailure ? 'critical' : 'low', issues: staticFailure ? ['Critical test finding'] : [] }),
  review: async () => { calls.push('review'); return { method: 'static', approved: !denyReview, decision: denyReview ? 'manual' : 'approved', scores: {}, totalScore: 0, issues: denyReview ? ['Review required'] : [], suggestions: [], reviewedAt: new Date().toISOString() } },
  after: [],
}
const mocks = {
  'server-only': 'export {}',
  '@/lib/supabase/admin': 'export const createAdminClient = () => globalThis.__submissionTest.db',
  '@/lib/supabase/server': 'export const createClient = async () => ({auth:{getUser:async()=>({data:{user:null}})}})',
  '@/lib/github/api': 'export const validateGitHubRepo = (...args) => globalThis.__submissionTest.repository(...args); export const fetchRepositoryCommitSha = async () => "' + commit + '"; export class GitHubAPIError extends Error {}',
  '@/lib/github/skill-source': 'export const parseGitHubSkillReference = () => ({owner:"fixture",repo:"safe-skill"}); export const discoverGitHubSkills = (...args)=>globalThis.__submissionTest.discover(...args); export const fetchSkillPackageSnapshot = (...args)=>globalThis.__submissionTest.snapshot(...args); export const fetchSkillVersionEvidence = async()=>({value:"Unknown"})',
  '@/lib/security/static-analysis': 'export const analyzeCode = (...args)=>globalThis.__submissionTest.scan(...args)',
  '@/lib/ai-review/reviewer': 'export const reviewSkill = (...args)=>globalThis.__submissionTest.review(...args)',
  // Publication policy itself has extensive separate regressions. Use an explicit
  // gate here to test queue/publication behavior without a model call.
  '@/lib/skills/submission-policy': 'export const evaluateSkillSubmissionPolicy = input=>({approved: input.review.approved, issues: input.review.issues, suggestions:[]})',
  'next/cache': 'export const revalidatePath=()=>{}; export const revalidateTag=()=>{}',
  'next/server': `import real from ${JSON.stringify(pathToFileURL(require.resolve('next/server')).href)}; export const {NextRequest,NextResponse}=real; export const after=fn=>globalThis.__submissionTest.after.push(fn);`,
}
registerHooks({
  resolve(specifier, context, next) {
    if (Object.hasOwn(mocks, specifier)) return { url: `submission-mock:${specifier}`, shortCircuit: true }
    if (specifier.startsWith('@/')) return { url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true }
    return next(specifier, context)
  },
  load(url, context, next) {
    if (url.startsWith('submission-mock:')) return { format: 'module', source: mocks[url.slice(16)], shortCircuit: true }
    if (url.startsWith('file:') && url.endsWith('.ts')) return { format: 'module', source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText, shortCircuit: true }
    return next(url, context)
  },
})
globalThis.fetch = () => { throw Error('External network forbidden in submission tests') }
const contract = await import('../lib/skills/submission-contract.ts')
const { createOpenSubmission, findSubmissionReceipt, submissionIdForToken } = await import('../lib/skills/open-submission.ts')
const { processSubmissionJob, runSubmissionQueue } = await import('../lib/skills/submission-worker.ts')
const { POST } = await import('../app/api/skills/submit/route.ts')
const { GET } = await import('../app/api/skills/submissions/[id]/route.ts')
const { NextRequest } = await import('next/server')
const input = { repository: repo, skill, submissionSource: 'web', requestFingerprint: 'test', codeFiles: [], receiptToken: 'b'.repeat(48), makerGithub: 'curator' }
for (const [value, provider, expected] of [['https://github.com/octocat','github','octocat'], ['@maker','x','maker'], ['https://x.com/maker?s=20','x','maker'], ['twitter.com/maker','x','maker']]) assert.equal(contract.normalizeSocialHandle(value, provider), expected)
for (const [value, provider] of [['https://evil.com/maker','github'], ['https://github.com/a/b','github'], ['https://x.com/maker','github'], ['a b','x']]) assert.equal(contract.validSocialHandle(contract.normalizeSocialHandle(value, provider), provider), false)
assert.equal(contract.validSocialHandle('', 'github'), true)
const receipt = await createOpenSubmission(input)
assert.equal(receipt.status, 'submitted')
assert.equal(rows.size, 1)
assert.equal(rows.get(receipt.id).submitter_github, 'curator')
assert.equal(rows.get(receipt.id).validation_result.repository_owner, 'fixture')
assert.equal(rows.get(receipt.id).identity_verified, false)
assert.deepEqual(await createOpenSubmission(input), receipt)
assert.equal(rows.size, 1, 'Retry must reuse row and token')
await assert.rejects(findSubmissionReceipt(input.receiptToken, 'different/repo', 'SKILL.md'))
assert.equal(contract.validReceipt({ ...receipt, statusUrl: '' }), true)
assert.equal(contract.validReceipt({ ...receipt, status: 'invented' }), false)
const settled = await Promise.all([processSubmissionJob(receipt.id), processSubmissionJob(receipt.id)])
assert.deepEqual(settled.sort(), ['processed', 'skipped'])
assert.equal(calls.filter(x => x === 'review').length, 1, 'Atomic claim must prevent duplicate reviews')
assert.equal(rows.get(receipt.id).status, 'reviewed')
assert.equal(skills.size, 1)
assert.equal([...skills.values()][0].author_name, 'fixture', 'Curator must not become repository author')
assert.equal([...skills.values()][0].ai_review_approved, false, 'Static checks are not AI review')
assert.equal([...skills.values()][0].listing_status, 'static_checked')

async function status(id = receipt.id, token = receipt.token) {
  const response = await GET(new NextRequest(`http://localhost/api/skills/submissions/${id}`, { headers: { Authorization: `Bearer ${token}` } }), { params: Promise.resolve({ id }) })
  return { response, body: await response.json() }
}
const publicStatus = await status()
assert.match(publicStatus.response.headers.get('cache-control'), /no-store/)
assert.ok(publicStatus.body.submission.skill.slug)
assert.ok(!JSON.stringify(publicStatus.body).includes(receipt.token))
assert.ok(!JSON.stringify(publicStatus.body).includes('status_token_hash'))
assert.equal((await status(receipt.id, 'f'.repeat(48))).response.status, 404)
for (const state of ['submitted', 'processing', 'listed', 'quarantined', 'rejected']) {
  const share = contract.submissionShare({ ...publicStatus.body.submission, status: state })
  if (['quarantined','rejected'].includes(state)) assert.equal(share, null)
  else { assert.equal(share.published, false); assert.match(share.text, /for review/); assert.ok(!share.intent.includes(receipt.token)); assert.equal(share.url, 'https://www.openagentskill.com/submit') }
}
assert.equal(contract.submissionShare(publicStatus.body.submission).published, true)
const storedSkill = [...skills.values()][0]
storedSkill.listing_status = 'quarantined'
assert.equal((await status()).body.submission.skill.slug, null, 'Do not link to nonpublic duplicate rows')
storedSkill.listing_status = 'static_checked'
for (const state of ['reviewed','duplicate','quarantined','rejected','listed','approved']) {
  rows.get(receipt.id).status = state
  const before = calls.filter(x => x === 'review').length
  assert.equal(await processSubmissionJob(receipt.id), 'skipped')
  assert.equal(calls.filter(x => x === 'review').length, before)
}
rows.clear(); skills.clear(); failure = true
await createOpenSubmission(input)
for (let attempt = 1; attempt <= 3; attempt++) {
  assert.equal(await processSubmissionJob(receipt.id), attempt === 3 ? 'manual_review' : 'retry_scheduled')
  assert.equal(rows.get(receipt.id).validation_result.queue.attempts, attempt)
  if (attempt < 3) {
    assert.equal(await processSubmissionJob(receipt.id), 'skipped', 'Backoff must not call GitHub again')
    Object.assign(rows.get(receipt.id), { review_started_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' })
  }
}
assert.equal(rows.get(receipt.id).status, 'listed')
assert.equal(rows.get(receipt.id).ai_review_result.approved, false)
assert.equal(skills.size, 0)
rows.clear(); failure = false; denyReview = true
await createOpenSubmission(input)
assert.equal(await processSubmissionJob(receipt.id), 'processed')
assert.equal(rows.get(receipt.id).status, 'listed', 'Rejected review cannot publish')
assert.equal(skills.size, 0)
rows.clear(); denyReview = false; staticFailure = true
assert.equal((await createOpenSubmission(input)).status, 'quarantined')
assert.equal(await processSubmissionJob(receipt.id), 'skipped')
rows.clear(); staticFailure = false
await createOpenSubmission(input)
rows.get(receipt.id).source_ref = 'main'
assert.equal(await processSubmissionJob(receipt.id), 'manual_review', 'Legacy mutable source cannot auto-publish')
assert.equal(skills.size, 0)

rows.clear(); await createOpenSubmission(input)
const replayBody = { repository: repo.fullName, skillPath: skill.path, receiptToken: receipt.token, tags: [] }
const beforeReplay = calls.filter(x => x === 'github' || x === 'discover').length
const replay = await POST(new NextRequest('http://localhost/api/skills/submit', { method:'POST', body:JSON.stringify(replayBody) }))
assert.equal(replay.status, 202)
assert.equal(calls.filter(x => x === 'github' || x === 'discover').length, beforeReplay, 'Idempotent replay must not call GitHub or spend model tokens')
const invalid = await POST(new NextRequest('http://localhost/api/skills/submit', { method:'POST', body:JSON.stringify({...replayBody,makerGithub:'https://evil.com/a'}) }))
assert.equal(invalid.status, 400)
assert.equal((await invalid.json()).issues[0].path, 'makerGithub')
const malformed = await POST(new NextRequest('http://localhost/api/skills/submit', { method:'POST', body:'{' }))
assert.equal(malformed.status, 400)
rows.get(receipt.id).review_started_at = '2026-01-01T00:00:00Z'
rows.get(receipt.id).updated_at = '2026-01-01T00:00:00Z'
rows.get(receipt.id).status = 'processing'
assert.equal((await runSubmissionQueue()).processed, 1)
const completed = rows.get(receipt.id)
Object.assign(completed, { status: 'processing', review_started_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', validation_result: { ...completed.validation_result, queue: { attempts: 3 } } })
const readsBefore = calls.filter(x => x === 'discover').length
assert.equal(await processSubmissionJob(receipt.id), 'manual_review')
assert.equal(completed.validation_result.queue.attempts, 3, 'Recovering a killed final attempt must not create a fourth attempt')
assert.equal(calls.filter(x => x === 'discover').length, readsBefore)
process.env.NODE_ENV = 'production'
process.env.CRON_SECRET = 'submission-test-only-cron'
const { GET: cron } = await import('../app/api/cron/skill-submissions/route.ts')
const beforeUnauthorized = calls.length
assert.equal((await cron(new NextRequest('http://localhost/api/cron/skill-submissions'))).status, 401)
assert.equal(calls.length, beforeUnauthorized, 'Anonymous cron calls must not touch the queue')
assert.equal((await cron(new NextRequest('http://localhost/api/cron/skill-submissions', { headers: {Authorization:'Bearer submission-test-only-cron'} }))).status, 200)
const { POST: validate } = await import('../app/api/skills/validate/route.ts')
const discovered = await validate(new NextRequest('http://localhost/api/skills/validate', {method:'POST',body:JSON.stringify({repository:repo.fullName})}))
assert.equal(discovered.status, 200)
assert.equal((await discovered.json()).skills[0].ref, commit, 'Validation results must identify an immutable revision')
assert.match(submissionIdForToken(receipt.token), /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-a[a-f0-9]{3}-[a-f0-9]{12}$/)
console.log('Submission flow passed: idempotency, atomic claims, bounded retry, immutable source, unchanged review gates, attribution, authenticated receipts, safe sharing and API validation. No external requests.')
