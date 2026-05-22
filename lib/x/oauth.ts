import { createHash, randomBytes } from 'node:crypto'

const X_AUTHORIZE_URL = 'https://x.com/i/oauth2/authorize'
const X_TOKEN_URL = 'https://api.x.com/2/oauth2/token'
const X_USER_ME_URL = 'https://api.x.com/2/users/me?user.fields=username'
const X_CREATE_POST_URL = 'https://api.x.com/2/tweets'

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
