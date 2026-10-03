import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
import { pageCount, clampResultPage, paginationItems } from '../lib/skills/pagination.ts'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { directoryHref } = await import('../lib/skills/directory.ts')
const { directoryLabel } = await import('../lib/i18n/directory-copy.ts')

assert.equal(pageCount(0), 1)
assert.equal(pageCount(16), 1)
assert.equal(pageCount(17), 2)
assert.equal(pageCount(34560), 2160)
assert.equal(clampResultPage(9999, 385), 25)
assert.equal(clampResultPage(-1, 0), 1)
assert.deepEqual(paginationItems(1, 2160), [1,2,3,4,5,'gap-after',2160])
assert.deepEqual(paginationItems(1075, 2160), [1,'gap-before',1074,1075,1076,'gap-after',2160])
assert.deepEqual(paginationItems(2160, 2160), [1,'gap-before',2156,2157,2158,2159,2160])
assert.deepEqual(paginationItems(1075, 2160, true), [1,'gap-before',1075,'gap-after',2160])
assert.deepEqual(paginationItems(1, 1), [1])
for (const total of [1,2,3,4,7,8,25,2160,100000]) for (const page of [1,2,3,4,Math.ceil(total/2),total-2,total-1,total]) for (const compact of [false,true]) {
  const items = paginationItems(page,total,compact)
  const numbers = items.filter(v=>typeof v==='number')
  assert.equal(numbers[0],1)
  assert.equal(numbers.at(-1),total)
  assert.ok(numbers.includes(Math.max(1,Math.min(page,total))))
  assert.equal(new Set(items).size,items.length)
  assert.ok(numbers.every((n,i)=>n>=1&&n<=total&&(i===0||n>numbers[i-1])))
  assert.ok(numbers.length <= (compact ? 3 : 7), 'Link counts stay bounded even for very large catalogs')
}
const state = 'lang=zh&q=Skillry&examples=true&pricing=free&sort=new&page=3'
const destination = directoryHref('/zh/skills',state,{page:'25'})
assert.equal(destination,'/zh/skills?lang=zh&q=Skillry&examples=true&pricing=free&sort=new&page=25')
for (const locale of ['en','zh','ja','ko','es','de','fr','id']) for (const key of ['pagination','pageNumber','pageSummary']) {
  assert.notEqual(directoryLabel(locale,key),key)
  if (key !== 'pagination') assert.ok(directoryLabel(locale,key).includes('{page}'))
  if (key === 'pageSummary') assert.ok(directoryLabel(locale,key).includes('{total}'))
}
const component=readFileSync('components/directory-pagination.tsx','utf8')
assert.match(component,/aria-current="page"/)
assert.match(component,/aria-disabled="true"/)
assert.match(component,/prefetch=\{false\}/)
assert.match(component,/totalPages === null/,'Degraded data never invents an exact total')
const db=readFileSync('lib/db/skills.ts','utf8')
const count=db.slice(db.indexOf('const getCachedCatalogCount'),db.indexOf('const getCachedCatalogPage'))
assert.doesNotMatch(count,/sort:|page:|\.range\(/,'Count cache keys exclude sorting and pagination')
const server=readFileSync('app/skills/content.tsx','utf8')
assert.match(server,/const candidateLimit = MAX_SKILL_CANDIDATE_LIMIT/,'Ranked pools keep the same total across pages')
const view=readFileSync('supabase/migrations/20261003065638_public_skill_directory_scope.sql','utf8')
assert.match(view,/security_invoker = true/)
assert.doesNotMatch(view,/author_email|select \*|update public.skills|security definer/i)
assert.match(view,/ai_review_approved = true or listing_status in \('owner_published', 'static_checked'\)/)
console.log('Directory pagination: bounded desktop/mobile windows, last-page clamping, retained filters, 8 locales, shared counts and invoker security passed.')
