import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { getSkillSourceEvidence } = await import('../lib/skills/source-evidence.ts')
const { getSkillInstallTargets, getPrimaryInstallCommand } = await import('../lib/install-targets.ts')
const { buildInstallHandoff, toRegistrySkill } = await import('../lib/registry.ts')
const { buildAgentReadableSkillMetadata } = await import('../lib/agent-readable.ts')
const { buildDetailStructuredData, serializeDetailJson, selectDetailAlternatives } = await import('../lib/skills/detail-profile.ts')
const { skillProfileCopyKeys, skillProfileLocales, skillProfileCopy } = await import('../lib/i18n/skill-profile-copy.ts')

const skill = {
  id: 'fixture', slug: 'fixture-video', name: 'Video editor', description: 'Edit video captions and trim footage.',
  long_description: 'Preserve these original source details.', tagline: 'Edit video captions',
  author_name: 'Author', author_url: 'https://github.com/fixture', repository: 'https://github.com/fixture/video', github_repo: 'fixture/video',
  github_stars: 100000, github_forks: 300, category: 'video', tags: ['video'], frameworks: [],
  version: '1.0.0', license: 'Unknown', quality_score: 90, quality_signals: null,
  ai_review_approved: true, ai_review_score: {}, ai_review_issues: [], ai_review_suggestions: [],
  install_command: 'npx skills add fixture/video', github_last_pushed_at: new Date().toISOString(),
  created_at: '2026-09-01', updated_at: '2026-09-08',
}
const recorded = {...skill, source_path: 'skills/video/SKILL.md', source_commit_sha: 'a'.repeat(40)}
assert.equal(getSkillSourceEvidence(skill).canOfferInstall, false, 'stars and a generated command cannot prove source structure')
assert.equal(getSkillSourceEvidence(recorded).canOfferInstall, true)
assert.equal(getSkillSourceEvidence({...skill, ai_review_score:{skill_path:'SKILL.md'}}).sourceRecorded, true)
for (const path of ['README.md', '../SKILL.md', '/SKILL.md', 'https://example.com/SKILL.md']) assert.equal(getSkillSourceEvidence({...skill,source_path:path}).sourceRecorded,false)
for (const status of ['changed', 'error']) assert.equal(getSkillSourceEvidence({...recorded,source_sync_status:status}).canOfferInstall,false)
assert.equal(getSkillSourceEvidence({...recorded,install_command:null}).canOfferInstall,false)
assert.equal(getPrimaryInstallCommand(skill), '')
assert.equal(getPrimaryInstallCommand(recorded), recorded.install_command)
assert.ok(getSkillInstallTargets(skill).every(t => t.kind === 'agent-prompt' && t.value.includes('Do not install or execute')))
assert.ok(getSkillInstallTargets(recorded).some(t => t.kind === 'command'))

const handoff = buildInstallHandoff(skill)
assert.equal(handoff.recommended_command, '')
assert.equal(handoff.source_evidence.status, 'unverified')
assert.equal(handoff.safety_gate.auto_install_allowed, false)
assert.equal(handoff.safety_gate.human_review_required, true)
assert.match(handoff.agent_prompt,/Do not install or execute/)
const metadata = buildAgentReadableSkillMetadata(skill)
assert.equal(metadata.install.ready, false)
assert.equal(metadata.trust.auto_install.allowed, false)
assert.equal(metadata.install.command, handoff.recommended_command)
assert.equal(toRegistrySkill(skill).supply_profile.install.ready, false)
assert.equal(buildInstallHandoff(recorded).recommended_command, recorded.install_command)
const owner = {...recorded,ai_review_approved:false,listing_status:'owner_published'}
assert.equal(buildInstallHandoff(owner).safety_gate.auto_install_allowed, false, 'source discovery must not bypass owner review')

const schema = buildDetailStructuredData(skill)['@graph'][0]
assert.equal(schema['@type'], 'CreativeWork')
for (const key of ['offers','operatingSystem','softwareVersion','aggregateRating']) assert.equal(schema[key],undefined)
assert.equal(buildDetailStructuredData(recorded)['@graph'][0]['@type'],'SoftwareSourceCode')
assert.ok(!serializeDetailJson({text:'</script><script>alert(1)</script>'}).includes('<'))
assert.equal(JSON.parse(serializeDetailJson({text:'<'})).text,'<')
assert.deepEqual(selectDetailAlternatives(skill,[{...skill,slug:'unrelated',description:'Kubernetes cluster networking',name:'Cluster',tagline:'Networking',github_stars:999999}]),[])
assert.equal(selectDetailAlternatives(skill,[{...recorded,slug:'other'}, {...recorded,slug:'other'}]).length,1)
for (const [locale, values] of Object.entries(skillProfileLocales)) {
  assert.equal(values.length, skillProfileCopyKeys.length,locale)
  for (const key of skillProfileCopyKeys) assert.ok(skillProfileCopy(locale,key)?.trim(),locale+key)
}
const page = readFileSync(new URL('../app/skills/[slug]/page.tsx',import.meta.url),'utf8')
for (const id of ['overview','install-options','source-trust','agent-access','related-skills','creator-tools']) assert.ok(page.includes(`id="${id}"`),id)
assert.match(page,/source=\{skill\.longDescription\}/, 'retain full original descriptive content in the document renderer')
assert.equal((page.match(/<h1\b/g)||[]).length,1)
assert.ok(!page.includes('Supply asset profile'))
assert.match(page,/index: indexable/)
assert.match(page,/canonical: pageUrl/)
console.log('Skill detail tests passed: evidence gates, API/UI consistency, safe JSON, schema accuracy, related relevance, eight locales and SEO contracts.')
