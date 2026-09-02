import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'

// @ts-expect-error TS5097 is expected for this standalone test entrypoint.
import { isSearchIndexEligible } from '../lib/seo/search-indexability.ts'
// @ts-expect-error TS5097 is expected for this standalone test entrypoint.
import { changedPathsFromPush, isAgentSkillSourcePath, pushTouchesAgentSkill, verifyGitHubWebhookSignature } from '../lib/github/webhook.ts'

const baseSkill = {
  ai_review_approved: true,
  quality_score: 70,
  github_stars: 0,
  publisher_verified: false,
}

assert.equal(isSearchIndexEligible(baseSkill), false, 'unclaimed zero-star skills stay out of search')
assert.equal(isSearchIndexEligible({ ...baseSkill, publisher_verified: true }), true, 'verified ownership replaces only the star floor')
assert.equal(isSearchIndexEligible({ ...baseSkill, publisher_verified: true, quality_score: 49 }), false, 'ownership never bypasses quality')
assert.equal(isSearchIndexEligible({ ...baseSkill, publisher_verified: true, ai_review_approved: false }), false, 'ownership never bypasses review')

assert.equal(isAgentSkillSourcePath('SKILL.md'), true)
assert.equal(isAgentSkillSourcePath('skills/design/SKILL.md'), true)
assert.equal(isAgentSkillSourcePath('README.md'), false)
const push = {
  commits: [{ added: [], modified: ['skills/design/SKILL.md'], removed: ['old.txt'] }],
}
assert.deepEqual(changedPathsFromPush(push), ['skills/design/SKILL.md', 'old.txt'])
assert.equal(pushTouchesAgentSkill(push), true)
assert.equal(pushTouchesAgentSkill({ commits: [{ modified: ['README.md'] }] }), false)

const secret = 'creator-growth-test-secret'
const payload = JSON.stringify(push)
const signature = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`
assert.equal(verifyGitHubWebhookSignature(payload, signature, secret), true)
assert.equal(verifyGitHubWebhookSignature(`${payload}x`, signature, secret), false)
assert.equal(verifyGitHubWebhookSignature(payload, null, secret), false)

const creatorPage = readFileSync(new URL('../app/creators/[username]/page.tsx', import.meta.url), 'utf8')
assert.match(creatorPage, /'@type': 'ProfilePage'/, 'creator pages must identify the page as a ProfilePage')
assert.match(creatorPage, /mainEntity: creatorLd/, 'ProfilePage must name its creator main entity')

const claimPanel = readFileSync(new URL('../components/claim-skill-panel.tsx', import.meta.url), 'utf8')
assert.match(claimPanel, /intent=claim/, 'claim auth must preserve creator intent')
assert.match(claimPanel, /skill_claim_verified/, 'claim completion must emit the growth event')

const analytics = readFileSync(new URL('../lib/analytics.ts', import.meta.url), 'utf8')
for (const event of [
  'creator_github_connected',
  'skill_claim_verified',
  'creator_profile_published',
  'creator_badge_copy',
  'creator_share_open',
]) {
  assert.ok(analytics.includes(`'${event}'`), `analytics contract must include ${event}`)
}

const outreachBatch = readFileSync(new URL('../app/api/creator-outreach/batch/route.ts', import.meta.url), 'utf8')
assert.match(outreachBatch, /automatic_sending: false/, 'creator outreach cohorts must stay draft-only')
assert.match(outreachBatch, /isAutomationAuthorized/, 'creator outreach cohorts must require automation authorization')

console.log('Creator growth regression tests passed.')
