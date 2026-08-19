import assert from 'node:assert/strict'
// Node's type-stripping runner needs explicit extensions for these standalone tests.
// @ts-expect-error TS5097 is expected for this standalone Node test entrypoint.
import { getSearchTerms, normalizeExactSearchQuery } from '../lib/search-query.ts'
// @ts-expect-error TS5097 is expected for this standalone Node test entrypoint.
import { reconcileLicenseReviewFeedback } from '../lib/skills/license-review.ts'
// @ts-expect-error TS5097 is expected for this standalone Node test entrypoint.
import { estimateSubmissionQuality } from '../lib/skills/submission-quality.ts'
// @ts-expect-error TS5097 is expected for this standalone Node test entrypoint.
import { classifySearchMatch, isDirectSkillLookup } from '../lib/search-match.ts'
import type { SkillRecord } from '../lib/db/skills.ts'

assert.deepEqual(getSearchTerms('ip-as-logo'), ['ip', 'logo'])
assert.equal(normalizeExactSearchQuery('  ip-as-logo  '), 'ip-as-logo')

const feedback = reconcileLicenseReviewFeedback(
  'MIT',
  [
    'No explicit license file or license text is present in the repository.',
    'Commercial use requires confirmation.',
  ],
  [
    'Add a clear open-source license to the repository root.',
    'Add a concrete output example.',
  ]
)
assert.deepEqual(feedback.issues, ['Commercial use requires confirmation.'])
assert.deepEqual(feedback.suggestions, ['Add a concrete output example.'])

const quality = estimateSubmissionQuality({
  githubStars: 111,
  githubRepo: 's1dashu/ip-as-logo-skill',
  githubUpdatedAt: new Date().toISOString(),
  reviewTotal: 35,
  tags: ['agent-skill', 'logo', 'creative'],
})
assert.ok(quality.score >= 45, `Expected a useful initial quality score, received ${quality.score}`)
assert.equal(quality.signals.model, 'v2')

const searchSkill = {
  slug: 'bholmesdev-test-desktop-app',
  name: 'test-desktop-app',
  github_repo: 'bholmesdev/hubble.md',
  repository: 'https://github.com/bholmesdev/hubble.md/tree/main/.agents/skills/test-desktop-app',
  install_command: 'npx skills add bholmesdev/hubble.md --skill test-desktop-app',
} as unknown as SkillRecord

assert.equal(isDirectSkillLookup('test-desktop-app'), true)
assert.equal(isDirectSkillLookup('find a desktop testing skill'), false)
assert.equal(classifySearchMatch(searchSkill, 'test-desktop-app'), 'exact')
assert.equal(classifySearchMatch(searchSkill, 'desktop-app'), 'near')
assert.equal(classifySearchMatch(searchSkill, 'react-best-practices'), 'related')

console.log('Submission discovery regression tests passed.')
