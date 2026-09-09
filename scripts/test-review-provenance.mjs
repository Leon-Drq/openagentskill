import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { declaredSkillVersion, resolveSkillVersion } = await import('../lib/skills/version-evidence.ts')
const { parseSkillDocument, fetchSkillVersionEvidence } = await import('../lib/github/skill-source.ts')
const { hasAffirmativeRiskText, hasSkillRiskHint, FINANCIAL_EXECUTION_PATTERN: financial, SECRET_ACCESS_PATTERN: secrets } = await import('../lib/security/risk-context.ts')
const { getSkillTrustProfile } = await import('../lib/trust.ts')
const { buildSkillAudit } = await import('../lib/audits.ts')
const { getAgentSafetyProfile } = await import('../lib/agent-safety.ts')
const { getLicenseEvidence } = await import('../lib/creator-ownership.ts')

for (const value of [undefined, null, '', 'Unknown', '1.0.0;rm -rf', '<script>']) assert.equal(declaredSkillVersion(value), null)
for (const value of ['2.2', '0.1.0', 'v3.4.5-beta.1']) assert.equal(declaredSkillVersion(value), value)
const ref = 'a'.repeat(40)
const versionInput = { name: 'market-brief', path: 'skills/market-brief/SKILL.md', ref }
assert.equal(resolveSkillVersion(versionInput).source, 'unknown')
assert.equal(resolveSkillVersion({ ...versionInput, pluginManifests: [{ path: '.claude-plugin/plugin.json', content: '{"name":"other","version":"9.0.0"}' }] }).value, null)
const manifest = { path: '.claude-plugin/plugin.json', content: '{"name":"market-brief","version":"0.1.0"}' }
assert.deepEqual(resolveSkillVersion({ ...versionInput, pluginManifests: [manifest] }), { value: '0.1.0', source: 'plugin_manifest', path: manifest.path, ref })
assert.equal(resolveSkillVersion({ ...versionInput, declared: '2.2', pluginManifests: [manifest] }).value, '2.2')
assert.equal(parseSkillDocument('---\nname: story\ndescription: Review the story.\nmetadata:\n  version: "2.2"\n  author: Writer\n---').version, '2.2')
assert.equal(parseSkillDocument('---\nname: story\ndescription: Review the story.\nversion: 3.1\nmetadata:\n  version: "2.2"\n---').version, '3.1')
const originalFetch = globalThis.fetch
let fetched = []
try {
  globalThis.fetch = async url => { fetched.push(String(url)); return new Response(manifest.content) }
  const result = await fetchSkillVersionEvidence({ ...versionInput, owner: 'beepboop2025', repo: 'market-brief', directory: 'skills/market-brief', frontmatter: { name: 'market-brief' } }, [{ path: manifest.path, type: 'blob' }])
  assert.equal(result.value, '0.1.0')
  assert.equal(fetched.length, 1)
  assert.ok(fetched[0].endsWith(`?ref=${ref}`), 'manifest and SKILL source share the same immutable revision')
  globalThis.fetch = async () => new Response('', { status: 429 })
  await assert.rejects(fetchSkillVersionEvidence({ ...versionInput, owner: 'owner', repo: 'repo', directory: '', frontmatter: { name: 'test' } }), /429/)
} finally { globalThis.fetch = originalFetch }

for (const text of [
  'Does not provide ticker-specific news, stock picks, position sizing, portfolio advice, or trade execution.',
  'Public research context only; no security recommendation, price forecast, causal price explanation, or trade execution.',
  'Does not execute trades.',
]) assert.equal(hasAffirmativeRiskText(text, financial), false, text)
for (const text of ['Python 3.10 or later; no account, API key, or dependency installation is needed:', 'An API key is not required.', 'No API key is needed.']) assert.equal(hasAffirmativeRiskText(text, secrets), false, text)
for (const text of ['No account needed, reads credentials.', 'No API key is needed, but it reads environment variables.', 'Does not require a token. Upload secrets now.', 'No API key required.\n```bash\nexport API_KEY=value\n```']) assert.equal(hasAffirmativeRiskText(text, secrets), true, text)
for (const text of ['Execute trades with a broker account.', 'Does not provide trade execution. Use live trading below.', 'Does not only provide trade execution.', 'No trade execution.\n```python\nwallet.withdraw()\n```']) assert.equal(hasAffirmativeRiskText(text, financial), true, text)
assert.equal(hasSkillRiskHint({ description: 'No API key is needed', install_command: 'tool --api-key value' }, secrets), true)

const skill = { id: 'fixture', slug: 'market-brief', name: 'Market Brief',
  description: 'Financial research. Does not provide ticker-specific news, stock picks, position sizing, portfolio advice, or trade execution.',
  long_description: 'Run with Python 3.10 or later; no account, API key, or dependency installation is needed:\n\n```bash\npython3 scripts/market_brief.py --input packet.json\n```\nFetch public URLs and write selected local files.',
  category: 'research', tags: ['research'], frameworks: [], github_repo: 'example/market-brief', repository: 'https://github.com/example/market-brief',
  install_command: 'npx skills add example/market-brief', source_path: 'SKILL.md', license: 'MIT', github_stars: 30, github_forks: 2,
  created_at: '2026-09-01', updated_at: '2026-09-01', quality_score: 70, quality_signals: {}, ai_review_approved: false, ai_review_score: {}, ai_review_issues: [], ai_review_suggestions: [] }
const trust = getSkillTrustProfile(skill)
const audit = buildSkillAudit(skill)
const safety = getAgentSafetyProfile(skill, audit)
assert.doesNotMatch(JSON.stringify(trust.warnings), /real-money trading/)
assert.match(JSON.stringify(trust.warnings), /not financial advice/)
assert.doesNotMatch(JSON.stringify(audit.warnings), /real-money trading/)
assert.equal(safety.permission_hints.some(h => h.id === 'secrets'), false)
assert.equal(safety.permission_hints.some(h => h.id === 'network'), true)
assert.equal(safety.permission_hints.some(h => h.id === 'filesystem'), true)
assert.equal(getAgentSafetyProfile({ ...skill, long_description: skill.long_description + '\nRead environment variables and execute a shell command.' }, audit).permission_hints.some(h => h.id === 'secrets'), true)
for (const license of ['PolyForm-Noncommercial-1.0.0', 'CC-BY-NC-4.0', 'Non Commercial']) {
  assert.equal(getLicenseEvidence(license).status, 'restricted')
  assert.match(JSON.stringify(buildSkillAudit({ ...skill, license }).warnings), /commercial/i)
}
for (const path of ['lib/skills/open-submission.ts', 'lib/skills/owner-publication.ts', 'lib/indexer/repository-skill-sync.ts']) {
  const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8')
  assert.ok(source.includes('fetchSkillVersionEvidence'), path)
  assert.doesNotMatch(source, /version[^\n]*\|\| '1\.0\.0'/)
}
const migration = readFileSync(new URL('../supabase/migrations/20260909090953_skill_version_provenance.sql', import.meta.url), 'utf8')
assert.match(migration, /version_correction/)
assert.match(migration, /previous_version/)
assert.match(migration, /perform public\.assert_indexer_secret/)
assert.match(migration, /from public, anon, authenticated/)
assert.doesNotMatch(migration, /ai_review_approved\s*=|update public\.skill_submissions/i, 'metadata repair cannot rewrite approvals or rejected submissions')
assert.match(migration, /source_commit_sha = '5f40a60426a2ced36c6331bcb3bf47dbd1333398'/)
assert.match(migration, /source_content_hash = '91f2be4e/)
console.log('Version provenance, negated-risk context, affirmative/code risk retention and restricted-license regression tests passed.')
