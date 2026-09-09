import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  AUTOMATION_MARKER,
  buildFailureComment,
  buildResultComment,
  chooseSkillCandidate,
  extractGitHubSource,
  extractSuggestedTags,
  isNewSkillRequest,
  parseMaintainerCommand,
  processSkillIssue,
  reviewAttemptDecision,
} from './process-skill-issue.mjs'

const issueBody = `## Public repository, subdirectory, or SKILL.md URL

https://github.com/musoyangrigor/scroll-video-website-skill/tree/main/scroll-video-website

## Request type

- New Skill

## Requested metadata

**Suggested tags:** \`frontend\`, \`scroll-animation\`, \`video\`, \`frontend\`
`

assert.equal(
  extractGitHubSource(issueBody),
  'https://github.com/musoyangrigor/scroll-video-website-skill/tree/main/scroll-video-website'
)
assert.deepEqual(extractSuggestedTags(issueBody), ['frontend', 'scroll-animation', 'video'])
assert.equal(isNewSkillRequest(issueBody), true)
assert.equal(isNewSkillRequest('## Request type\n\n- Metadata correction'), false)
assert.equal(extractGitHubSource('## Public repository, subdirectory, or SKILL.md URL\n\nhttps://example.com/nope'), null)

const currentTemplateBody = issueBody.replace('## Requested metadata', '## Requested metadata or safety correction')
assert.deepEqual(extractSuggestedTags(currentTemplateBody), ['frontend', 'scroll-animation', 'video'])

const skills = [
  { path: 'one/SKILL.md', sourceUrl: 'https://github.com/example/repo/tree/main/one' },
  { path: 'two/SKILL.md', sourceUrl: 'https://github.com/example/repo/tree/main/two' },
]
assert.equal(chooseSkillCandidate(skills, 'https://github.com/example/repo/tree/main/two'), skills[1])
assert.equal(chooseSkillCandidate(skills, 'https://github.com/example/repo'), null)
assert.equal(chooseSkillCandidate([skills[0]], 'https://github.com/example/repo'), skills[0])

const published = buildResultComment({
  status: 'reviewed',
  skill: { name: 'Example', slug: 'example-skill' },
  apiBaseUrl: 'https://www.openagentskill.com/',
})
assert.ok(published.includes(AUTOMATION_MARKER))
assert.match(published, /https:\/\/www\.openagentskill\.com\/skills\/example-skill/)

const queued = buildResultComment({
  status: 'listed',
  skill: { name: 'Example' },
  review: { issues: ['Needs manual review'] },
})
assert.match(queued, /remain open/)
assert.match(queued, /Needs manual review/)
assert.match(buildFailureComment('bad\ninput'), /bad input/)

const commit = 'a'.repeat(40)
assert.deepEqual(parseMaintainerCommand(`/oas review ${commit}`), { operation: 'review', revision: commit })
assert.equal(parseMaintainerCommand(`/oas review ${commit}; echo injected`), null)
assert.equal(parseMaintainerCommand('/oas review main'), null)
assert.equal(parseMaintainerCommand('Please /oas reconcile'), null)
const attempt = { repository: 'example/repo', path: 'one/SKILL.md', commit }
const attemptBody = `<!-- openagentskill-review-attempt:${JSON.stringify(attempt)} -->`
const history = [{ user: { login: 'github-actions[bot]' }, body: attemptBody, created_at: '2026-09-01T00:00:00Z' }]
assert.match(reviewAttemptDecision(history, attempt), /already submitted/)
assert.equal(reviewAttemptDecision([{ ...history[0], user: { login: 'attacker' } }], attempt), null)
assert.match(reviewAttemptDecision([{ ...history[0], created_at: new Date().toISOString() }], { ...attempt, commit: 'b'.repeat(40) }), /cooldown/)
assert.match(buildResultComment({ status: 'reviewed', skill: { slug: 'example' }, review: { method: 'static' } }), /not an AI review/)
assert.match(buildResultComment({ status: 'duplicate', skill: { slug: 'example', license: 'PolyForm-Noncommercial-1.0.0', reviewEvidence: { manual_reviewed: true } } }), /manual source review/)

const originalFetch = globalThis.fetch
const base = 'https://www.openagentskill.com'
const event = { action: 'created', issue: { number: 118, title: '[Skill]: Example', state: 'open', body: issueBody, user: { login: 'submitter' } }, comment: { body: `/oas review ${commit}`, user: { login: 'maintainer' } } }
let permission = 'write', publicSkill = null, status = 'reviewed', comments = [], calls = []
const sourceRepo = 'musoyangrigor/scroll-video-website-skill'
const candidate = { path: 'scroll-video-website/SKILL.md', ref: 'main', name: 'Example' }
const listedSkill = { name: 'Example', slug: 'example', repository: sourceRepo, path: candidate.path, commit, license: 'MIT', reviewEvidence: { static_checked: true } }
try {
  globalThis.fetch = async (url, options = {}) => {
    const target = new URL(url), method = options.method || 'GET'
    calls.push({ url: target.href, method, body: options.body })
    if (target.origin === base) assert.equal(options.headers?.Authorization, undefined, 'GitHub credentials must never reach the publication API')
    if (target.pathname.endsWith('/permission')) return Response.json({ permission })
    if (target.pathname.endsWith('/comments') && method === 'GET') return Response.json(comments)
    if (target.pathname.endsWith('/comments') && method === 'POST') return Response.json({ id: 123 })
    if (target.pathname.endsWith('/issues/118') && method === 'PATCH') return Response.json({ state: 'closed' })
    if (target.pathname === '/api/skills/validate') return Response.json({ skills: [candidate] })
    if (target.pathname === '/api/skills/lookup') return Response.json({ skill: publicSkill })
    if (target.pathname.includes('/commits/')) return Response.json({ sha: commit })
    if (target.pathname === '/api/skills/submit') {
      assert.equal(JSON.parse(options.body).sourceRef, commit)
      assert.equal(JSON.parse(options.body).makerGithub, undefined, 'issue reporter is not assumed to be the creator')
      publicSkill = status === 'reviewed' ? listedSkill : null
      return Response.json({ submission: { status, skill: { name: 'Example', slug: status === 'reviewed' ? 'example' : null }, review: { method: 'static' } } })
    }
    throw new Error(`Unexpected test request: ${target.href}`)
  }
  permission = 'read'
  assert.equal((await processSkillIssue({ event, repository: 'Leon-Drq/openagentskill', githubToken: 'fixture-token' })).skipped, true)
  assert.equal(calls.length, 1, 'untrusted comments must not validate, submit or write comments')
  permission = 'write'; calls = []
  assert.equal((await processSkillIssue({ event, repository: 'Leon-Drq/openagentskill', githubToken: 'fixture-token' })).status, 'reviewed')
  assert.equal(calls.filter(c => c.url.endsWith('/api/skills/submit')).length, 1)
  assert.equal(calls.filter(c => c.method === 'PATCH').length, 1, 'close only after confirmed publication')
  assert.ok(calls.findIndex(c => c.method === 'POST' && c.url.endsWith('/comments')) < calls.findIndex(c => c.url.endsWith('/api/skills/submit')), 'persist dedupe marker before submitting')
  calls = []
  await processSkillIssue({ event: { ...event, comment: { ...event.comment, body: '/oas reconcile' } }, repository: 'Leon-Drq/openagentskill', githubToken: 'fixture-token' })
  assert.equal(calls.filter(c => c.url.endsWith('/api/skills/submit')).length, 0, 'already-public reconciliation does not resubmit')
  publicSkill = null; calls = []; status = 'listed'
  await processSkillIssue({ event, repository: 'Leon-Drq/openagentskill', githubToken: 'fixture-token' })
  assert.equal(calls.filter(c => c.method === 'PATCH').length, 0, 'manual review keeps Issue open')
  calls = []; status = 'quarantined'
  await processSkillIssue({ event, repository: 'Leon-Drq/openagentskill', githubToken: 'fixture-token' })
  assert.equal(calls.filter(c => c.method === 'PATCH').length, 0, 'quarantine never closes as published')
  calls = []; comments = [{ ...history[0], body: `<!-- openagentskill-review-attempt:${JSON.stringify({ ...attempt, repository: sourceRepo, path: candidate.path })} -->` }]
  assert.equal((await processSkillIssue({ event, repository: 'Leon-Drq/openagentskill', githubToken: 'fixture-token' })).skipped, true)
  assert.equal(calls.filter(c => c.url.endsWith('/api/skills/submit')).length, 0, 'same source revision never gets another automatic review')
} finally { globalThis.fetch = originalFetch }
const scriptSource = readFileSync(new URL('./process-skill-issue.mjs', import.meta.url), 'utf8')
const scheduledSweep = scriptSource.slice(scriptSource.indexOf("if (process.env.GITHUB_EVENT_NAME === 'schedule')"), scriptSource.indexOf("if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch')"))
assert.ok(scheduledSweep.includes("operation: 'reconcile'"))
assert.ok(scheduledSweep.includes('.slice(0, 5)'))
assert.ok(!scheduledSweep.includes('/api/skills/submit'), 'daily reconciliation must not start paid reviews')

console.log('Skill Issue ingestion tests passed.')
