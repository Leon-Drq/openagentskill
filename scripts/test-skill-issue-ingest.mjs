import assert from 'node:assert/strict'
import {
  AUTOMATION_MARKER,
  buildFailureComment,
  buildResultComment,
  chooseSkillCandidate,
  extractGitHubSource,
  extractSuggestedTags,
  isNewSkillRequest,
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

console.log('Skill Issue ingestion tests passed.')
