// Keep this dependency-free: it runs on every matched proxy request.
const localizedCore = /^\/(zh|ja|ko|es|de|fr|id)\/(resolve|skills|tasks|skill-packs|compare|api-docs|agent-skill|agent-skills-registry|docs)$/

export function publicQueryRoute(pathname: string, query: URLSearchParams): string | null {
  // _rsc is framework transport state, not a user filter. Treating it as a
  // filter would make every client navigation bypass the public route cache.
  if (![...query.keys()].some(key => key !== '_rsc')) return null
  const detail = /^\/skills\/[^/]+$/.test(pathname) && !['/skills/new', '/skills/external'].includes(pathname)
  if (pathname === '/skills' || detail || localizedCore.test(pathname)) {
    return `/render-query${pathname}`
  }
  return null
}
