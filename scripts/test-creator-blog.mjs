import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { BLOG_LOCALES, CREATOR_BLOG_SLUG, creatorBlogPath, creatorBlogAlternates, creatorBlogSitemapEntries, isLocalizedBlogPath } from '../lib/blog/routes.ts'
import { CREATOR_ARTICLE_COPY, CREATOR_WORKFLOWS, creatorArticleMetadata, creatorArticleSchema, creatorArticleMarkdown, creatorSourceUrl } from '../lib/blog/creator-workflows.ts'
import { getLanguageSwitchHref, getLocalizedNavigationHref } from '../lib/i18n/market-routing.ts'
import { STATIC_BLOG_POSTS } from '../lib/blog/static-posts.ts'

const origin = 'https://www.openagentskill.com'
const slugs = CREATOR_WORKFLOWS.map(tool => tool.id).sort()
assert.equal(CREATOR_WORKFLOWS.length, 12)
assert.equal(new Set(slugs).size, 12)
for (const tool of CREATOR_WORKFLOWS) {
  assert.match(tool.commit, /^[a-f0-9]{40}$/)
  assert.ok(tool.path.endsWith('SKILL.md'))
  assert.equal(new URL(creatorSourceUrl(tool)).hostname, 'github.com')
  assert.ok(Number.isInteger(tool.group) && tool.group >= 0 && tool.group < 4)
}

const sitemap = creatorBlogSitemapEntries()
for (const locale of BLOG_LOCALES) {
  const copy = CREATOR_ARTICLE_COPY[locale]
  assert.deepEqual(Object.keys(copy).sort(), Object.keys(CREATOR_ARTICLE_COPY.en).sort())
  assert.deepEqual(Object.keys(copy.tools).sort(), slugs, `${locale}: no omitted tool translations`)
  assert.equal(copy.groups.length, 4)
  assert.equal(copy.stacks.length, 3)
  assert.equal(copy.method.length, 3)
  for (const key of slugs) {
    for (const field of ['use', 'check']) {
      assert.ok(copy.tools[key][field].length > 35, `${locale}/${key}: substantive ${field}`)
      if (locale !== 'en') assert.notEqual(copy.tools[key][field], CREATOR_ARTICLE_COPY.en.tools[key][field])
    }
  }
  assert.doesNotMatch(JSON.stringify(copy), /\uFFFD|TODO|Lorem ipsum/)
  const url = origin + creatorBlogPath(locale)
  const metadata = creatorArticleMetadata(locale)
  const schema = creatorArticleSchema(locale)
  assert.equal(metadata.alternates.canonical, url)
  assert.deepEqual(metadata.alternates.languages, creatorBlogAlternates())
  assert.equal(Object.keys(metadata.alternates.languages).length, 9)
  assert.equal(metadata.openGraph.url, url)
  assert.equal(metadata.openGraph.type, 'article')
  assert.equal(schema.url, url)
  assert.equal(schema.headline, copy.title)
  assert.equal(schema.inLanguage, locale === 'zh' ? 'zh-CN' : locale)
  assert.equal(schema.citation.length, 14)
  assert.equal(schema.author['@type'], 'Organization')
  assert.ok(creatorArticleMarkdown(locale).includes(copy.tools.xarticle.check))
  const entry = sitemap.find(entry => entry.url === url)
  assert.ok(entry, `${locale}: article discoverable in sitemap`)
  assert.deepEqual(entry.alternates.languages, metadata.alternates.languages)
  for (const destination of BLOG_LOCALES) {
    assert.equal(getLocalizedNavigationHref(creatorBlogPath(locale), destination), creatorBlogPath(destination))
    assert.equal(getLanguageSwitchHref(creatorBlogPath(locale), destination), creatorBlogPath(destination))
  }
}
assert.equal(getLocalizedNavigationHref(`/blog/${CREATOR_BLOG_SLUG}?lang=ja&utm_source=news#method`, 'zh'), `/zh/blog/${CREATOR_BLOG_SLUG}?utm_source=news#method`)
assert.equal(isLocalizedBlogPath('/blog/introducing-addyosmani-agent-skills'), false, 'Do not invent translations for legacy posts')
assert.equal(isLocalizedBlogPath(`/blog/${CREATOR_BLOG_SLUG}/extra`), false)
assert.equal(isLocalizedBlogPath(`/blog/${CREATOR_BLOG_SLUG}/`), true)
assert.equal(STATIC_BLOG_POSTS.filter(post => post.slug === CREATOR_BLOG_SLUG).length, 1)
assert.equal(STATIC_BLOG_POSTS.find(post => post.slug === CREATOR_BLOG_SLUG).skills, null, 'Editorial authorship must not impersonate a Skill creator')
assert.ok(readFileSync('proxy.ts', 'utf8').includes('isLocalizedBlogPath(pathname)'))
assert.ok(readFileSync('lib/seo/sitemap.ts', 'utf8').includes('...creatorBlogSitemapEntries(SITEMAP_BASE_URL)'))
console.log('Creator blog: 8 full translations, 12 pinned sources, 64 language transitions, metadata, schema, sitemap and legacy route boundaries passed.')
