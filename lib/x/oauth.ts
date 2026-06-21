import { createHash, randomBytes } from 'node:crypto'

const X_AUTHORIZE_URL = 'https://x.com/i/oauth2/authorize'
const X_TOKEN_URL = 'https://api.x.com/2/oauth2/token'
const X_USER_ME_URL = 'https://api.x.com/2/users/me?user.fields=username'
const X_CREATE_POST_URL = 'https://api.x.com/2/tweets'
const X_TWEETS_LOOKUP_URL = 'https://api.x.com/2/tweets'

export const X_SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] as const
export const X_REDIRECT_URI = 'https://www.openagentskill.com/api/x/callback'

export interface XTokenResponse {
  token_type: string
  expires_in?: number
  access_token: string
  refresh_token?: string
  scope?: string
}

export interface XUserResponse {
  data?: {
    id: string
    name: string
    username: string
  }
}

export interface XCreatePostResponse {
  data?: {
    id: string
    text: string
  }
  errors?: Array<{ title?: string; detail?: string; status?: number }>
}

export interface XTweetPublicMetrics {
  retweet_count?: number
  reply_count?: number
  like_count?: number
  quote_count?: number
  bookmark_count?: number
  impression_count?: number
}

export interface XTweetRecord {
  id: string
  text: string
  created_at?: string
  author_id?: string
  conversation_id?: string
  public_metrics?: XTweetPublicMetrics
}

export interface XTweetsLookupResponse {
  data?: XTweetRecord[]
  errors?: Array<{ title?: string; detail?: string; status?: number; value?: string }>
}

export interface XUserLookupRecord {
  id: string
  name?: string
  username?: string
}

export interface XMentionsResponse {
  data?: XTweetRecord[]
  includes?: {
    users?: XUserLookupRecord[]
  }
  meta?: {
    result_count?: number
    newest_id?: string
    oldest_id?: string
    next_token?: string
  }
  errors?: Array<{ title?: string; detail?: string; status?: number; value?: string }>
}

function base64Url(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function getXClientCredentials() {
  const clientId = process.env.X_CLIENT_ID
  const clientSecret = process.env.X_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Missing X_CLIENT_ID or X_CLIENT_SECRET')
  }

  return { clientId, clientSecret }
}

function getClientAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
}

async function parseXResponse<T>(response: Response, action: string): Promise<T> {
  const text = await response.text()
  let payload: unknown = null

  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = text
  }

  if (!response.ok) {
    throw new Error(`${action} failed: ${response.status} ${JSON.stringify(payload)}`)
  }

  return payload as T
}

export function createPkcePair() {
  const verifier = base64Url(randomBytes(64))
  const challenge = base64Url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

export function createOAuthState() {
  return base64Url(randomBytes(32))
}

export function createXAuthorizeUrl(state: string, codeChallenge: string) {
  const { clientId } = getXClientCredentials()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: X_REDIRECT_URI,
    scope: X_SCOPES.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return `${X_AUTHORIZE_URL}?${params.toString()}`
}

export function getXAllowedUsername() {
  return (process.env.X_ALLOWED_USERNAME || 'openagentskill').replace(/^@/, '').toLowerCase()
}

export function tokenExpiresAt(expiresInSeconds?: number) {
  const expiresIn = Math.max(Number(expiresInSeconds || 7200), 60)
  return new Date(Date.now() + expiresIn * 1000).toISOString()
}

export async function exchangeXCodeForToken(code: string, codeVerifier: string) {
  const { clientId, clientSecret } = getXClientCredentials()
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: X_REDIRECT_URI,
    code_verifier: codeVerifier,
  })

  const response = await fetch(X_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: getClientAuthHeader(clientId, clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  return parseXResponse<XTokenResponse>(response, 'X OAuth token exchange')
}

export async function refreshXAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getXClientCredentials()
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })

  const response = await fetch(X_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: getClientAuthHeader(clientId, clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  return parseXResponse<XTokenResponse>(response, 'X OAuth token refresh')
}

export async function getXCurrentUser(accessToken: string) {
  const response = await fetch(X_USER_ME_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return parseXResponse<XUserResponse>(response, 'X current user lookup')
}

export async function createXPost(accessToken: string, text: string) {
  const response = await fetch(X_CREATE_POST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  return parseXResponse<XCreatePostResponse>(response, 'X post creation')
}

export async function getXTweetsByIds(accessToken: string, ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean))).slice(0, 100)
  if (!uniqueIds.length) return { data: [] } satisfies XTweetsLookupResponse

  const url = new URL(X_TWEETS_LOOKUP_URL)
  url.searchParams.set('ids', uniqueIds.join(','))
  url.searchParams.set('tweet.fields', 'created_at,public_metrics')

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return parseXResponse<XTweetsLookupResponse>(response, 'X tweet metrics lookup')
}

export async function getXUserMentions(
  accessToken: string,
  userId: string,
  options: {
    maxResults?: number
    sinceId?: string | null
  } = {}
) {
  const url = new URL(`https://api.x.com/2/users/${userId}/mentions`)
  url.searchParams.set('max_results', String(Math.min(Math.max(options.maxResults || 20, 5), 100)))
  url.searchParams.set('tweet.fields', 'author_id,conversation_id,created_at,public_metrics')
  url.searchParams.set('expansions', 'author_id')
  url.searchParams.set('user.fields', 'username,name')
  if (options.sinceId) url.searchParams.set('since_id', options.sinceId)

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return parseXResponse<XMentionsResponse>(response, 'X mentions lookup')
}
