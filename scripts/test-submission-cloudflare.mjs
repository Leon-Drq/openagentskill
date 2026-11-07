import assert from 'node:assert/strict'
import { register, registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { sqliteD1 } from './fixtures/sqlite-d1.mjs'
import { createHash } from 'node:crypto'

// Only replace the request-context factory. Queries, token checks, the status
// route and the D1 transport are real; there is no model or production access.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '@/lib/supabase/admin') return {
      url: 'data:text/javascript,export const createAdminClient=()=>globalThis.__submissionD1Client', shortCircuit: true,
    }
    return next(specifier, context)
  },
})
register('./test-payments-loader.mjs', import.meta.url)
const { createD1ServiceFetch } = await import('../lib/db/cloudflare-service.ts')
const { createOpenSubmission } = await import('../lib/skills/open-submission.ts')
const { processSubmissionJob } = await import('../lib/skills/submission-worker.ts')
const { GET } = await import('../app/api/skills/submissions/[id]/route.ts')
const { NextRequest } = await import('next/server')
const { sqlite, database } = sqliteD1()
for (const name of ['0001_commerce','0002_auth','0003_business','0004_catalog','0005_account_profile','0006_telemetry','0007_quality','0008_outcomes','0009_skill_writes','0011_search_cost']) {
  sqlite.exec(readFileSync(new URL(`../cloudflare/migrations/data/${name}.sql`, import.meta.url), 'utf8'))
}
const transport = createD1ServiceFetch(database), reads = []
const client = createClient('https://d1.internal', 'fixture', {
  auth: { persistSession: false, autoRefreshToken: false }, db: { retry: false },
  global: { fetch: (url, init) => { reads.push(new URL(url).pathname); return transport(url, init) } },
})
globalThis.__submissionD1Client = client
const originalFetch = globalThis.fetch
globalThis.fetch = () => { throw Error('External network forbidden') }
const token = 'b'.repeat(48), source = 'a'.repeat(40)
const document = '---\nname: fixture-skill\ndescription: Summarize supplied text.\nversion: 1.0.0\nlicense: MIT\n---\nRead the supplied text and summarize it.'
const check = async (id, receiptToken = token) => {
  const response = await GET(new NextRequest(`https://www.openagentskill.com/api/skills/submissions/${id}`, { headers: { Authorization: `Bearer ${receiptToken}` } }), { params: Promise.resolve({ id }) })
  const body = await response.json()
  assert.match(response.headers.get('cache-control'), /private, no-store/)
  assert.match(response.headers.get('x-robots-tag'), /noindex/)
  assert.ok(!JSON.stringify(body).includes(token))
  assert.ok(!JSON.stringify(body).includes('status_token_hash'))
  return { response, body }
}
try {
  const input = {
    repository: { owner: 'fixture', repo: 'nested', fullName: 'fixture/nested', stars: 0, forks: 0, defaultBranch: 'main', hasReadme: false, hasSkillJson: false, updatedAt: new Date().toISOString(), license: 'MIT' },
    skill: { owner: 'fixture', repo: 'nested', ref: source, path: 'skills/example/SKILL.md', directory: 'skills/example', sourceUrl: `https://github.com/fixture/nested/tree/${source}/skills/example`, document, frontmatter: { name: 'Fixture', description: 'Summarize supplied text.', tags: [], frameworks: [], version: '1.0.0', license: 'MIT' } },
    submissionSource: 'api', requestFingerprint: 'native-d1-fixture', receiptToken: token, codeFiles: [],
  }
  const receipt = await createOpenSubmission(input)
  assert.equal((await createOpenSubmission(input)).id, receipt.id)
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM skill_submissions').get().n, 1)
  const pending = await check(receipt.id)
  assert.equal(pending.response.status, 200, 'A durable D1 submission must have a readable receipt')
  assert.equal(pending.body.submission.status, 'submitted')
  assert.equal(pending.body.submission.skill.slug, null)
  globalThis.fetch = async url => {
    const request = new URL(url)
    assert.equal(request.origin, 'https://api.github.com', 'Never access an external provider or model')
    if (request.pathname.includes('/git/trees/')) return Response.json({ truncated: false, tree: [{ path: input.skill.path, type: 'blob', size: document.length, sha: createHash('sha1').update(`blob ${Buffer.byteLength(document)}\0${document}`).digest('hex') }] })
    assert.ok(request.pathname.endsWith('/contents/' + input.skill.path))
    return new Response(document)
  }
  assert.equal(await processSubmissionJob(receipt.id), 'processed')
  const completed = await check(receipt.id)
  assert.equal(completed.body.submission.status, 'listed', 'A completed manual review must not remain processing because timestamp precision differs')
  assert.equal(completed.body.submission.queue.attempts, 1)
  assert.equal(completed.body.submission.review.method, 'manual')
  assert.equal(await processSubmissionJob(receipt.id), 'skipped', 'Completed reviews must not be reprocessed')
  const leaseTime = sqlite.prepare('SELECT review_started_at FROM skill_submissions WHERE id=?').get(receipt.id).review_started_at
  const milliseconds = leaseTime.replace(/000Z$/, 'Z')
  const equalInstant = await client.from('skill_submissions').select('id').eq('review_started_at', milliseconds).maybeSingle()
  assert.equal(equalInstant.data.id, receipt.id)
  const afterInstant = await client.from('skill_submissions').select('id').gt('review_started_at', milliseconds)
  assert.deepEqual(afterInstant.data, [], 'Equal instants must not differ under range comparison either')
  const differentInstant = await client.from('skill_submissions').select('id').eq('review_started_at', leaseTime.replace(/000Z$/, '001Z')).maybeSingle()
  assert.equal(differentInstant.data, null, 'Preserve real microsecond differences')
  const invalidTime = await client.from('skill_submissions').select('id').eq('review_started_at', 'not-a-timestamp')
  assert.equal(invalidTime.status, 400)
  const stale = await client.from('skill_submissions').update({ status: 'quarantined' })
    .eq('id', receipt.id).eq('review_started_at', '2000-01-01T00:00:00.000Z').select('id').maybeSingle()
  assert.equal(stale.data, null, 'A different worker lease must still be fenced out')
  sqlite.prepare("INSERT INTO skills(id,slug,name,description,author_name,repository,github_repo,category,license,ai_review_approved,listing_status) VALUES ('fixture-listing','fixture-public','Fixture','Fixture','fixture','https://github.com/fixture/nested','fixture/nested','developer-tools','MIT',0,'static_checked')").run()
  sqlite.prepare("UPDATE skill_submissions SET skill_id='fixture-listing',status='reviewed' WHERE id=?").run(receipt.id)
  const published = await check(receipt.id)
  assert.equal(published.response.status, 200)
  assert.equal(published.body.submission.skill.slug, 'fixture-public')
  assert.equal(published.body.submission.review.approved, false, 'A static fixture does not acquire AI review approval')
  const before = reads.filter(path => path.endsWith('/skills')).length
  assert.equal((await check(receipt.id, 'f'.repeat(48))).response.status, 404)
  assert.equal(reads.filter(path => path.endsWith('/skills')).length, before, 'Authenticate before reading related listings')
  sqlite.prepare("UPDATE skills SET listing_status='quarantined' WHERE id='fixture-listing'").run()
  assert.equal((await check(receipt.id)).body.submission.skill.slug, null)
  assert.equal((await check('00000000-0000-4000-8000-000000000001')).response.status, 404)
  globalThis.__submissionD1Client = { from() { throw new Error('private database details') } }
  const unavailable = await check(receipt.id)
  assert.equal(unavailable.response.status, 503)
  assert.ok(!JSON.stringify(unavailable.body).includes('private database'))
  console.log('Native D1 submission passed: durable intake/receipts, real worker completion, canonical timestamp comparisons, stale lease fencing, unchanged review gates, authenticated lookup and private failures.')
} finally {
  globalThis.fetch = originalFetch
  delete globalThis.__submissionD1Client
  sqlite.close()
}
