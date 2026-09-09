import assert from 'node:assert/strict'
import { register } from 'node:module'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { discoverGitHubSkills } = await import('../lib/github/skill-source.ts')
const { submissionFlowCopy } = await import('../lib/i18n/submission-flow-copy.ts')
const paths = Array.from({ length: 65 }, (_, i) => `skills/item-${String(i).padStart(2, '0')}/SKILL.md`)
const calls = []
const originalFetch = globalThis.fetch
globalThis.fetch = async url => {
  const parsed = new URL(url)
  calls.push(parsed)
  assert.equal(parsed.origin, 'https://api.github.com')
  if (parsed.pathname.includes('/git/trees/')) return Response.json({ tree: paths.map(path => ({ path, type: 'blob', size: 100 })), truncated: false })
  if (parsed.pathname.includes('/contents/')) return new Response('---\nname: Fixture skill\ndescription: A valid zero-star fixture skill for safe local tests.\n---\nRead the supplied input.')
  throw Error('Unexpected external call')
}
try {
  const reference = { owner: 'fixture', repo: 'bundle', ref: 'a'.repeat(40) }
  const first = await discoverGitHubSkills(reference, { defaultBranch: 'main' }, { limit: 10 })
  assert.equal(first.skills.length, 10)
  assert.equal(first.totalPaths, 65)
  assert.equal(first.hasMore, true)
  assert.equal(first.truncated, false, 'Pagination must not imply an incomplete safety snapshot')
  const last = await discoverGitHubSkills(reference, { defaultBranch: 'main' }, { offset: 60, limit: 10 })
  assert.equal(last.skills.length, 5, 'Discover paths beyond the previous 50-result limit')
  assert.equal(last.hasMore, false)
  assert.equal(last.nextOffset, 65)
  assert.equal(new Set([...first.skills, ...last.skills].map(s => s.path)).size, 15)
  const filtered = await discoverGitHubSkills(reference, { defaultBranch: 'main' }, { query: 'item-64', limit: 10 })
  assert.equal(filtered.skills[0].path, paths[64])
  assert.equal(filtered.totalPaths, 1)
  const exact = await discoverGitHubSkills({ ...reference, path: paths[64] }, { defaultBranch: 'main' })
  assert.equal(exact.skills.length, 1)
  assert.ok(calls.filter(url => url.pathname.includes('/contents/')).every(url => url.searchParams.get('ref') === reference.ref))
  for (const locale of ['en','zh','ja','ko','es','de','fr','id']) for (const key of ['saved','pending','published','manual','share','support','copyError','limits','statusError']) {
    const text = submissionFlowCopy(locale, key)
    assert.ok(text?.length)
    assert.ok(!text.includes('\ufffd'))
  }
} finally { globalThis.fetch = originalFetch }
console.log('Submission pagination passed: 65 paths, bounded pages, no overlap, exact links, path search and eight-language receipt copy.')
