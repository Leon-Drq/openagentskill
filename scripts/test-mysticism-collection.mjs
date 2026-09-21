import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
import { MYSTICISM_GROUPS, MYSTICISM_PATH, MYSTICISM_SKILLS, mysticismSkillPath } from '../lib/mysticism-collection.ts'
import { getMysticismCopy } from '../lib/i18n/mysticism-copy.ts'

assert.equal(MYSTICISM_SKILLS.length, 15)
assert.equal(new Set(MYSTICISM_SKILLS.map(s => s.repo)).size, 15)
for (const skill of MYSTICISM_SKILLS) {
  assert.ok(MYSTICISM_GROUPS.includes(skill.group))
  assert.match(skill.repo, /^[a-z-]+-skill$/)
  assert.equal(mysticismSkillPath(skill.repo), `/skills/leon-drq-${skill.repo}`)
  assert.ok(skill.description && skill.descriptionZh && skill.name && skill.nameZh)
  assert.match(skill.demoPath, /^\/(?:[a-z-]+(?:\/[a-z-]+)*)?$/)
}
assert.deepEqual(MYSTICISM_GROUPS.map(g => MYSTICISM_SKILLS.filter(s => s.group === g).length), [4, 5, 3, 3])
for (const locale of ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']) {
  const c = getMysticismCopy(locale)
  for (const [key, value] of Object.entries(c)) {
    if (key === 'summaries' && locale === 'zh') continue
    assert.ok(typeof value === 'string' ? value.trim() : value.length === 4 && value.every(s => s.trim()))
  }
}
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const page = read('app/topics/mysticism/page.tsx')
assert.match(page, /permanentRedirect/)
assert.match(page, /use-cases/)
const config = (await import('../next.config.mjs')).default
assert.deepEqual((await config.redirects()).find(rule => rule.source === MYSTICISM_PATH), { source: MYSTICISM_PATH, destination: '/use-cases/mysticism', permanent: true })
assert.doesNotMatch(page, /aggregateRating|ai_review_approved|owner_published|OWNER_PUBLISH_TOKEN/)
assert.ok(!read('lib/site-navigation.ts').includes(MYSTICISM_PATH))
assert.ok(!read('lib/seo/sitemap.ts').includes(MYSTICISM_PATH))
register('./test-owner-publication-loader.mjs', import.meta.url)
const { getUseCaseBySlug, selectSkillsForUseCase, getUseCasesForSkill } = await import('../lib/use-cases.ts')
const { getSkillPackBySlug, selectSkillsForPack } = await import('../lib/skill-packs.ts')
const scenario = getUseCaseBySlug('mysticism')
const pack = getSkillPackBySlug('mysticism-agent-pack')
const expected = MYSTICISM_SKILLS.map(s => `leon-drq-${s.repo}`)
assert.deepEqual(scenario.featuredSlugs, expected)
assert.deepEqual(pack.featuredSlugs, expected)
assert.equal(pack.featuredOnly, true)
assert.equal(pack.selectionLimit, 15)
const records = MYSTICISM_SKILLS.map(s => ({slug:`leon-drq-${s.repo}`, name:s.name, description:s.description, github_repo:`Leon-Drq/${s.repo}`, github_stars:0, quality_score:0, tags:[], frameworks:[], ai_review_approved:false}))
const unrelated = {slug:'not-in-pack',name:'Frontend',description:'React UI',github_stars:100000,quality_score:100,tags:[],frameworks:[]}
const before = JSON.stringify(records)
assert.equal(selectSkillsForUseCase([...records,unrelated],scenario,18).length,15)
assert.equal(selectSkillsForPack([...records,unrelated],pack,pack.selectionLimit).length,15)
for (const record of records) assert.equal(getUseCasesForSkill(record)[0].slug,'mysticism')
assert.equal(JSON.stringify(records),before,'Classification must not modify review states')
for (const path of ['app/use-cases/page.tsx','app/use-cases/[slug]/page.tsx','app/skills/page.tsx']) assert.match(read(path),/getSkillsBySlugs/,path+' must fetch published featured skills outside the quality baseline')
assert.match(read('app/skill-packs/[slug]/page.tsx'),/pack.selectionLimit \|\| 10/)
assert.match(read('app/api/agent/packs/[slug]/route.ts'),/pack\?\.selectionLimit \|\| 10/)
const {getLocalizedPackContent}=await import('../lib/i18n/curated-content.ts')
assert.match(getLocalizedPackContent('zh',pack).title,/玄学/)
assert.match(getLocalizedPackContent('zh',pack).description,/不|非/)
console.log('Mysticism: 15 published members wired into scenarios, directory filters and packs; legacy redirect and no invented reviews.')
