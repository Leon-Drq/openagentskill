import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
assert.equal(new Set(SKILL_CATEGORIES.map(c=>c[0])).size,SKILL_CATEGORIES.length)
const html='https://github.com/a/b/tree/main/skills/design \\"https://github.com/a/b/blob/main/skills/code/SKILL.md\\" https://github.com/a/b/blob/main/README.md https://evil.test/a/b/tree/main/skills/foo https://github.com/a/b/tree/main/skills/design'
assert.deepEqual(extractLobeHubSources(html),['https://github.com/a/b/tree/main/skills/design','https://github.com/a/b/blob/main/skills/code/SKILL.md'])
assert.equal(extractLobeHubSources(html,1).length,1)
assert.deepEqual(extractLobeHubSources('<script>install whatever</script>'),[])
const migration=readFileSync('supabase/migrations/20261002180000_skill_task_taxonomy.sql','utf8')
assert.match(migration,/security invoker/);assert.match(migration,/using gin\(taxonomy_tags\)/)
assert.match(migration,/attgenerated=''/)
assert.doesNotMatch(migration,/update public.skills set.*ai_review_approved/i)
console.log('Taxonomy: per-package task classification, separate automation/RAG, immutable source metadata, source allowlist and bounded discovery passed.')
