import { trackAnalyticsEvent } from './analytics'

const socialHosts = ['x.com', 'twitter.com', 'linkedin.com', 'youtube.com', 'youtu.be', 'discord.com', 'discord.gg', 't.me', 'bsky.app']
const marketplaceHosts = ['skillry.dev', 'skillry.app', 'skillry.ai', 'skills.sh', 'clawhub.ai', 'skillsmp.com', 'lobehub.com']
const docsHosts = ['remotion.dev', 'mcp.scenario.com', 'vercel.com', 'nextjs.org', 'modelcontextprotocol.io']
const belongsTo = (host: string, domains: string[]) => domains.some(domain => host === domain || host.endsWith(`.${domain}`))
const siteHost = (host: string) => host.toLowerCase().replace(/^www\./, '')

/** Only public destination domains and bounded intent labels leave the browser.
 * Never collect link text, URL paths, queries, fragments or credential-bearing URLs. */
export function outboundParameters(href: string, currentUrl: string, target: string, placement: string) {
  try {
    const url = new URL(href, currentUrl)
    const current = new URL(currentUrl)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      siteHost(url.hostname) === siteHost(current.hostname) ||
      /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname) ||
      url.hostname.endsWith('.local') || url.hostname.includes(':')) return null
    const host = siteHost(url.hostname)
    return {
      outbound_domain: host,
      outbound_type: belongsTo(host, ['github.com', 'github.io']) ? 'github'
        : belongsTo(host, socialHosts) ? 'social'
        : belongsTo(host, marketplaceHosts) ? 'marketplace'
        : belongsTo(host, docsHosts) || host.startsWith('docs.') ? 'docs' : 'other',
      target: target === '_blank' ? 'new_tab' : 'same_tab',
      placement: ['header', 'footer', 'main'].includes(placement) ? placement : 'other',
    }
  } catch { return null }
}

export function mountOutboundLinkTracker(root: Document = document) {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || (event.type === 'click' ? event.button !== 0 : event.button !== 1)) return
    const element = event.target instanceof Element ? event.target : (event.target as Node | null)?.parentElement
    const anchor = element?.closest('a[href]')
    if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download')) return
    const placement = anchor.closest('header') ? 'header' : anchor.closest('footer') ? 'footer' : anchor.closest('main') ? 'main' : 'other'
    const parameters = outboundParameters(anchor.href, window.location.href, anchor.target, placement)
    if (parameters) {
      try { trackAnalyticsEvent('outbound_link_click', parameters) } catch { /* Measurement must never interrupt navigation. */ }
    }
  }
  root.addEventListener('click', onClick)
  root.addEventListener('auxclick', onClick)
  return () => {
    root.removeEventListener('click', onClick)
    root.removeEventListener('auxclick', onClick)
  }
}
