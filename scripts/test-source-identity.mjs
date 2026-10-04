import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import * as packed from '../lib/cache/packed-json.ts'
import * as coalesced from '../lib/cache/coalesced.ts'
import * as searchQuery from '../lib/search-query.ts'
import * as searchResults from '../lib/search-results.ts'
import { withTimeout } from '../lib/async.ts'
import nextConfig from '../next.config.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
function compile(path, deps) {
  const source = read(path)
  const names = [...source.matchAll(/from '([^']+)'/g)].map(match => match[1])
  const dependencies = { ...Object.fromEntries(names.map(name => [name, {}])), ...deps }
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  new Function('exports', 'require', code)(exports, name => { assert.ok(name in dependencies, name); return dependencies[name] })
  return exports
}
const canonical = { slug: 'socai-io-jev-social', name: 'jev-social', github_repo: 'socai-io/jev-social', source_path: 'skills/jev-social/SKILL.md', category: 'research' }
const calls = []
let failure = false
const client = {
  rpc() { throw Error('Repository lookup must not call full-text or name RPCs') },
  from(table) {
    assert.equal(table, 'skill_directory_entries')
    const operations = []; calls.push(operations)
    const query = {
      select() { return query },
      ilike(column, value) { operations.push([column, value]); return query },
      or(filter) { assert.equal(filter, 'public-filter'); return query },
      order() { return query }, limit(n) { assert.ok(n <= 200); return query },
      then(resolve, reject) { return Promise.resolve({ data: failure ? null : [canonical], error: failure ? Error('offline') : null }).then(resolve, reject) },
    }
    return query
  },
}
const db = compile('lib/db/skills.ts', {
  '@/lib/supabase/public': { createPublicClient: () => client },
  '@/lib/skills/publication': { PUBLIC_SKILL_FILTER: 'public-filter' },
  '@/lib/skills/registry-scope': { isMcpOnlySkillRecord: () => false },
  '@/lib/async': { withTimeout }, '@/lib/search-query': searchQuery,
  '@/lib/search-results': searchResults, '@/lib/cache/packed-json': packed, '@/lib/cache/coalesced': coalesced,
  'next/cache': { unstable_cache: fn => fn },
})
const found = await db.searchSkillsStrict('https://github.com/socai-io/jev-social')
assert.deepEqual(found, [canonical])
assert.deepEqual(calls, [[['github_repo', 'socai-io/jev-social']]])
await db.searchSkillsStrict('Some_Owner/Repo_Name')
assert.deepEqual(calls[1], [['github_repo', 'some\\_owner/repo\\_name']], 'Underscores are literal identity characters, not SQL wildcards')
failure = true
await assert.rejects(db.searchSkillsStrict('another/repo'), /offline/)
failure = false
assert.deepEqual(await db.searchSkillsStrict('another/repo'), [canonical], 'Failed exact lookups must not cache an empty result')

const registry = compile('lib/registry.ts', {})
assert.equal(registry.getCanonicalSkillKey(canonical), registry.getCanonicalSkillKey({ ...canonical, slug: 'duplicate', repository: 'https://github.com/socai-io/jev-social/blob/other/skills/jev-social/SKILL.md' }))
assert.notEqual(registry.getCanonicalSkillKey(canonical), registry.getCanonicalSkillKey({ ...canonical, source_path: 'skills/other/SKILL.md' }))
const ranked = registry.dedupeRankedSkills([
  { skill: { ...canonical, slug: 'duplicate', created_at: '2026-09-24' }, score: 90 },
  { skill: { ...canonical, created_at: '2026-09-21' }, score: 80 },
])
assert.equal(ranked[0].skill.slug, canonical.slug, 'A higher-ranking duplicate cannot replace the established URL')
const fallback = compile('lib/skill-fallbacks.ts', {})
assert.equal(fallback.getCanonicalSkillSlug('socai-io-jev-social-jev-social'), canonical.slug)
const redirects = await nextConfig.redirects()
for (const source of ['/skills/socai-io-jev-social-jev-social', '/:locale/skills/socai-io-jev-social-jev-social']) {
  const redirect = redirects.find(item => item.source === source)
  assert.equal(redirect?.permanent, true)
  assert.ok(redirect.destination.endsWith('/skills/' + canonical.slug))
}
console.log('Source identity: repository lookup, literal punctuation, failure recovery, distinct paths and permanent canonical redirects passed.')
