import assert from 'node:assert/strict'
import './test-partnerships.mjs'
import './test-mysticism-collection.mjs'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { SITE_NAVIGATION, HEADER_NAVIGATION, getNavigationCopy, navigationLabel, isNavigationSectionActive, isNavigationPath } from '../lib/site-navigation.ts'
import { getNavigationAccountCopy } from '../lib/i18n/navigation-account-copy.ts'
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
function dictionary(locale) {
  const source = ts.transpileModule(read(`lib/i18n/dictionaries/${locale}.ts`), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}
  new Function('exports', 'require', source)(exports, () => ({ default: dictionary('en') }))
  return exports.default
}
assert.deepEqual(SITE_NAVIGATION.map(s => s.id), ['skills', 'categories', 'rankings', 'creators', 'resources', 'developers'])
assert.equal(SITE_NAVIGATION.filter(s => s.items).length, 4)
const links = SITE_NAVIGATION.flatMap(s => [s, ...(s.items || [])])
assert.deepEqual(HEADER_NAVIGATION.map(s => s.id), ['skills', 'rankings', 'creators', 'resources'])
const headerLinks = HEADER_NAVIGATION.flatMap(s => [s, ...(s.items || [])])
for (const link of links) assert.ok(headerLinks.some(item => item.href === link.href), `Keep existing navigation destination ${link.href}`)
for (const oldSection of SITE_NAVIGATION) {
  for (const path of [oldSection.href, ...(oldSection.activePaths || [])]) {
    assert.ok(HEADER_NAVIGATION.some(section => isNavigationSectionActive(path, section)), `Keep active navigation on ${path}`)
  }
}
for (const link of links) assert.ok(read('app' + link.href + '/page.tsx').length)
for (const locale of ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id']) {
  const nav = dictionary(locale).nav
  for (const link of headerLinks) assert.ok(navigationLabel(link, locale, nav, 'Gallery')?.trim())
  for (const value of Object.values(getNavigationCopy(locale))) assert.ok(value.trim())
  for (const value of Object.values(getNavigationAccountCopy(locale))) assert.ok(value.trim())
}
assert.ok(isNavigationPath('/zh/skills?sort=stars', '/skills'))
assert.ok(!isNavigationPath('/creators', '/creator'))
assert.ok(isNavigationSectionActive('/trending', SITE_NAVIGATION[2]))
assert.ok(isNavigationSectionActive('/ja/resolve', SITE_NAVIGATION[0]))
for (const path of ['components/site-header.tsx', 'components/mobile-nav.tsx']) {
  const source = read(path)
  assert.match(source, /HEADER_NAVIGATION\.map/)
  assert.match(source, /prefetch=\{false\}/)
  for (const control of ['GitHubStarButton', 'LanguageSwitcher', 'HeaderNavigationContent', 'NavUserMenu']) assert.ok(source.includes(control))
}
const account = read('components/nav-user-menu.tsx')
assert.match(account, /onAuthStateChange/)
assert.ok(!account.includes('auth.getUser('), 'Public navigation must not introduce a user verification request')
for (const href of ['/auth/login?next=', '/auth/sign-up?next=', '/profile', '/creator']) assert.ok(account.includes(href))
assert.match(read('components/mobile-nav.tsx'), /t\.nav\.submitSkill/)
const footer = read('components/site-footer.tsx')
for (const href of ['/skills','/showcase','/skills/new','/agent-skills','/agent-skill','/ai-agent-skills','/tasks','/skill-packs','/best','/trending','/collections','/use-cases','/agents','/agent','/compare','/safety','/agent-skills-registry','/rankings','/outcomes','/audits','/official','/reports/weekly','/reports/monthly','/reports/state-of-agent-skills-2026','/compare/openagentskill-vs-skills-sh','/alternatives/agentskills-io','/docs','/about','/contact','/api-docs','/llms.txt','/openapi.json','/cli','/creator-kit','/creators','/x-kit','/submit','/blog','/guides','/activity']) assert.ok(footer.includes(`href="${href}"`), `Preserve footer destination ${href}`)
assert.equal((footer.match(/<details /g) || []).length, 3)
assert.match(read('components/navigation-hub-links.tsx'), /\/agent\/integration-kit/)
assert.match(read('app/creators/page.tsx'), /NavigationHubLinks hub="creators"/)
console.log('Navigation hierarchy, 8 languages, route preservation and shared mobile/desktop checks passed.')
