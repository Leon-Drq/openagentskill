import english from './paused-assets/index.html'
import chinese from './paused-assets/zh/index.html'

export function pausedResponse(request) {
  const url = new URL(request.url)
  const headers = {
    'Cache-Control': 'no-store',
    'Retry-After': '3600',
    'X-OAS-Mode': 'paused',
    'X-Content-Type-Options': 'nosniff',
  }
  const api = /^\/(?:en\/|zh\/|ja\/|ko\/|es\/|de\/|fr\/|id\/)?(?:api|auth)(?:\/|$)/.test(url.pathname)
  if (api || !['GET', 'HEAD'].includes(request.method)) {
    return new Response(request.method === 'HEAD' ? null : JSON.stringify({error:'site_temporarily_paused',retryAfter:3600}), {
      status:503, headers:{...headers,'Content-Type':'application/json; charset=utf-8'},
    })
  }
  return new Response(request.method === 'HEAD' ? null : /^\/zh(?:\/|$)/.test(url.pathname) ? chinese : english, {
    status:503, headers:{...headers,'Content-Type':'text/html; charset=utf-8'},
  })
}
