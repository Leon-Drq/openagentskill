import assert from 'node:assert/strict'
import { register } from 'node:module'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { resolveSkillVersion } = await import('../lib/skills/version-evidence.ts')
const { inferEditorialTaxonomy } = await import('../lib/skills/editorial-taxonomy.ts')
const { getUseCasesForSkill } = await import('../lib/use-cases.ts')
const input = { name: 'gc-minimal-zine-poster-v0-3', path: 'SKILL.md', ref: 'a'.repeat(40) }
assert.equal(resolveSkillVersion({ ...input, document: '---\nname: example\n---\n\n# Minimal Zine Poster v0.3.1\n' }).value, 'v0.3.1')
assert.equal(resolveSkillVersion({ ...input, document: '# Minimal Zine Poster v0.3.1\n' }).source, 'skill_heading')
assert.equal(resolveSkillVersion({ ...input, declared: '0.4', document: '# Minimal Zine Poster v0.3.1' }).value, '0.4')
for (const document of ['# Node v24.1\n', '# Instructions\n\n# Minimal Zine Poster v0.3.1', '```\n# Minimal Zine Poster v0.3.1\n```']) {
  assert.equal(resolveSkillVersion({ ...input, document }).value, null)
}
assert.equal(resolveSkillVersion(input).value, null, 'never infer a release from the invocation name')
const skill = { ...input, slug: 'fixture-poster', description: 'Generate minimal zine posters and editorial images.', tags: [], github_stars: 7022, quality_score: 100, long_description: 'Codex UI metadata. Test the browser, install from GitHub and review source code. Search and extract reference analysis.' }
const taxonomy = inferEditorialTaxonomy(skill)
assert.equal(taxonomy.category, 'design-creative')
assert.ok(taxonomy.tags.includes('poster'))
assert.equal(inferEditorialTaxonomy({ ...skill, category: 'creative' }).category, 'creative', 'respect explicit source classification')
assert.equal(inferEditorialTaxonomy({ name: 'unknown', description: 'A helper', tags: [] }).category, 'developer-tools')
const uses = getUseCasesForSkill({ ...skill, ...taxonomy })
assert.equal(uses[0].slug, 'design-creative')
assert.ok(!uses.some(use => ['browser-automation', 'coding-agents', 'web-scraping'].includes(use.slug)))
console.log('editorial source metadata tests passed')
