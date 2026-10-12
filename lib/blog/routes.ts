// Keep routing independent of article copy: the header and proxy also use it.
export const CREATOR_BLOG_SLUG = 'ai-skills-for-content-creators'
// Editorial date is recorded in the publisher's time zone, not a future UTC midnight.
export const CREATOR_BLOG_DATE = '2026-10-10T00:28:00+08:00'
export const REA_BLOG_SLUG = 'rea-reverse-engineering-skill-guide'
export const REA_BLOG_DATE = '2026-10-12T00:57:00+08:00'
export const LOCALIZED_BLOG_SLUGS = [CREATOR_BLOG_SLUG, REA_BLOG_SLUG] as const
export const BLOG_LOCALES = ['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id'] as const
export type BlogLocale = (typeof BLOG_LOCALES)[number]

export function isLocalizedBlogPath(path: string) {
  const normalized = path.replace(/^\//, '').replace(/\/$/, '')
  return LOCALIZED_BLOG_SLUGS.some(slug => normalized === `blog/${slug}`)
}

export function localizedBlogPath(slug: string, locale: BlogLocale) {
  return `${locale === 'en' ? '' : `/${locale}`}/blog/${slug}`
}

export function reaBlogPath(locale: BlogLocale) { return localizedBlogPath(REA_BLOG_SLUG, locale) }
export function reaBlogAlternates(origin = 'https://www.openagentskill.com') {
  return { ...Object.fromEntries(BLOG_LOCALES.map(locale => [locale, `${origin}${reaBlogPath(locale)}`])), 'x-default': `${origin}${reaBlogPath('en')}` }
}
export function reaBlogSitemapEntries(origin = 'https://www.openagentskill.com') {
  return BLOG_LOCALES.map(locale => ({ url: `${origin}${reaBlogPath(locale)}`, lastModified: REA_BLOG_DATE,
    changeFrequency: 'monthly' as const, priority: 0.8, alternates: { languages: reaBlogAlternates(origin) } }))
}

export function creatorBlogPath(locale: BlogLocale) {
  return `${locale === 'en' ? '' : `/${locale}`}/blog/${CREATOR_BLOG_SLUG}`
}

export function creatorBlogAlternates(origin = 'https://www.openagentskill.com') {
  return {
    ...Object.fromEntries(BLOG_LOCALES.map(locale => [locale, `${origin}${creatorBlogPath(locale)}`])),
    'x-default': `${origin}${creatorBlogPath('en')}`,
  }
}

export function creatorBlogSitemapEntries(origin = 'https://www.openagentskill.com') {
  return BLOG_LOCALES.map(locale => ({
    url: `${origin}${creatorBlogPath(locale)}`,
    lastModified: CREATOR_BLOG_DATE,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
    alternates: { languages: creatorBlogAlternates(origin) },
  }))
}
