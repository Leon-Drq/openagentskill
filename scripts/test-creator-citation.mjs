import assert from 'node:assert/strict'
import { creatorCitation } from '../lib/creator-citation.ts'

const canonical = 'https://www.openagentskill.com/skills/test-skill'
for (const input of ['test-skill', canonical, 'https://openagentskill.com/skills/test-skill/?utm_source=example#install']) {
  const result = creatorCitation(input, 'Test skill')
  assert.equal(result.url, canonical)
  assert.equal(result.markdown, `[Test skill on OpenAgentSkill](${canonical})`)
  assert.ok(!result.html.includes('utm_'))
}
for (const input of ['', '../admin', 'javascript:alert(1)', 'https://openagentskill.com.evil.example/skills/test-skill',
  'https://openagentskill.com@evil.example/skills/test-skill', 'https://user@openagentskill.com/skills/test-skill',
  'https://openagentskill.com:8080/skills/test-skill', 'https://openagentskill.com/api/secret',
  'https://openagentskill.com/skills/a%2fb', 'https://openagentskill.com/skills/a/b', '<script>', 'a'.repeat(201)]) {
  assert.equal(creatorCitation(input, 'Name'), null, input)
}
const escaped = creatorCitation('test-skill', '<img src=x onerror=alert(1)> & [x](https://evil.example)')
assert.ok(!escaped.html.includes('<img'))
assert.ok(escaped.html.includes('&lt;img'))
assert.ok(escaped.markdown.includes('\\[x\\]'))
assert.ok(escaped.markdown.startsWith('[\\<img'))
console.log('Creator citations: canonical URLs, rejected deceptive hosts/paths and escaped labels passed.')
