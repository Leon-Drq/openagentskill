import { hasContentQuery, isContentQueryKey } from '../public-page-routing'

/** Keep interactive filters usable without advertising an unbounded URL graph. */
export function crawlLinkRel(href: string, rel?: string) {
  let url: URL
  try { url = new URL(href, 'https://www.openagentskill.com') } catch { return rel }
  if (!['openagentskill.com', 'www.openagentskill.com'].includes(url.hostname)) return rel
  const utility = /^\/(api|auth|profile|render-query|cached-public)(\/|$)/.test(url.pathname)
    || /^\/skills\/[^/]+\/(?:audit|evals)$/.test(url.pathname)
    || (/^\/alternatives\/[^/]+$/.test(url.pathname) && !['/alternatives/skills-sh', '/alternatives/agentskills-io'].includes(url.pathname))
  // Gallery pagination is a real, self-canonical sequence. Filters and locale
  // preferences elsewhere are UI states, including links emitted by the shared
  // header/footer on localized pages. Keep them usable without seeding a new
  // crawl graph on every destination. Attribution does not change a document.
  const contentKeys = [...url.searchParams.keys()].filter(isContentQueryKey)
  const galleryPage = url.pathname === '/showcase' && contentKeys.length === 1 && contentKeys[0] === 'page'
    && /^[1-9]\d*$/.test(url.searchParams.get('page') || '') && Number.isSafeInteger(Number(url.searchParams.get('page')))
  if (!utility && (!hasContentQuery(url.searchParams) || galleryPage)) return rel
  return [...new Set([...(rel || '').split(/\s+/).filter(Boolean), 'nofollow'])].join(' ')
}
