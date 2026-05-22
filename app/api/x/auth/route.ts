import { NextResponse } from 'next/server'
import { createOAuthState, createPkcePair, createXAuthorizeUrl } from '@/lib/x/oauth'

const COOKIE_MAX_AGE_SECONDS = 10 * 60

export async function GET() {
  const state = createOAuthState()
  const { verifier, challenge } = createPkcePair()
  const response = NextResponse.redirect(createXAuthorizeUrl(state, challenge))

  response.cookies.set('x_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
  response.cookies.set('x_code_verifier', verifier, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })

  return response
}
