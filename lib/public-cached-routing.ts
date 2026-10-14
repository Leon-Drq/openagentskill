const locales = new Set(['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id'])
const ignored = (key: string) => key === '_rsc' || /^(utm_.+|ref|gclid|dclid|fbclid|msclkid|gbraid|wbraid)$/i.test(key)

/** A finite locale key space. Filters remain on their existing dynamic route. */
export function publicCachedRoute(path: string, query: URLSearchParams): string | null {
  const directory = path.match(/^\/(?:(zh|ja|ko|es|de|fr|id)\/)?skills$/)
  if (directory && [...query.keys()].every(ignored)) {
    return `/cached-public/${directory[1] || 'en'}/skills`
  }
  const detail = path.match(/^\/skills\/([^/]+)(\/(?:audit|evals))?$/)
  if (detail && !['new', 'external'].includes(detail[1]) && query.has('lang') &&
      query.getAll('lang').length === 1 && locales.has(query.get('lang')!) &&
      [...query.keys()].every(key => key === 'lang' || ignored(key))) {
    return `/cached-public/${query.get('lang')}/skills/${detail[1]}${detail[2] || ''}`
  }
  if (['/contact', '/sponsor'].includes(path) &&
      [...query.keys()].every(key => key === 'lang' || ignored(key)) &&
      (!query.has('lang') || (query.getAll('lang').length === 1 && locales.has(query.get('lang')!)))) {
    const locale = query.get('lang') || 'en'
    // Auxiliary pages historically noindex every attributed/query URL. Keep
    // that policy in a second finite English variant, separate from canonical.
    const variant = locale === 'en' && [...query.entries()].some(([key, value]) => key !== '_rsc' && Boolean(value)) ? '-variant' : ''
    return `/cached-public/${locale}${path}${variant}`
  }
  return null
}

export function isPublicCacheLocale(locale: string) { return locales.has(locale) }
