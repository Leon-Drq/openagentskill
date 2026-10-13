import assert from 'node:assert/strict'
import { MOTION_ENTRIES, filterMotionEntries, getMotionEntry } from '../lib/motion/catalog.ts'
import { selectMotionDirectoryEntries, paidMotionWindow } from '../lib/motion/directory.ts'
import { MOTION_CATEGORY, motionCategoryLabel } from '../lib/motion/shared.ts'
import { directoryHref } from '../lib/skills/directory.ts'
import { motionCopy } from '../lib/motion/copy.ts'
import { motionSkillHref, isLocalizedMotionPath } from '../lib/motion/routes.ts'
import { motionDetailMetadata, motionSitemapEntries, relatedMotionEntries } from '../lib/motion/detail.ts'
import { getLanguageSwitchHref } from '../lib/i18n/market-routing.ts'

assert.equal(MOTION_ENTRIES.length,233)
for(const key of ['id','sourceUrl','videoUrl','posterUrl']) assert.equal(new Set(MOTION_ENTRIES.map(e=>e[key])).size,233,key)
assert.equal(getMotionEntry('../../private'),undefined)
assert.equal(filterMotionEntries('no-results-xyz').length,0)
assert.deepEqual(filterMotionEntries(' PHOTO PRINT ').map(e=>e.title),['Photo print app launch film'])
for(const filters of [{},{access:'paid'},{access:'paid',pricing:'paid'},{pricing:'paid'},{output:'video'}]) assert.equal(selectMotionDirectoryEntries(filters).length,233,JSON.stringify(filters))
for(const filters of [{access:'free'},{access:'third-party'},{pricing:'free'},{pricing:'freemium'},{featured:true},{minStars:1},{platform:'Python'},{quality:'verified'},{trust:'high'},{safety:'safe'},{useCase:'trading'},{topic:'finance'},{output:'svg'}]) assert.equal(selectMotionDirectoryEntries(filters).length,0,JSON.stringify(filters))
assert.equal(selectMotionDirectoryEntries({query:'no-results-xyz',access:'paid'}).length,0)
// Exercise every boundary against existing paid registry inventory, not only an empty registry.
for(const motionCount of [0,1,15,16,17,233]) for(const registryCount of [0,1,16,39]){
 const motion=Array.from({length:motionCount},(_,i)=>'motion-'+i), registry=Array.from({length:registryCount},(_,i)=>'registry-'+i)
 const combined=[]
 for(let offset=0;offset<motionCount+registryCount;offset+=16){
  const page=paidMotionWindow(motion,registry,offset)
  assert.equal(page.total,motionCount+registryCount)
  assert.ok(page.motionEntries.length+page.registryEntries.length<=16)
  combined.push(...page.motionEntries,...page.registryEntries)
 }
 assert.deepEqual(combined,[...motion,...registry])
}
assert.equal(paidMotionWindow(MOTION_ENTRIES,[],224).motionEntries.length,9)
assert.equal(directoryHref('/skills','sort=new&category=motion-design',{access:'paid'}),'/skills?sort=new&category=motion-design&access=paid')
assert.equal(directoryHref('/skills','access=paid',{category:MOTION_CATEGORY}),'/skills?access=paid&category=motion-design')
for(const locale of ['en','zh','ja','ko','es','de','fr','id']) assert.ok(motionCategoryLabel(locale))
assert.deepEqual(Object.keys(motionCopy('zh')),Object.keys(motionCopy('en')))
// Pin different original films from the user's report; no shared family substitutes.
assert.equal(MOTION_ENTRIES[0].videoUrl,'https://media.prompt-motion.com/stephanlivera-opus-5-5-on-max/video.86605038.mp4')
assert.equal(MOTION_ENTRIES[1].videoUrl,'https://media.prompt-motion.com/twoclipping-opus-5-5-is-f-cking/video.eef090ae.mp4')
assert.equal(MOTION_ENTRIES[2].videoUrl,'https://media.prompt-motion.com/shneural-after-opus-5-5-it/video.2ab38476.mp4')
for(const entry of MOTION_ENTRIES){
 assert.equal(entry.access,'paid')
 assert.equal(entry.status,'text-delivery')
 assert.equal(entry.checkout,'release-gated')
 assert.equal(entry.deliveryKind,entry.sourceKind==='prompt'?'prompt':'skill-instructions')
 for(const field of ['prompt','promptText','text','body','instructions']) assert.ok(!Object.hasOwn(entry,field), 'Paid text never ships in public catalog')
 assert.equal(entry.reproductionStatus,'not-verified')
 assert.ok(entry.width>0&&entry.height>0)
 assert.ok(entry.sourceAuthor&&entry.sourceCreatorName)
 assert.match(entry.sourceUrl,/^https:\/\/prompt-motion\.com\/[a-z0-9-]+$/)
 for(const key of ['videoUrl','posterUrl']){
  const url=new URL(entry[key]);assert.equal(url.protocol,'https:');assert.equal(url.hostname,'media.prompt-motion.com');assert.ok(!url.username&&!url.password&&!url.port)
 }
 if(entry.sourceKind==='prompt') assert.match(entry.promptSha256,/^[a-f0-9]{64}$/)
 else assert.ok(entry.sourceRepo)
 assert.ok(!Object.hasOwn(entry,'skillSha256'))
 assert.ok(!Object.hasOwn(entry,'duration')) // Never advertise the old invented 8-second duration.
}
console.log('Motion sources: 233 distinct original films, paid category/filter composition, pagination boundaries and honest delivery status passed.')

// Every paid entry has a real, locale-stable product destination and share metadata.
const sitemap = motionSitemapEntries()
assert.equal(sitemap.length, 466)
assert.equal(new Set(sitemap.map(item => item.url)).size, 466)
for (const entry of MOTION_ENTRIES) {
  for (const locale of ['en', 'zh']) {
    const path = motionSkillHref(entry.id, locale)
    const metadata = motionDetailMetadata(entry, locale)
    assert.equal(metadata.alternates.canonical, 'https://www.openagentskill.com' + path)
    assert.ok(sitemap.some(item => item.url === metadata.alternates.canonical))
    assert.equal(metadata.openGraph.images[0].url, entry.posterUrl)
    assert.equal(metadata.openGraph.url, metadata.alternates.canonical)
    assert.equal(getLanguageSwitchHref(path, locale === 'zh' ? 'en' : 'zh'), motionSkillHref(entry.id, locale === 'zh' ? 'en' : 'zh'))
    assert.equal(Object.keys(metadata.alternates.languages).length, 3)
  }
  const related = relatedMotionEntries(entry)
  assert.equal(related.length, 3)
  assert.ok(related.every(item => item.id !== entry.id))
}
assert.equal(isLocalizedMotionPath('/skills/motion-unknown', 'zh'), true)
assert.equal(isLocalizedMotionPath('/skills/anthropic-frontend-design', 'zh'), false)
assert.equal(isLocalizedMotionPath('/skills/motion-unknown/audit', 'zh'), false)
assert.equal(isLocalizedMotionPath('/skills/motion-unknown', 'ja'), false)
assert.equal(getLanguageSwitchHref('/skills/anthropic-frontend-design', 'zh'), '/skills/anthropic-frontend-design?lang=zh')
console.log('Motion product routes, language switching, original sharing images, related items and sitemap coverage passed.')
