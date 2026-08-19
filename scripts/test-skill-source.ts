import assert from 'node:assert/strict'
// Node's type-stripping runner needs the explicit extension; the app compiler resolves the same module by alias.
// @ts-expect-error TS5097 is expected for this standalone Node test entrypoint.
import { detectSkillDelegationName, parseGitHubSkillReference, parseSkillDocument, selectSkillDocumentPaths } from '../lib/github/skill-source.ts'

assert.deepEqual(parseGitHubSkillReference('Leon-Drq/openagentskill'), {
  owner: 'Leon-Drq',
  repo: 'openagentskill',
  ref: null,
  path: null,
})

assert.deepEqual(
  parseGitHubSkillReference('https://github.com/acme/skills/tree/main/skills/research'),
  { owner: 'acme', repo: 'skills', ref: 'main', path: 'skills/research' }
)

assert.deepEqual(
  parseGitHubSkillReference('https://raw.githubusercontent.com/acme/skills/v2/skills/research/SKILL.md'),
  { owner: 'acme', repo: 'skills', ref: 'v2', path: 'skills/research/SKILL.md' }
)

assert.equal(parseGitHubSkillReference('https://example.com/acme/skills'), null)

assert.deepEqual(
  parseSkillDocument(`---
name: research-assistant
description: >
  Research a question with cited,
  primary sources.
tags: [research, citations]
frameworks: [Codex, Claude Code]
---

# Research Assistant
`),
  {
    name: 'research-assistant',
    description: 'Research a question with cited, primary sources.',
    version: undefined,
    license: undefined,
    author: undefined,
    category: undefined,
    tags: ['research', 'citations'],
    frameworks: ['Codex', 'Claude Code'],
  }
)

assert.equal(parseSkillDocument('# Missing frontmatter and useful description'), null)

assert.equal(
  detectSkillDelegationName('Call the Skill tool with "grilling".'),
  'grilling'
)
assert.equal(
  detectSkillDelegationName('Use the Skill tool with `taste-review` to continue.'),
  'taste-review'
)
assert.equal(detectSkillDelegationName('This skill has complete standalone instructions.'), null)

assert.deepEqual(
  selectSkillDocumentPaths([
    { path: 'README.md', type: 'blob' },
    { path: 'skills/research/SKILL.md', type: 'blob' },
    { path: 'skills/productivity/grill-me/SKILL.md', type: 'blob' },
    { path: '.agents/skills/test-desktop-app/SKILL.md', type: 'blob' },
    { path: 'nested/skill.md', type: 'blob' },
    { path: 'skills/folder/SKILL.md', type: 'tree' },
  ]),
  [
    '.agents/skills/test-desktop-app/SKILL.md',
    'nested/skill.md',
    'skills/productivity/grill-me/SKILL.md',
    'skills/research/SKILL.md',
  ]
)

assert.deepEqual(
  selectSkillDocumentPaths([
    { path: 'skills/taste-review/SKILL.md', type: 'blob' },
    { path: 'skills/simplify/SKILL.md', type: 'blob' },
    { path: '.agents/skills/test-desktop-app/SKILL.md', type: 'blob' },
  ], '.agents/skills/test-desktop-app'),
  ['.agents/skills/test-desktop-app/SKILL.md']
)

console.log('skill source parser tests passed')
