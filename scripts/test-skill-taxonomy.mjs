import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { register } from 'node:module'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { classifySkill, skillTaxonomy, normalizeSkillCategory, SKILL_CATEGORIES, legacyCategoryTopic } = await import('../lib/skills/taxonomy.ts')
const { extractLobeHubSources } = await import('../lib/indexer/lobehub-discovery.ts')
const cases = [
 [{name:'browser-fill',description:'Fill forms in a browser.',category:'web-scraping',source_path:'skills/browser-fill/SKILL.md'}, 'automation', 'browser-automation'],
 [{name:'web-scraper',description:'Web scraping and extraction.',category:'research'}, 'automation', 'web-scraping'],
 [{name:'rag-search',description:'Retrieve from a knowledge base.',category:'research'}, 'ai-knowledge', 'rag'],
 [{name:'pptx',description:'Create PowerPoint slides.',category:'productivity'}, 'presentation', 'slides'],
 [{name:'markitdown',description:'Document conversion to markdown.',category:'ai-knowledge'}, 'document-processing', 'document-conversion'],
 [{name:'code-review',description:'Review code changes.',category:'design-creative',source_path:'skills/code-review/SKILL.md'}, 'coding-agents', 'code-review'],
 [{name:'video-generator',description:'Produce videos with Remotion.',category:'design-creative'}, 'video-creation', 'video-generation'],
 [{name:'imagegen',description:'Generate images and posters.'}, 'image-generation', 'image-generation'],
 [{name:'sql-analysis',description:'Analyze a Postgres database.'}, 'data', 'databases'],
]
for (const [input,primary,tag] of cases) {
 const result=classifySkill(input); assert.equal(result.primary_category,primary,JSON.stringify(input));assert.ok(result.taxonomy_tags.includes(tag));
 const before=JSON.stringify(input);skillTaxonomy(input);assert.equal(JSON.stringify(input),before)
}
assert.equal(classifySkill({name:'unknown-package',description:'Do a useful task.'}).primary_category,'other')
assert.equal(normalizeSkillCategory('Browser Automation'),'automation')
assert.equal(normalizeSkillCategory('rag-knowledge'),'ai-knowledge')
assert.equal(legacyCategoryTopic('web-scraping'),'web-scraping')
assert.equal(classifySkill({github_repo:'obra/superpowers',source_path:'skills/using-superpowers/SKILL.md',category:'design-creative'}).primary_category,'coding-agents')
assert.equal(classifySkill({github_repo:'obra/superpowers',source_path:'skills/new-design/SKILL.md',category:'design-creative'}).primary_category,'design-creative')
const quoteCard = {
 github_repo: 'chengyi-ai/native-subtitle-quote-image',
 source_path: 'skills/native-subtitle-quote-image/SKILL.md', name: 'native-subtitle-quote-image',
 description: '将本地视频或在线视频制作成视频字幕社交长图，使用真实视频帧。', category: 'design-creative',
}
const quoteTaxonomy = classifySkill(quoteCard)
assert.equal(quoteTaxonomy.primary_category, 'image-generation', 'classify the delivered quote card, not its video input')
assert.deepEqual(quoteTaxonomy.output_types, ['image'])
assert.deepEqual(quoteTaxonomy.taxonomy_tags, ['image-editing'])
assert.deepEqual(skillTaxonomy({ ...quoteCard, ...quoteTaxonomy }), quoteTaxonomy, 'persisted taxonomy retains image discovery facets')
assert.equal(classifySkill({ ...quoteCard, source_path: 'skills/video-generator/SKILL.md', name: 'video-generator' }).primary_category, 'video-creation', 'do not apply the correction to another Skill in the repository')
assert.equal(classifySkill({ ...quoteCard, github_repo: 'other/native-subtitle-quote-image' }).primary_category, 'video-creation', 'a similar name alone does not authorize an exact source correction')
assert.equal(new Set(SKILL_CATEGORIES.map(c=>c[0])).size,SKILL_CATEGORIES.length)
const html='https://github.com/a/b/tree/main/skills/design \\"https://github.com/a/b/blob/main/skills/code/SKILL.md\\" https://github.com/a/b/blob/main/README.md https://evil.test/a/b/tree/main/skills/foo https://github.com/a/b/tree/main/skills/design'
assert.deepEqual(extractLobeHubSources(html),['https://github.com/a/b/tree/main/skills/design','https://github.com/a/b/blob/main/skills/code/SKILL.md'])
assert.equal(extractLobeHubSources(html,1).length,1)
assert.deepEqual(extractLobeHubSources('<script>install whatever</script>'),[])
const migration=readFileSync('supabase/migrations/20261002180000_skill_task_taxonomy.sql','utf8')
assert.match(migration,/security invoker/);assert.match(migration,/using gin\(taxonomy_tags\)/)
assert.match(migration,/attgenerated=''/)
assert.doesNotMatch(migration,/update public.skills set.*ai_review_approved/i)
const exactMigrationPath = 'supabase/migrations/20261002180100_skill_taxonomy_exact_sources.sql'
const originalExactMigration = readFileSync(exactMigrationPath, 'utf8')
const temp = mkdtempSync(join(tmpdir(), 'skill-taxonomy-'))
try {
 const output = join(temp, 'fixture.sql')
 execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/build-skill-taxonomy-migration.mjs', '--exact-source-output', output, '--source', `${quoteCard.github_repo}:${quoteCard.source_path}`])
 const generated = readFileSync(output, 'utf8')
 assert.equal(readFileSync('supabase/migrations/20261002180000_skill_task_taxonomy.sql', 'utf8'), migration, 'a follow-up migration must not rewrite the applied base migration')
 assert.equal(readFileSync(exactMigrationPath, 'utf8'), originalExactMigration, 'a follow-up migration must not rewrite the applied exact-source migration')
 assert.match(generated, /"primary_category":"image-generation","taxonomy_tags":\["image-editing"\],"output_types":\["image"\]/)
 assert.match(generated, /where lower\(coalesce\(github_repo,''\)\) \|\| ':' \|\| coalesce\(source_path,''\) in \('chengyi-ai\/native-subtitle-quote-image:skills\/native-subtitle-quote-image\/SKILL.md'\)/)
 assert.match(generated, /if before_original is distinct from after_original then/)
 assert.equal(generated, readFileSync('supabase/migrations/20261007015508_native_subtitle_image_taxonomy.sql', 'utf8'), 'the checked-in migration matches the classifier used for new imports')
} finally {
 rmSync(temp, { recursive: true, force: true })
}
console.log('Taxonomy: per-package task classification, separate automation/RAG, immutable source metadata, source allowlist and bounded discovery passed.')
