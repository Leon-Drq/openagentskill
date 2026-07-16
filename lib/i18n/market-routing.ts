import { isLocale, localePaths, type Locale } from '@/lib/i18n/config'

export const MARKET_LOCALES = ['de', 'es', 'id'] as const
export type MarketLocale = (typeof MARKET_LOCALES)[number]

export const LOCALIZED_CORE_PAGE_SLUGS = [
  'resolve',
  'skills',
  'agent-skill',
  'agent-skills-registry',
  'docs',
] as const

export type LocalizedCorePageSlug = (typeof LOCALIZED_CORE_PAGE_SLUGS)[number]

function normalizePathname(pathname: string) {
  const path = pathname.split('?')[0]?.split('#')[0] || '/'
  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized
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
  const basePath = getBasePathname(href)
  if (basePath === '/') return localePaths[locale]
  const page = basePath.slice(1)

  if (!isLocalizedCorePageSlug(page)) return basePath
  if (locale === 'en') return basePath
  if (isMarketLocale(locale)) return getLocalizedCorePath(locale, page)

  // The localized core page is not ready in this language yet. Preserve the real destination
  // instead of sending users to a translated homepage with no matching content.
  return basePath
}

export function getLanguageSwitchHref(pathname: string, nextLocale: Locale) {
  const basePath = getBasePathname(pathname)
  if (basePath === '/') return localePaths[nextLocale]

  const page = basePath.slice(1)
  // A language selection must always produce a visible locale change. Deep pages
  // without a localized equivalent use the target locale's landing page instead
  // of silently returning the same URL and leaving the UI in its old language.
  if (!isLocalizedCorePageSlug(page)) return localePaths[nextLocale]
  if (nextLocale === 'en') return basePath
  if (isMarketLocale(nextLocale)) return getLocalizedCorePath(nextLocale, page)

  // Avoid a mixed-language deep page until it has a real localized equivalent.
  return localePaths[nextLocale]
}
