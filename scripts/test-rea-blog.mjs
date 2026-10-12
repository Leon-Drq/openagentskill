import assert from 'node:assert/strict'
import { BLOG_LOCALES, REA_BLOG_SLUG, REA_BLOG_DATE, reaBlogPath, reaBlogAlternates, reaBlogSitemapEntries, isLocalizedBlogPath } from '../lib/blog/routes.ts'
import { REA_ARTICLE_COPY, REA_ARTICLE_SOURCES, REA_REPOSITORY_COMMIT, REA_SKILL_SLUG, reaArticleMetadata, reaArticleSchema, reaArticleMarkdown, reaArticleText } from '../lib/blog/rea-guide.ts'
import { getLanguageSwitchHref, getLocalizedNavigationHref } from '../lib/i18n/market-routing.ts'
import { STATIC_BLOG_POSTS } from '../lib/blog/static-posts.ts'

const origin = 'https://www.openagentskill.com'
const ids = ['what-is-rea', 'skill-mcp-cli', 'choose-target', 'setup', 'first-investigation', 'evidence', 'faq']
const commands = [
  'npx rea-agents@6.4.0 setup --client codex --dry-run --json',
  'npx rea-agents@6.4.0 setup --client codex',
  'npx rea-agents@6.4.0 doctor --client codex --json',
  'npx rea-agents@6.4.0 analyze-javascript-application /absolute/path/to/app --json > app-evidence.json',
]
assert.match(REA_REPOSITORY_COMMIT, /^[a-f0-9]{40}$/)
assert.ok(Date.parse(REA_BLOG_DATE) <= Date.now(), 'Never publish a future editorial date')
for (const key of ['README', 'SKILL', 'INSTALL', 'CLI']) assert.ok(REA_ARTICLE_SOURCES[key].includes('/blob/' + REA_REPOSITORY_COMMIT + '/'))
for (const locale of BLOG_LOCALES) {
  const copy = REA_ARTICLE_COPY[locale]
  assert.deepEqual(Object.keys(copy).sort(), Object.keys(REA_ARTICLE_COPY.en).sort())
  assert.deepEqual(copy.sections.map(s => s.id), ids)
  assert.doesNotMatch(JSON.stringify(copy), /\uFFFD|TODO|Lorem ipsum/)
  for (const section of copy.sections) {
    assert.ok(section.body.length > 200, locale + ': substantive section ' + section.id)
    if (locale !== 'en') assert.notEqual(section.body, REA_ARTICLE_COPY.en.sections.find(s => s.id === section.id).body)
  }
  if (locale !== 'en') {
    assert.notEqual(copy.title, REA_ARTICLE_COPY.en.title)
    assert.notEqual(copy.method, REA_ARTICLE_COPY.en.method)
  }
  const markdown = reaArticleMarkdown(locale)
  assert.doesNotMatch(markdown, /\{\{\w+\}\}/, 'Resolve source references before rendering')
  for (const source of Object.values(REA_ARTICLE_SOURCES)) assert.ok(markdown.includes(source))
  for (const command of commands) assert.ok(markdown.includes(command), locale + ': consistent pinned commands')
  assert.ok(markdown.includes(REA_REPOSITORY_COMMIT))
  assert.ok(markdown.includes('/skills/' + REA_SKILL_SLUG))
  const url = origin + reaBlogPath(locale), metadata = reaArticleMetadata(locale)
  assert.equal(metadata.alternates.canonical, url)
  assert.deepEqual(metadata.alternates.languages, reaBlogAlternates())
  assert.equal(Object.keys(metadata.alternates.languages).length, 9)
  assert.equal(metadata.title, copy.title)
  assert.equal(metadata.description, copy.summary)
  assert.equal(metadata.openGraph.url, url)
  assert.equal(metadata.openGraph.type, 'article')
  const [article, breadcrumbs] = reaArticleSchema(locale)
  assert.equal(article['@type'], 'BlogPosting')
  assert.equal(article.url, url)
  assert.equal(article.headline, copy.title)
  assert.equal(article.author['@type'], 'Organization')
  assert.equal(article.inLanguage, locale === 'zh' ? 'zh-CN' : locale)
  assert.deepEqual(article.citation, Object.values(REA_ARTICLE_SOURCES))
  assert.equal(breadcrumbs.itemListElement[1].item, url)
  assert.equal(breadcrumbs.itemListElement[0].item, origin + getLocalizedNavigationHref('/blog', locale))
  const entry = reaBlogSitemapEntries().find(s => s.url === url)
  assert.ok(entry)
  assert.deepEqual(entry.alternates.languages, metadata.alternates.languages)
  for (const destination of BLOG_LOCALES) {
    assert.equal(getLocalizedNavigationHref(reaBlogPath(locale), destination), reaBlogPath(destination))
    assert.equal(getLanguageSwitchHref(reaBlogPath(locale), destination), reaBlogPath(destination))
  }
}
assert.equal(reaArticleText('README: {{README}}'), 'README: ' + REA_ARTICLE_SOURCES.README)
assert.equal(isLocalizedBlogPath('/blog/' + REA_BLOG_SLUG + '/'), true)
assert.equal(isLocalizedBlogPath('/blog/' + REA_BLOG_SLUG + '/extra'), false)
assert.equal(getLocalizedNavigationHref(reaBlogPath('en') + '?lang=ja&utm_source=qa#setup', 'zh'), reaBlogPath('zh') + '?utm_source=qa#setup')
const posts = STATIC_BLOG_POSTS.filter(p => p.slug === REA_BLOG_SLUG)
assert.equal(posts.length, 1)
assert.equal(posts[0].skills, null, 'Do not impersonate the repository author')
assert.equal(posts[0].content, reaArticleMarkdown('en'))
console.log('REA blog: 8 full translations, pinned sources/commands, 64 language transitions, metadata, schema, editorial attribution and sitemap passed.')
