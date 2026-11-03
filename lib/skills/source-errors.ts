import { GitHubAPIError } from '@/lib/github/http'

/** Public intake errors must describe the stage, never expose provider bodies. */
export function submissionSourceFailure(error: unknown) {
  if (error instanceof GitHubAPIError) {
    if (error.rateLimited || error.statusCode === 429) {
      return {
        status: 503,
        body: { code: 'SOURCE_RATE_LIMITED', error: 'GitHub source verification is temporarily rate limited. Please retry later.' },
        headers: { 'Retry-After': String(Math.max(60, Math.ceil((error.retryAfterMs || 60_000) / 1000))) },
      }
    }
    if (error.statusCode === 404) {
      return { status: 404, body: { code: 'SOURCE_NOT_FOUND', error: 'The public repository or source revision was not found. Check the link and repository visibility.' } }
    }
    // Authentication/permission failures belong to our upstream connection,
    // not to the visitor's daily submission limit or SKILL.md frontmatter.
    return { status: 503, body: { code: 'SOURCE_UNAVAILABLE', error: 'GitHub source verification is temporarily unavailable. Please retry later.' }, headers: { 'Retry-After': '60' } }
  }
  if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) {
    return { status: 503, body: { code: 'SOURCE_UNAVAILABLE', error: 'Source verification could not finish. Please retry later.' }, headers: { 'Retry-After': '60' } }
  }
  return null
}
