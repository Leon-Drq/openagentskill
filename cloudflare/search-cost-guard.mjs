import { createHash } from 'node:crypto'

export function isExpensiveDirectoryRequest(request) {
  if (!['GET', 'HEAD'].includes(request.method)) return false
  const url = new URL(request.url)
  if (!/^\/(?:zh\/|ja\/|ko\/|es\/|de\/|fr\/|id\/)?skills$/.test(url.pathname)) return false
  const facets = ['category', 'access', 'pricing', 'tag', 'output', 'useCase', 'platform', 'quality', 'trust', 'safety', 'track', 'minStars', 'featured', 'examples']
  return Boolean(url.searchParams.get('q')?.trim()) || facets.filter(key => {
    const value = url.searchParams.get(key)
    return value && !['all', 'false', '0'].includes(value)
  }).length > 1
}

// A platform-local counter bounds rapid traversal of the interactive URL graph.
// No database writes, stored addresses, UA assumptions, or account/payment limits.
export async function searchCostGuard(request, env, report = () => {}) {
  if (!isExpensiveDirectoryRequest(request)) return null
  if (env.SEARCH_COST_GUARD === '1' && /bot\b|spider|crawler|\bcrawl\b|\bslurp\b|facebookexternalhit|archiver/i.test(request.headers.get('user-agent') || '')) {
    report('crawler-query')
    // Robots already disallows the interactive URL graph. Back off crawlers
    // that still request it, while canonical pages and user-directed agents
    // keep their normal access. This is a resource response, never fake results.
    return new Response(request.method === 'HEAD' ? null : 'Please use the canonical directory and Skill pages for crawling: https://www.openagentskill.com/skills', {
      status: 429,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store', 'Retry-After': '3600',
        'X-Robots-Tag': 'noindex, follow', 'X-OAS-Search-Limit': 'crawler-query' },
    })
  }
  if (env.SEARCH_COST_GUARD !== '1' || !env.DIRECTORY_SEARCH_LIMITER) { report('disabled'); return null }
  const ip = request.headers.get('cf-connecting-ip')
  if (!ip) { report('no-source'); return null }
  const key = createHash('sha256').update('oas-directory-search-v1:').update(ip).digest('hex')
  try {
    const { success } = await env.DIRECTORY_SEARCH_LIMITER.limit({ key })
    if (success) { report('allowed'); return null }
  } catch {
    report('unavailable')
    console.warn('directory_search_limiter_unavailable')
    return null
  }
  report('exceeded')
  return new Response(request.method === 'HEAD' ? null : 'Too many searches. Please wait a minute and try again.', {
    status: 429,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store', 'Retry-After': '60',
      'X-Robots-Tag': 'noindex, follow', 'X-OAS-Search-Limit': 'exceeded' },
  })
}
