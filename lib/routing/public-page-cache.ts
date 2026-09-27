// Only parameters that change server-rendered content need a dynamic render.
// Tracking parameters and Next's _rsc transport key must not bust the page cache.
const DIRECTORY_KEYS = new Set(['q', 'sort', 'category', 'useCase', 'platform', 'quality', 'trust', 'safety', 'track', 'minStars', 'page', 'view'])
const CORE_KEYS = new Set(['q', 'task', 'agent', 'max_risk', 'min_stars'])
const LOCALES = new Set(['en', 'zh', 'ja', 'ko', 'es', 'de', 'fr', 'id'])
const CORE_PAGES = new Set(['resolve', 'skills', 'tasks', 'skill-packs', 'compare', 'api-docs', 'agent-skill', 'agent-skills-registry', 'docs'])
const RESERVED_SKILL_PATHS = new Set(['external', 'new'])

function hasContentQuery(query: URLSearchParams, keys: Set<string>) {
  // Page renderers consistently consume the first value of repeated keys.
  return [...keys].some(key => Boolean(query.get(key)?.trim()))
}

export function publicPageRewrite(pathname: string, query: URLSearchParams): string | null {
  const parts = pathname.split('/').filter(Boolean)
  const pathLocale = parts.length === 2 && parts[0] !== 'en' && LOCALES.has(parts[0]) ? parts[0] : null
  const directory = pathname === '/skills' || (pathLocale && parts[1] === 'skills')
  if (directory && hasContentQuery(query, DIRECTORY_KEYS)) {
    return `/internal-render/skills/${pathLocale || 'en'}`
  }
  if (pathLocale && CORE_PAGES.has(parts[1]) && hasContentQuery(query, CORE_KEYS)) {
    return `/internal-render/core/${pathLocale}/${parts[1]}`
  }
  const lang = query.get('lang')
  // A locale gets its own ISR entry; never cache one language under another.
  if (parts.length === 2 && parts[0] === 'skills' && !RESERVED_SKILL_PATHS.has(parts[1]) && lang && lang !== 'en' && LOCALES.has(lang)) {
    return `/internal-render/skill/${lang}/${parts[1]}`
  }
  return null
}

export function publicPageQueryVariant(pathname: string, query: URLSearchParams) {
  const isPublicPage = /^\/skills(?:\/[^/]+)?\/?$/.test(pathname)
    || /^\/(zh|ja|ko|es|de|fr|id)\/(resolve|skills|tasks|skill-packs|compare|api-docs|agent-skill|agent-skills-registry|docs)\/?$/.test(pathname)
  return isPublicPage && [...query.keys()].some(key => key !== '_rsc')
}
