import { directoryBrowseVariant } from './skills/browse-cache'

const locales = new Set(['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id'])
const ignored = (key: string) => key === '_rsc' || /^(utm_.+|ref|gclid|dclid|fbclid|msclkid|gbraid|wbraid)$/i.test(key)

/** Finite public locale/browse states. Arbitrary searches remain dynamic. */
export function publicCachedRoute(path: string, query: URLSearchParams): string | null {
  const directory = path.match(/^\/(?:(zh|ja|ko|es|de|fr|id)\/)?skills$/)
  if (directory && [...query.keys()].every(ignored)) {
    return `/cached-public/${directory[1] || 'en'}/skills`
  }
  if (directory) {
    const browseQuery = new URLSearchParams(query)
    const locale = directory[1] || 'en'
    if (query.getAll('lang').length === 1 && query.get('lang') === locale) browseQuery.delete('lang')
    if (locale === 'en' && [...browseQuery.keys()].every(ignored)) return '/cached-public/en/skills'
    const variant = directoryBrowseVariant(browseQuery)
    if (variant) return `/cached-public/${directory[1] || 'en'}/directory/${variant.key}`
  }
  // Older navigation can repeat the path locale as ?lang=zh. It changes the
  // existing robots metadata, but not the content; retain one noindex variant.
  const core = path.match(/^\/(zh|ja|ko|es|de|fr|id)\/(resolve|tasks|skill-packs|compare|api-docs|agent-skill|agent-skills-registry|docs)$/)
  if (core && query.getAll('lang').length === 1 && query.get('lang') === core[1] &&
      [...query.keys()].every(key => key === 'lang' || ignored(key))) {
    return `/cached-public/${core[1]}/core/${core[2]}`
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
