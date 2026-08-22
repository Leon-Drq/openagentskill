import assert from 'node:assert/strict'

// Node's type-stripping runner needs the explicit extension.
// @ts-expect-error TS5097 is expected for this standalone Node test entrypoint.
import { SkillSubmissionSchema } from '../lib/schema/skill-schema.ts'

const validSubmission = {
  name: 'Secure repository skill',
  version: '1.0.0',
  description: 'A sufficiently detailed description for schema validation.',
  repository: 'https://github.com/openagentskill/example-skill',
  author: { name: 'OpenAgentSkill' },
  category: 'security',
  tags: ['security'],
  license: 'MIT',
  language: ['TypeScript'],
  compatibility: [{ platform: 'Codex' }],
  usage: { install: 'Install from the reviewed repository.' },
}

assert.equal(SkillSubmissionSchema.safeParse(validSubmission).success, true)

for (const repository of [
  'https://github.com.evil.example/owner/repo',
  'https://evil.example/github.com/owner/repo',
  'https://github.com@evil.example/owner/repo',
  'http://github.com/owner/repo',
  'https://github.com/owner',
]) {
  const result = SkillSubmissionSchema.safeParse({ ...validSubmission, repository })
  assert.equal(result.success, false, `expected rejection for ${repository}`)
}

console.log('Security regression tests passed.')
