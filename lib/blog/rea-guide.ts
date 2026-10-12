import type { Metadata } from 'next'
import { REA_BLOG_DATE, reaBlogPath, reaBlogAlternates, type BlogLocale } from './routes'
import en from './rea-guide.en.json'
import zh from './rea-guide.zh.json'
import ja from './rea-guide.ja.json'
import ko from './rea-guide.ko.json'
import es from './rea-guide.es.json'
import de from './rea-guide.de.json'
import fr from './rea-guide.fr.json'
import id from './rea-guide.id.json'

export const REA_ARTICLE_COPY: Record<BlogLocale, typeof en> = { en, zh, ja, ko, es, de, fr, id }
export const REA_REPOSITORY_COMMIT = '23d50ea3bec186b4459d36c04854a92276accdf1'
export const REA_SKILL_SLUG = 'morluto-rea-reverse-engineer-anything'
const repository = `https://github.com/morluto/rea/blob/${REA_REPOSITORY_COMMIT}`
const origin = 'https://www.openagentskill.com'
export const REA_ARTICLE_SOURCES = {
  README: `${repository}/README.md`,
  SKILL: `${repository}/.agents/skills/reverse-engineer-anything/SKILL.md`,
  INSTALL: `${repository}/docs/installation.md`,
  CLI: `${repository}/docs/cli.md`,
  NOTION: 'https://rea.tools/showcase/notion/',
  DXBALL: 'https://rea.tools/showcase/dx-ball/',
  NPM: 'https://www.npmjs.com/package/rea-agents/v/6.4.0',
}
const ogLocales: Record<BlogLocale, string> = { en: 'en_US', zh: 'zh_CN', ja: 'ja_JP', ko: 'ko_KR', es: 'es_ES', de: 'de_DE', fr: 'fr_FR', id: 'id_ID' }

export function reaArticleText(text: string) {
  return text.replace(/\{\{(\w+)\}\}/g, (token, key: string) => REA_ARTICLE_SOURCES[key as keyof typeof REA_ARTICLE_SOURCES] || token)
}
export function reaArticleMarkdown(locale: BlogLocale) {
  const c = REA_ARTICLE_COPY[locale]
  return [...c.intro, ...c.sections.flatMap(s => [`## ${s.title}`, reaArticleText(s.body)]),
    `## ${c.methodTitle}`, reaArticleText(c.method), `[${c.cta}](${origin}/skills/${REA_SKILL_SLUG})`].join('\n\n')
}
export function reaArticleMetadata(locale: BlogLocale): Metadata {
  const c = REA_ARTICLE_COPY[locale], url = origin + reaBlogPath(locale)
  return { title: c.title, description: c.summary,
    alternates: { canonical: url, languages: reaBlogAlternates() },
    other: { 'content-language': locale === 'zh' ? 'zh-CN' : locale },
    openGraph: { title: c.title, description: c.summary, type: 'article', url, locale: ogLocales[locale],
      alternateLocale: Object.values(ogLocales).filter(value => value !== ogLocales[locale]), publishedTime: REA_BLOG_DATE, modifiedTime: REA_BLOG_DATE },
    twitter: { card: 'summary', title: c.title, description: c.summary },
  }
}
export function reaArticleSchema(locale: BlogLocale) {
  const c = REA_ARTICLE_COPY[locale], url = origin + reaBlogPath(locale)
  return [{ '@context': 'https://schema.org', '@type': 'BlogPosting', '@id': `${url}#article`,
    headline: c.title, description: c.summary, url, mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: locale === 'zh' ? 'zh-CN' : locale, datePublished: REA_BLOG_DATE, dateModified: REA_BLOG_DATE,
    author: { '@type': 'Organization', name: 'OpenAgentSkill', url: `${origin}/about` },
    publisher: { '@type': 'Organization', name: 'OpenAgentSkill', url: origin }, citation: Object.values(REA_ARTICLE_SOURCES),
    about: { '@type': 'SoftwareApplication', name: 'REA — Reverse Engineer Anything', url: 'https://github.com/morluto/rea', applicationCategory: 'DeveloperApplication' },
  }, { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: c.blogLabel, item: `${origin}/blog${locale === 'en' ? '' : `?lang=${locale}`}` },
    { '@type': 'ListItem', position: 2, name: c.title, item: url },
  ] }]
}
