export const GITHUB_USER_AGENT = 'OpenAgentSkill-Ingestion/1.0 (+https://www.openagentskill.com)'

export class GitHubAPIError extends Error {
  constructor(message: string, public statusCode?: number, public rateLimited = false, public retryAfterMs?: number) {
    super(message)
    this.name = 'GitHubAPIError'
  }
}

/** Classify the response without persisting provider bodies, credentials or URLs. */
export async function githubResponseError(response: Response): Promise<GitHubAPIError> {
  const body = await response.text().catch(() => '')
  const limited = response.status === 429 || (response.status === 403 && (
    response.headers.get('x-ratelimit-remaining') === '0' || /rate.?limit|abuse detection/i.test(body)
  ))
  const seconds = Number(response.headers.get('retry-after'))
  const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000 - Date.now()
  const retryAfterMs = limited ? Math.max(60_000, seconds > 0 ? seconds * 1000 : reset > 0 ? reset : 60_000) : undefined
  const reason = limited ? 'rate limit exceeded' : response.status === 404 ? 'repository not found'
    : /user.agent/i.test(body) ? 'user agent required' : response.status === 401 ? 'authentication failed'
      : response.status === 403 ? 'access forbidden' : 'request failed'
  return new GitHubAPIError(`GitHub API ${response.status}: ${reason}`, response.status, limited, retryAfterMs)
}

export function isGitHubRateLimitError(error: unknown): boolean {
  if (error instanceof GitHubAPIError) return error.rateLimited
  return /(?:GitHub.*rate.?limit|secondary rate limit|API error:\s*Too Many Requests)/i.test(error instanceof Error ? error.message : '')
}
