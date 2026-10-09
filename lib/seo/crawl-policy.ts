import { hasContentQuery } from '../public-page-routing'

/** Keep interactive filters usable without advertising an unbounded URL graph. */
export function crawlLinkRel(href: string, rel?: string) {
  let url: URL
  try { url = new URL(href, 'https://www.openagentskill.com') } catch { return rel }
  if (!['openagentskill.com', 'www.openagentskill.com'].includes(url.hostname)) return rel
  const utility = /^\/(api|render-query)(\/|$)/.test(url.pathname)
  const variants = /^\/(?:(?:zh|ja|ko|es|de|fr|id)\/)?(?:skills|resolve|compare)$/.test(url.pathname)
    || /^\/skills\/[^/]+$/.test(url.pathname)
  if (!utility && !(variants && hasContentQuery(url.searchParams))) return rel
  return [...new Set([...(rel || '').split(/\s+/).filter(Boolean), 'nofollow'])].join(' ')
}
