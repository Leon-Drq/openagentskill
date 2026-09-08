import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import ts from 'typescript'
import { locales, getLocaleFromRoute } from '../lib/i18n/config.ts'
import { galleryTranslations, galleryCopy, localizeEditorialText } from '../lib/i18n/gallery-copy.ts'
import { siteTranslations, siteCopy } from '../lib/i18n/site-copy.ts'
import { submissionTranslations, submissionCopy } from '../lib/i18n/submission-copy.ts'
import { creatorTranslations, creatorCopy } from '../lib/i18n/creator-copy.ts'
import { SHOWCASE_CATEGORIES, SHOWCASE_TAGS, SHOWCASE_CASES, filterShowcaseCases, getShowcaseAccessLabel, getShowcaseEvidenceLabel } from '../lib/showcase.ts'

const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(x=>x[1]).sort()
for (const [dictionary, size] of [[galleryTranslations, 6], [siteTranslations, 7], [submissionTranslations, 6], [creatorTranslations, 7]]) {
  for (const [key, values] of Object.entries(dictionary)) {
    assert.equal(values.length, size, `${key}: all locales must be explicit`)
    for (const value of values) {
      assert.ok(value.trim(), `${key}: empty translation`)
      assert.deepEqual(placeholders(value), placeholders(key), `${key}: missing interpolation`)
      assert.ok(!value.includes('\uFFFD'), `${key}: broken encoding`)
    }
  }
}
for (const locale of locales) {
  assert.ok(creatorCopy(locale, 'Featured creators'))
  assert.equal(getLocaleFromRoute(`/${locale}/submit`, 'invalid'), locale)
  assert.equal(getLocaleFromRoute('/showcase', locale), locale)
  for (const key of ['Analytics preferences', 'Necessary only', 'Allow analytics', 'Privacy details']) assert.ok(siteCopy(locale, key).trim())
  assert.ok(galleryCopy(locale, 'Play preview', '播放预览'))
  assert.ok(siteCopy(locale, 'View all rankings'))
  assert.ok(submissionCopy(locale, 'Reviewed and published', '已通过审核并发布'))
  assert.ok(!galleryCopy(locale, 'Page {page}', '第 {page} 页', {page: 2}).includes('{page}'))
  for (const entry of [...SHOWCASE_CATEGORIES, ...SHOWCASE_TAGS]) {
    assert.ok(Object.hasOwn(galleryTranslations, entry.label.en), `Missing category/tag: ${entry.id}`)
    assert.ok(localizeEditorialText(entry.label, locale))
  }
  assert.ok(getShowcaseAccessLabel({access:'open-source'}, locale))
  assert.ok(getShowcaseEvidenceLabel(SHOWCASE_CASES[0], locale))
}
assert.equal(getLocaleFromRoute('/ja/submit', 'de'), 'ja', 'Path locale must override query locale')
assert.equal(getLocaleFromRoute('/showcase', 'invalid'), 'en')
assert.equal(getLocaleFromRoute(null, null, 'fr'), 'fr')
assert.equal(localizeEditorialText({ en: 'npx skills add owner/repo', zh: 'npx skills add owner/repo'}, 'ja'), 'npx skills add owner/repo')
assert.equal(galleryCopy('invalid', 'Play preview', '播放预览'), 'Play preview')
assert.ok(filterShowcaseCases('all', '成長する余白').some(x=>x.slug==='room-to-grow-poster'))
assert.equal(filterShowcaseCases('all', 'ロゴ').length, 2)

const guarded = [
  ...readdirSync('components').filter(x=>/^showcase-.*\.tsx$/.test(x)).map(x=>`components/${x}`),
  'components/skill-submit-form.tsx', 'app/submit/page.tsx',
]
for(const path of guarded) {
  const source=readFileSync(path,'utf8'), ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
  function visit(n) {
    if(ts.isConditionalExpression(n)&&/^(zh|locale === 'zh')$/.test(n.condition.getText(ast))) assert.fail(`${path}: use complete dictionaries, not a Chinese/English ternary`)
    if(ts.isCallExpression(n)&&['galleryCopy','submissionCopy'].includes(n.expression.getText(ast))) {
      const key=n.arguments[1]
      if(key && ts.isStringLiteral(key)) assert.ok(Object.hasOwn(n.expression.getText(ast)==='galleryCopy'?galleryTranslations:submissionTranslations,key.text), `${path}: missing ${key.text}`)
    }
    ts.forEachChild(n,visit)
  }
  visit(ast)
  assert.ok(!source.includes('&lang=zh'), `${path}: language-specific deep link`)
}
console.log(`Localization checks passed: ${locales.length} locales, ${Object.keys(galleryTranslations).length+Object.keys(siteTranslations).length+Object.keys(submissionTranslations).length+Object.keys(creatorTranslations).length} messages, placeholders, category coverage and migrated UI guards.`)
