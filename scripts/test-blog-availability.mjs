import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../lib/blog/generate.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
let response = { data: null, error: null }
let reads = 0
let cacheWrappers = 0
const staticPost = { slug: 'known-static', title: 'Existing static article' }
const chain = {
  select() { return this },
  eq() { return this },
  async maybeSingle() { reads++; return response },
}
const dependencies = {
  react: { cache(fn) { cacheWrappers++; return fn } },
  '@/lib/supabase/public': { createPublicClient: () => ({ from: () => chain }) },
  '@/lib/supabase/admin': { createAdminClient() { throw new Error('Public reads must not use admin credentials') } },
  '@/lib/blog/static-posts': {
    STATIC_BLOG_POSTS: [staticPost],
    getStaticBlogPostBySlug: slug => slug === staticPost.slug ? staticPost : null,
  },
  '@/lib/skills/registry-scope': { isMcpOnlySkillRecord: () => false },
}
const exports = {}
new Function('exports', 'require', compiled)(exports, name => {
  assert.ok(name in dependencies, `Unexpected dependency ${name}`)
  return dependencies[name]
})
const read = exports.getBlogPostBySlug
assert.equal(cacheWrappers, 1, 'Metadata and content use React request memoization')
const post = { slug: 'published-editorial', title: 'An actual published article' }
response = { data: post, error: null }
assert.equal(await read(post.slug), post)
response = { data: null, error: null }
assert.equal(await read('genuinely-absent'), null, 'Successful empty response permits a 404')
assert.equal(await read('known-static'), staticPost)
for (const error of [
  { code: '402', message: 'exceed_egress_quota' },
  { code: '429', message: 'rate limit' },
  { code: '500', message: 'upstream failure' },
  { code: '42501', message: 'permission denied' },
  { code: 'PGRST116', message: 'ambiguous result' },
  { code: '', message: 'AbortError: timeout' },
  { code: '', message: 'Supabase data circuit is temporarily open' },
]) {
  response = { data: null, error }
  await assert.rejects(() => read(post.slug), { message: 'Blog content is temporarily unavailable' })
  assert.equal(await read('known-static'), staticPost, 'Retain real static fallback during outages')
}
response = { data: post, error: null }
assert.equal(await read(post.slug), post, 'A subsequent successful read recovers without a restart')
assert.equal(reads, 18)
console.log('Blog availability regressions passed: missing, unavailable, static fallback and recovery')
