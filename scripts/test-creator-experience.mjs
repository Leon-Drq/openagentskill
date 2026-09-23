import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { z } from 'zod'
import { repositoryStars, creatorDateWindow, publicWebsite, serializeCreatorSchema, readCreatorDailyPages } from '../lib/creator-profile.ts'
import { studioCopy } from '../lib/i18n/creator-studio-copy.ts'
import { isLocale } from '../lib/i18n/config.ts'

assert.equal(repositoryStars([
  { github_repo: 'Owner/Repo', github_stars: 100 }, { github_repo: 'owner/repo', github_stars: 110 },
  { repository: 'https://github.com/owner/repo.git', github_stars: 90 },
  { github_repo: 'other/repo', github_stars: 40 }, { github_stars: 999 },
]), 150, 'Repository stars must not multiply with nested skill listings')
assert.deepEqual(creatorDateWindow(new Date('2026-03-01T22:00:00Z')), { start: '2026-01-31', end: '2026-03-01' })
assert.equal((await readCreatorDailyPages(async offset => ({ data: Array(offset === 0 ? 1000 : 70).fill({ views:1 }) }))).data.length, 1070)
assert.equal((await readCreatorDailyPages(async offset => offset === 0 ? { data:Array(1000).fill({}) } : { data:null, error:'timeout' })).data, null)
for (const url of ['javascript:alert(1)', 'data:text/html,test', 'ftp://site.com', 'https://user:pass@example.com', 'not a URL']) assert.equal(publicWebsite(url), null)
assert.equal(publicWebsite('https://example.com/path'), 'https://example.com/path')
assert.ok(!serializeCreatorSchema({ bio: '</script><script>alert(1)</script>' }).includes('<'))
for (const lang of ['en','zh','ja','ko','es','de','fr','id']) for (const key of ['center','preview','save','popular','evidence','gallery','privacy']) assert.ok(studioCopy(lang,key))

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8')
const dashboard = read('app/creator/page.tsx')
assert.match(dashboard, /gte\('event_date', dateWindow.start\)/)
assert.match(dashboard, /lte\('event_date', dateWindow.end\)/)
assert.doesNotMatch(dashboard, /percent\(totals|install_starts \|\| event\?\.install_copies/)
assert.match(dashboard, /index: false, follow: false/)
const profile = read('app/creators/[username]/page.tsx')
assert.match(profile, /repositoryStars\(skills\)/)
assert.match(profile, /or\(PUBLIC_SKILL_FILTER\)/)
assert.doesNotMatch(profile, /— Verified Agent Skill Creator/)
assert.match(profile, /serializeCreatorSchema\(jsonLd\)/)
assert.match(profile, /alternates: \{ canonical \}/)

// Execute the actual Server Action against a session-scoped fake client. No production writes.
const js = ts.transpileModule(read('app/creator/actions.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
async function run({ user = { id: 'signed-in-owner' }, current = { username:'alice', github_username:'verified-owner', github_verified_at:'2026-01-01', x_username:'verifiedx', x_verified_at:'2026-01-01' }, values = {}, error = null } = {}) {
  let write = null
  const scope = []
  const client = { auth: { getUser: async () => ({ data: { user } }) }, from: table => {
    assert.equal(table, 'profiles')
    const chain = { select: () => chain, eq: (key,value) => { scope.push([key,value]); return chain }, maybeSingle: async () => ({ data: current, error }), upsert: async value => { write = value; return { error:null } } }
    return chain
  } }
  const exports = {}
  new Function('require','exports',js)(name => ({
    'next/cache': { revalidatePath() {} },
    'next/navigation': { redirect(url) { throw new Error(url) } },
    zod: { z }, '@/lib/supabase/server': { createClient: async () => client },
    '@/lib/creator-profile': { publicWebsite }, '@/lib/i18n/config': { isLocale },
  }[name]), exports)
  const data = new FormData()
  for (const [key,value] of Object.entries({ username:'alice', display_name:'Alice', bio:'Makes useful skills', website:'https://example.com', github_username:'attacker', x_username:'attacker', lang:'zh', ...values })) data.set(key,value)
  let redirect = ''
  try { await exports.updateCreatorProfile(data) } catch (e) { redirect = e.message }
  return { write, redirect, scope }
}
const ok = await run()
assert.equal(ok.write.id, 'signed-in-owner')
assert.equal(ok.write.github_username, 'verified-owner')
assert.equal(ok.write.x_username, 'verifiedx')
assert.ok(ok.scope.some(([k,v]) => k === 'id' && v === 'signed-in-owner'))
assert.match(ok.redirect, /tab=profile&lang=zh&saved=1/)
for (const input of [{ user:null }, { values:{ website:'javascript:alert(1)' } }, { values:{ username:'renamed' } }, { error:{ code:'network' } }]) assert.equal((await run(input)).write, null)
console.log('Creator experience: navigation, date boundaries, repository deduplication, safe public URLs/schema, authenticated editing and immutable identity passed.')
