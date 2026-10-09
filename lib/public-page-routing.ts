// Keep this dependency-free: it runs on every matched proxy request.
const localizedCore = /^\/(zh|ja|ko|es|de|fr|id)\/(resolve|skills|tasks|skill-packs|compare|api-docs|agent-skill|agent-skills-registry|docs)$/

// Attribution and framework transport do not change the document. Keep these
// URLs on the canonical ISR route, with its canonical metadata and cache.
export function isContentQueryKey(key: string) {
  return key !== '_rsc' && !/^(utm_.+|ref|gclid|dclid|fbclid|msclkid|gbraid|wbraid)$/i.test(key)
}

export function hasContentQuery(query: URLSearchParams) {
  return [...query.keys()].some(isContentQueryKey)
}

export function publicQueryRoute(pathname: string, query: URLSearchParams): string | null {
  // Directories already render at request time. Keep filters on the same route
  // segment so the client preserves its search, sidebar and scroll position.
  if (pathname === '/skills' || /^\/(zh|ja|ko|es|de|fr|id)\/skills$/.test(pathname)) return null
  // _rsc is framework transport state, not a user filter. Treating it as a
  // filter would make every client navigation bypass the public route cache.
  if (!hasContentQuery(query)) return null
  const detail = /^\/skills\/[^/]+$/.test(pathname) && !['/skills/new', '/skills/external'].includes(pathname)
  const report = /^\/skills\/[^/]+\/(audit|evals)$/.test(pathname)
  if (detail || report || localizedCore.test(pathname)) {
    return `/render-query${pathname}`
  }
  return null
}
