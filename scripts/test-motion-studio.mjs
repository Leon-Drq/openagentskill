import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { MOTION_ENTRIES, MOTION_FAMILIES, filterMotionEntries, getMotionEntry, motionAsset } from '../lib/motion/catalog.ts'
import { selectMotionDirectoryEntries } from '../lib/motion/directory.ts'
import { MOTION_CATEGORY, motionCategoryLabel } from '../lib/motion/shared.ts'
import { directoryHref } from '../lib/skills/directory.ts'
import { motionCopy } from '../lib/motion/copy.ts'

assert.equal(MOTION_ENTRIES.length,233)
assert.equal(new Set(MOTION_ENTRIES.map(e=>e.id)).size,233)
assert.equal(new Set(MOTION_ENTRIES.map(e=>e.sourceUrl)).size,233)
assert.equal(Object.keys(MOTION_FAMILIES).length,12)
assert.equal(getMotionEntry('../../private'),undefined)
assert.equal(filterMotionEntries('粒子').length,4)
assert.equal(filterMotionEntries('no-results-xyz').length,0)
assert.equal(filterMotionEntries('', 'charts').length,11)
assert.deepEqual(filterMotionEntries(' PHOTO PRINT ').map(e=>e.title),['Photo print app launch film'])
assert.equal(selectMotionDirectoryEntries({}).length,233)
assert.equal(selectMotionDirectoryEntries({query:'粒子',platform:'Codex'}).length,4)
for(const filters of [{access:'paid'},{access:'free'},{access:'third-party'},{pricing:'paid'}, {featured:true},{minStars:1},{platform:'Python'},{quality:'verified'},{trust:'high'},{safety:'safe'},{useCase:'trading'},{topic:'finance'},{output:'video'}]) assert.equal(selectMotionDirectoryEntries(filters).length,0,JSON.stringify(filters))
const pages=Array.from({length:15},(_,n)=>selectMotionDirectoryEntries({}).slice(n*16,(n+1)*16))
assert.equal(pages[14].length,9)
assert.equal(new Set(pages.flat().map(e=>e.id)).size,233)
assert.equal(directoryHref('/skills','q=type&page=2',{category:MOTION_CATEGORY}),'/skills?q=type&category=motion-design')
assert.equal(directoryHref('/zh/skills','category=motion-design',{page:'2'}),'/zh/skills?category=motion-design&page=2')
for(const locale of ['en','zh','ja','ko','es','de','fr','id']) assert.ok(motionCategoryLabel(locale))
for(const locale of ['en','zh']) assert.deepEqual(Object.keys(motionCopy(locale)),Object.keys(motionCopy('en')))
for(const entry of MOTION_ENTRIES){
 assert.ok(MOTION_FAMILIES[entry.family])
 assert.match(entry.skillSha256,/^[a-f0-9]{64}$/)
 assert.equal(entry.status,'preview')
 assert.equal(entry.sampleKind,'original-family-study')
 assert.match(entry.sourceUrl,/^https:\/\/prompt-motion\.com\/[a-z0-9-]+$/)
 for(const animated of [false,true]){
  const svg=await readFile(new URL('../public'+motionAsset(entry,animated),import.meta.url),'utf8')
  assert.match(svg,/viewBox="0 0 1280 800"/)
  assert.doesNotMatch(svg,/<script|<foreignObject|onload=|javascript:|href=/i)
  assert.doesNotMatch(svg,/animation:[^;}]*infinite|url\(/)
  if(animated) assert.match(svg,/prefers-reduced-motion:reduce/)
 }
}
console.log('Motion directory: 233 records, 466 safe samples, search, pagination, category URLs and preview access filters passed.')
