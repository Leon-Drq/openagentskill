// A dependency outage is not evidence that a sitemap or its URLs disappeared.
// Do not cache the error and do not emit noindex on this retryable response.
export function sitemapUnavailableResponse() {
  console.warn('[sitemap] Source temporarily unavailable; preserving existing search URLs')
  return new Response('Sitemap temporarily unavailable. Please retry later.\n', {
    status: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': '300',
    },
  })
}
