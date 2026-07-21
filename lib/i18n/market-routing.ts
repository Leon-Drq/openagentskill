import { isLocale, localePaths, type Locale } from '@/lib/i18n/config'

// These languages have dedicated versions of the core discovery routes. Keep
// this in one place so the switcher, sitemap, and static route generation all
// agree on which page variants actually exist.
export const MARKET_LOCALES = ['zh', 'ja', 'ko', 'es', 'de', 'fr', 'id'] as const
export type MarketLocale = (typeof MARKET_LOCALES)[number]

export const LOCALIZED_CORE_PAGE_SLUGS = [
  'resolve',
  'skills',
  'agent-skill',
  'agent-skills-registry',
  'docs',
] as const

export type LocalizedCorePageSlug = (typeof LOCALIZED_CORE_PAGE_SLUGS)[number]

// Submit is a full localized experience, but its page is implemented as a
// dedicated route because it includes a client-side review flow rather than a
// static registry page.
const LOCALIZED_EXPERIENCE_PAGE_SLUGS = ['submit'] as const

function hasDedicatedLocalizedRoute(page: string, locale: Locale) {
  return isMarketLocale(locale) && (
    isLocalizedCorePageSlug(page) ||
    LOCALIZED_EXPERIENCE_PAGE_SLUGS.includes(page as (typeof LOCALIZED_EXPERIENCE_PAGE_SLUGS)[number])
  )
}

function getDedicatedLocalizedPath(locale: MarketLocale, page: string) {
  return isLocalizedCorePageSlug(page)
    ? getLocalizedCorePath(locale, page)
    : `/${locale}/${page}`
}

function normalizePathname(pathname: string) {
  const path = pathname.split('?')[0]?.split('#')[0] || '/'
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized
}

function splitHref(href: string) {
  const hashIndex = href.indexOf('#')
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : ''
  const beforeHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href
  const queryIndex = beforeHash.indexOf('?')

  return {
    pathname: queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash,
    search: queryIndex >= 0 ? beforeHash.slice(queryIndex) : '',
    hash,
  }
}

function withLocalePreference(pathname: string, locale: Locale, search = '', hash = '', usePathLocale = false) {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)

  // A locale prefix is authoritative. Query-state is only used for pages that
  // do not have their own translated route yet.
  params.delete('lang')
  if (!usePathLocale && locale !== 'en') params.set('lang', locale)

  const query = params.toString()
  return `${pathname}${query ? `?${query}` : ''}${hash}`
}

export function isMarketLocale(locale: Locale): locale is MarketLocale {
  return MARKET_LOCALES.includes(locale as MarketLocale)
}

export function isLocalizedCorePageSlug(value: string): value is LocalizedCorePageSlug {
  return LOCALIZED_CORE_PAGE_SLUGS.includes(value as LocalizedCorePageSlug)
}

export function getBasePathname(pathname: string) {
  const normalized = normalizePathname(pathname)
  const segments = normalized.split('/').filter(Boolean)
  const [firstSegment, ...remainingSegments] = segments

  if (isLocale(firstSegment) && firstSegment !== 'en') {
    return remainingSegments.length ? `/${remainingSegments.join('/')}` : '/'
  }

  return normalized
}

export function getLocalizedCorePath(locale: MarketLocale, page: LocalizedCorePageSlug) {
  return `/${locale}/${page}`
}

export function getLocalizedNavigationHref(href: string, locale: Locale) {
  const { pathname, search, hash } = splitHref(href)
  const basePath = getBasePathname(pathname)
  if (basePath === '/') return withLocalePreference(localePaths[locale], locale, search, hash, true)
  const page = basePath.slice(1)

  if (locale === 'en') return withLocalePreference(basePath, locale, search, hash)
  if (hasDedicatedLocalizedRoute(page, locale)) {
    return withLocalePreference(getDedicatedLocalizedPath(locale, page), locale, search, hash, true)
  }

  // Keep the user on the requested destination when a full page translation is
  // not available. The language preference keeps shared navigation and UI copy
  // in sync without redirecting a deep link back to the homepage.
  return withLocalePreference(basePath, locale, search, hash)
}

export function getLanguageSwitchHref(pathname: string, nextLocale: Locale, search = '', hash = '') {
  const basePath = getBasePathname(pathname)
  if (basePath === '/') return withLocalePreference(localePaths[nextLocale], nextLocale, search, hash, true)

  const page = basePath.slice(1)
  if (nextLocale === 'en') return withLocalePreference(basePath, nextLocale, search, hash)
  if (hasDedicatedLocalizedRoute(page, nextLocale)) {
    return withLocalePreference(getDedicatedLocalizedPath(nextLocale, page), nextLocale, search, hash, true)
  }

  return withLocalePreference(basePath, nextLocale, search, hash)
}
