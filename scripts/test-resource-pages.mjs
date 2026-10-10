import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ArticleMarkdown } from '../components/blog/article-markdown.tsx'
import { RESOURCE_PAGES, RESOURCE_SITE, getResourceMetadata, resourceMetadata, breadcrumbData, jsonLd } from '../lib/seo/resource-pages.ts'

const titles = new Set()
for (const [key, page] of Object.entries(RESOURCE_PAGES)) {
  const metadata = getResourceMetadata(key)
  assert.equal(metadata.alternates.canonical, `${RESOURCE_SITE}${page.path}`)
  assert.equal(metadata.openGraph.url, metadata.alternates.canonical)
  assert.equal(metadata.openGraph.description, metadata.description)
  assert.equal(metadata.twitter.title, metadata.openGraph.title)
  assert.equal(metadata.twitter.description, metadata.description)
  assert.ok(!titles.has(metadata.title), `${key} needs its own title`)
  titles.add(metadata.title)
  if (key === 'docs' || key === 'api') {
    assert.equal(Object.keys(metadata.alternates.languages).length, 9)
    assert.equal(metadata.alternates.languages.en, metadata.alternates.canonical)
    assert.equal(metadata.alternates.languages.zh, `${RESOURCE_SITE}/zh${page.path}`)
  } else assert.equal(metadata.alternates.languages, undefined, 'Do not advertise nonexistent translations')
}
const article = resourceMetadata({ title: 'An article', description: 'A real summary', path: '/blog/example', article: true, publishedTime: '2026-10-10' })
assert.equal(article.openGraph.type, 'article')
assert.equal(article.openGraph.publishedTime, '2026-10-10')
const crumbs = breadcrumbData([{ name: 'Guides', path: '/guides' }, { name: '</script><script>bad</script>', path: '/guides/example' }])
assert.equal(crumbs.itemListElement[1].position, 2)
assert.ok(!jsonLd(crumbs).includes('<'))
assert.deepEqual(JSON.parse(jsonLd(crumbs)), crumbs)

const markdown = '# Duplicate title\n\n## A section\n\n- First\n- Second\n\n```html\n<script>alert(1)</script>\n```\n\n<script>alert(2)</script>\n\n[Bad](javascript:alert(3))\n\n[Source](https://github.com/example/repo)\n\n| Column | Value |\n| --- | --- |\n| One | Two |'
const html = renderToStaticMarkup(createElement('article', null, createElement('h1', null, 'Article title'), createElement(ArticleMarkdown, { content: markdown })))
assert.equal((html.match(/<h1>/g) || []).length, 1)
assert.ok(html.includes('<h2>Duplicate title</h2>'))
assert.ok(html.includes('<ul>') && html.includes('<li>First</li>'))
assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'Code examples must be displayed as text')
assert.ok(!html.includes('<script') && !html.includes('href="javascript:'), 'Untrusted Markdown must not execute HTML or script URLs')
assert.ok(html.includes('href="https://github.com/example/repo"'))
assert.ok(html.includes('aria-label="Article table"') && html.includes('<table>'))
console.log('Resource metadata, real translation alternates, safe JSON-LD, and article Markdown regressions passed.')
