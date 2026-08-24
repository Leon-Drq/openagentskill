import assert from 'node:assert/strict'
// Node's type-stripping runner needs the explicit extension; the app compiler resolves the same module by alias.
// @ts-expect-error TS5097 is expected for this standalone Node test entrypoint.
import { getGitHubAvatarUrl, getGitHubOwner, getGitHubOwnerUrl } from '../lib/github-owner.ts'

assert.equal(getGitHubOwner({ github_repo: 'furkankly/zoetrope' }), 'furkankly')
assert.equal(
  getGitHubOwner({ repository: 'https://github.com/Leon-Drq/openagentskill/tree/main/skills/example' }),
  'Leon-Drq'
)
assert.equal(getGitHubOwner({ publisher_github: '@openai' }), 'openai')
assert.equal(getGitHubOwner({ author_url: 'https://x.com/openagentskill' }), '')
assert.equal(getGitHubOwner({ github_repo: 'topics/agent-skills' }), '')
assert.equal(getGitHubOwnerUrl('Leon-Drq'), 'https://github.com/Leon-Drq')
assert.equal(getGitHubAvatarUrl('Leon-Drq', 12), 'https://github.com/Leon-Drq.png?size=32')

console.log('GitHub owner identity tests passed')
