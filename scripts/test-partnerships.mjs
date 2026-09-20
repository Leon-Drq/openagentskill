import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { getPartnershipCopy } from '../lib/i18n/partnership-copy.ts'
import { SITE_NAVIGATION, getPartnershipLabels, isNavigationSectionActive } from '../lib/site-navigation.ts'
import * as channels from '../lib/partnerships.ts'
import * as config from '../lib/i18n/config.ts'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
function compile(path, dependencies) {
  const output = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  new Function('exports', 'require', output)(exports, name => {
    assert.ok(name in dependencies, `Missing dependency ${name}`)
    return dependencies[name]
  })
  return exports
}
const routing = compile('lib/i18n/market-routing.ts', { '@/lib/i18n/config': config })
const { partnershipPageData } = compile('lib/seo/partnerships.ts', {
  '@/lib/i18n/market-routing': routing,
  '@/lib/i18n/partnership-copy': { getPartnershipCopy },
  '@/lib/partnerships': channels,
})
const resources = SITE_NAVIGATION.find(section => section.id === 'resources')
for (const kind of ['contact', 'sponsor']) {
  assert.equal(resources.items.filter(link => link.href === `/${kind}`).length, 1)
  assert.ok(isNavigationSectionActive(`/${kind}`, resources))
  const base = await partnershipPageData(kind, { searchParams: Promise.resolve({}) })
  assert.equal(base.metadata.robots.index, true)
  assert.equal(base.metadata.alternates.canonical, `https://www.openagentskill.com/${kind}`)
  assert.equal(base.schema[0]['@type'], kind === 'contact' ? 'ContactPage' : 'WebPage')
  assert.equal(base.schema[1]['@type'], 'BreadcrumbList')
  for (const locale of config.locales) {
    const c = getPartnershipCopy(locale)
    assert.deepEqual(Object.keys(c).sort(), Object.keys(getPartnershipCopy('en')).sort())
    for (const value of Object.values(c)) assert.ok(value.trim().length > 3)
    assert.ok(getPartnershipLabels(locale)[kind])
    const translated = await partnershipPageData(kind, { searchParams: Promise.resolve({ lang: locale }) })
    assert.equal(translated.locale, locale)
    assert.equal(translated.schema[0].inLanguage, locale)
    assert.equal(translated.metadata.robots.index, false)
    assert.equal(translated.metadata.alternates.canonical, base.metadata.alternates.canonical)
    assert.equal(translated.metadata.twitter.title, translated.metadata.openGraph.title)
    assert.equal(routing.getLocalizedNavigationHref(`/${kind}`, locale), `/${kind}${locale === 'en' ? '' : `?lang=${locale}`}`)
  }
}
assert.equal((await partnershipPageData('contact', { searchParams: Promise.resolve({ lang: ['zh', 'de'] }) })).locale, 'zh')
assert.equal((await partnershipPageData('sponsor', { searchParams: Promise.resolve({ lang: 'invalid' }) })).locale, 'en')
assert.equal(channels.CONTACT_EMAIL, 'qudongqi2023@gmail.com')
assert.equal(new URL(channels.SPONSOR_EMAIL_URL).protocol, 'mailto:')
assert.equal(new URL(channels.SPONSOR_EMAIL_URL).pathname, channels.CONTACT_EMAIL)
assert.equal(new URL(channels.SPONSOR_EMAIL_URL).searchParams.get('subject'), 'OpenAgentSkill sponsorship inquiry')
const footer = read('components/site-footer.tsx')
const visibleFooter = footer.replace(/<details\b[\s\S]*?<\/details>/g, '')
for (const path of ['/contact', '/sponsor']) assert.ok(visibleFooter.includes(`href="${path}"`))
assert.ok(read('lib/seo/sitemap.ts').includes('${SITEMAP_BASE_URL}/sponsor'))
const en = getPartnershipCopy('en')
assert.match(en.independenceCopy, /never buys review approval/)
assert.match(en.supportersCopy, /No sponsor logos are displayed yet/)
assert.match(en.relationshipCopy, /not a partnership/)
assert.match(read('components/partnership-pages.tsx'), /noopener noreferrer/)
console.log('Contact/sponsor contracts passed: 8 languages, metadata, schema, honest disclosures, navigation, channels and unchanged URLs.')
