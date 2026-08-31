import assert from 'node:assert/strict'

// Node's type-stripping runner needs the explicit extension.
// @ts-expect-error TS5097 is expected for this standalone Node test entrypoint.
import { SkillSubmissionSchema } from '../lib/schema/skill-schema.ts'
// @ts-expect-error TS5097 is expected for this standalone Node test entrypoint.
import { isMcpOnlySkillRecord } from '../lib/skills/registry-scope.ts'

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

assert.equal(isMcpOnlySkillRecord({
  name: 'Plugin Scanner',
  description: 'Scans Agent Skills and MCP servers before installation.',
  category: 'security',
  tags: ['mcp-security', 'agent-skill'],
  github_repo: 'hashgraph-online/hol-guard-plugin',
}), false, 'security skills that mention MCP must remain visible')

assert.equal(isMcpOnlySkillRecord({
  name: 'MCP Server for Example API',
  description: 'A Model Context Protocol transport.',
  category: 'integration',
  tags: ['mcp-server'],
  github_repo: 'example/example-mcp-server',
}), true, 'MCP-only servers must remain excluded')

assert.equal(isMcpOnlySkillRecord({
  name: 'MCP Builder Skill',
  description: 'A reusable Agent Skill for reviewing MCP integrations.',
  category: 'developer-tools',
  tags: ['agent-skill'],
  github_repo: 'example/mcp-builder-skill',
}), false, 'explicit Agent Skills must not be hidden by MCP identity terms')

console.log('Security regression tests passed.')
