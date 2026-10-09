import type { Metadata } from 'next'
import type { BlogLocale } from '@/lib/blog/routes'
import { CREATOR_BLOG_DATE, creatorBlogAlternates, creatorBlogPath } from '@/lib/blog/routes'
import sources from './creator-workflow-sources.json'
import en from './creator-workflows.en.json'
import zh from './creator-workflows.zh.json'
import ja from './creator-workflows.ja.json'
import ko from './creator-workflows.ko.json'
import es from './creator-workflows.es.json'
import de from './creator-workflows.de.json'
import fr from './creator-workflows.fr.json'
import id from './creator-workflows.id.json'

export const CREATOR_ARTICLE_COPY: Record<BlogLocale, typeof en> = { en, zh, ja, ko, es, de, fr, id }
export type CreatorToolId = keyof typeof en.tools
export const CREATOR_WORKFLOWS = sources as Array<{
  id: CreatorToolId; name: string; group: number; repository: string
  path: string; commit: string; registrySlug: string | null
}>
export const CREATOR_DISCOVERY_SOURCE = 'https://x.com/xaiwind/status/2108205644033806837'
export const CREATOR_APP_SOURCE = 'https://github.com/fxyadela/write-then-publish/tree/6ff00b06ae0f04aa119449a037a4a1c83e03c8ae'
const SITE_URL = 'https://www.openagentskill.com'
const OG_LOCALES: Record<BlogLocale, string> = { en: 'en_US', zh: 'zh_CN', ja: 'ja_JP', ko: 'ko_KR', es: 'es_ES', de: 'de_DE', fr: 'fr_FR', id: 'id_ID' }

export function creatorSourceUrl(tool: (typeof CREATOR_WORKFLOWS)[number]) {
  return `https://github.com/${tool.repository}/blob/${tool.commit}/${tool.path}`
}

export function creatorArticleMetadata(locale: BlogLocale): Metadata {
  const copy = CREATOR_ARTICLE_COPY[locale]
  const url = `${SITE_URL}${creatorBlogPath(locale)}`
  return {
    title: copy.title,
    description: copy.summary,
    alternates: { canonical: url, languages: creatorBlogAlternates() },
    other: { 'content-language': locale === 'zh' ? 'zh-CN' : locale },
    openGraph: {
      title: copy.title, description: copy.summary, type: 'article', url,
      publishedTime: CREATOR_BLOG_DATE, modifiedTime: CREATOR_BLOG_DATE,
      locale: OG_LOCALES[locale], alternateLocale: Object.values(OG_LOCALES).filter(code => code !== OG_LOCALES[locale]),
    },
    twitter: { card: 'summary', title: copy.title, description: copy.summary },
  }
}

export function creatorArticleSchema(locale: BlogLocale) {
  const copy = CREATOR_ARTICLE_COPY[locale]
  const url = `${SITE_URL}${creatorBlogPath(locale)}`
  return {
    '@context': 'https://schema.org', '@type': 'BlogPosting', '@id': `${url}#article`,
    headline: copy.title, description: copy.summary, url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: locale === 'zh' ? 'zh-CN' : locale,
    datePublished: CREATOR_BLOG_DATE, dateModified: CREATOR_BLOG_DATE,
    author: { '@type': 'Organization', name: 'OpenAgentSkill', url: `${SITE_URL}/about` },
    publisher: { '@type': 'Organization', name: 'OpenAgentSkill', url: SITE_URL },
    citation: [...CREATOR_WORKFLOWS.map(creatorSourceUrl), CREATOR_DISCOVERY_SOURCE, CREATOR_APP_SOURCE],
  }
}

export function creatorArticleMarkdown(locale: BlogLocale) {
  const c = CREATOR_ARTICLE_COPY[locale]
  return [
    ...c.intro,
    ...c.groups.flatMap((group, index) => [
      `## ${group}`,
      ...CREATOR_WORKFLOWS.filter(tool => tool.group === index).flatMap(tool => [
        `### ${tool.name}`, c.tools[tool.id].use, `${c.checkLabel}: ${c.tools[tool.id].check}`,
        `[${c.sourceLabel}](${creatorSourceUrl(tool)})`,
      ]),
    ]),
    `## ${c.stacksTitle}`, ...c.stacks.flatMap(stack => [`### ${stack.title}`, stack.text]),
    `## ${c.briefTitle}`, c.brief, `## ${c.methodTitle}`, ...c.method,
    `[${c.creditLabel}](${CREATOR_DISCOVERY_SOURCE})`, `[${c.appSourceLabel}](${CREATOR_APP_SOURCE})`,
    `## ${c.nextTitle}`, c.nextText,
  ].join('\n\n')
}
