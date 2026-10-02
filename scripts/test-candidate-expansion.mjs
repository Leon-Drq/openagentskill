import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { buildCandidateSourceKey, canonicalGitHubSourceUrl } from '../lib/indexer/candidate-identity.ts'

// Execute the real validator against a fake queue: directory references must
// expand without reusing the parent's URL; exact documents validate in place.
const source = readFileSync('lib/indexer/candidate-intake.ts', 'utf8')
const fragment = source.slice(source.indexOf('async function buildSkillCandidateRow'), source.indexOf('export async function runCandidateValidationBatch'))
const code = ts.transpileModule(fragment, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const repository = { id: 123, fullName: 'owner/repo', owner: 'owner', repo: 'repo', stars: 20, license: 'MIT' }
const skill = { ref: 'main', path: 'skills/demo/SKILL.md', sourceUrl: 'https://github.com/owner/repo/tree/main/skills/demo', document: '# Demo', frontmatter: { name: 'demo', description: 'A demo', license: 'MIT' } }
const inserted = [], updates = []
const deps = {
  contentHash: () => 'hash', buildCandidateSourceKey, canonicalGitHubSourceUrl,
  getLicenseEvidence: () => ({ status: 'detected', license: 'MIT' }),
  findDuplicateContent: async () => null,
  fetchSkillPackageSnapshot: async () => { throw new Error('20-star candidates require ordinary review') },
  evaluateFastTrackCandidate: () => ({ eligible: false, riskLevel: 'low', reasons: ['Review required'], hasExecutableFiles: false }),
  parseGitHubSkillReference: () => ({ owner: 'owner', repo: 'repo' }),
  validateGitHubRepo: async () => repository, meetsAutomaticDiscoveryStarFloor: () => true,
  AUTOMATIC_DISCOVERY_MIN_STARS: 20,
  discoverGitHubSkills: async () => ({ skills: [skill], tree: [], truncated: false }),
  insertExpandedCandidate: async row => { inserted.push(row); return [{ id: 'child', status: row.status }] },
  updateCandidate: async (id, values) => updates.push({ id, values }),
  isGitHubRateLimitError: () => false, analysisRetryDelayMs: () => 1000,
}
const validate = new Function(...Object.keys(deps), code + ';return validateRepositoryCandidate')(...Object.values(deps))
const parent = { id: 'parent', source_key: buildCandidateSourceKey(123, 'owner/repo', 'skills/demo'), canonical_source_url: skill.sourceUrl, github_full_name: 'owner/repo', attempt_count: 1 }
const result = await validate(parent)
assert.equal(result.errors, 0)
assert.equal(result.reviewRequired, 1)
assert.equal(inserted.length, 1)
assert.equal(inserted[0].canonical_source_url, 'https://github.com/owner/repo/blob/main/skills/demo/SKILL.md')
assert.notEqual(inserted[0].canonical_source_url, parent.canonical_source_url)
assert.equal(updates.at(-1).values.status, 'expanded')
inserted.length = 0; updates.length = 0
const exact = { ...parent, source_key: buildCandidateSourceKey(123, 'owner/repo', skill.path), canonical_source_url: canonicalGitHubSourceUrl('owner/repo', 'main', skill.path) }
const exactResult = await validate(exact)
assert.equal(exactResult.errors, 0)
assert.equal(exactResult.reviewRequired, 1)
assert.equal(inserted.length, 0, 'An exact document must not conflict with its own source key')
assert.equal(updates.length, 1)
assert.equal(updates[0].id, 'parent')
assert.equal(updates[0].values.status, 'review_required')
assert.equal(updates[0].values.requires_ai_review, true)
assert.equal(updates[0].values.fast_track_eligible, false)
console.log('Candidate expansion: distinct document URLs and in-place exact-source validation preserve review gates.')
