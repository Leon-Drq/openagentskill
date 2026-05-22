import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import {
  exchangeXCodeForToken,
  getXAllowedUsername,
  getXCurrentUser,
  tokenExpiresAt,
} from '@/lib/x/oauth'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function htmlResponse(title: string, message: string, status = 200) {
  const escapedTitle = escapeHtml(title)

  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapedTitle}</title>
    <style>
      body{font-family:ui-serif,Georgia,serif;max-width:680px;margin:64px auto;padding:0 24px;line-height:1.5}
      code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#f4f4f4;padding:2px 6px}
    </style>
  </head>
  <body>
    <h1>${escapedTitle}</h1>
    <p>${message}</p>
    <p><a href="/">Back to Open Agent Skill</a></p>
  </body>
</html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  )
}

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get('error')
  if (error) {
    return htmlResponse('X authorization cancelled', `X returned <code>${escapeHtml(error)}</code>.`, 400)
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const storedState = request.cookies.get('x_oauth_state')?.value
  const codeVerifier = request.cookies.get('x_code_verifier')?.value

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return htmlResponse('X authorization failed', 'The OAuth state or verifier was invalid. Please start authorization again.', 400)
  }

  const serverSecret = process.env.INDEXER_SECRET
  if (!serverSecret) {
    return htmlResponse('Server is not configured', 'Missing INDEXER_SECRET.', 500)
  }

  try {
    const token = await exchangeXCodeForToken(code, codeVerifier)
    if (!token.refresh_token) {
      return htmlResponse('Missing refresh token', 'X did not return a refresh token. Make sure offline.access is enabled and included in the OAuth scopes.', 400)
    }

    const user = await getXCurrentUser(token.access_token)
    const username = user.data?.username?.toLowerCase()
    const expectedUsername = getXAllowedUsername()

    if (!user.data?.id || !username || username !== expectedUsername) {
      return htmlResponse(
        'Wrong X account',
        `This app only stores authorization for <code>@${expectedUsername}</code>. You authorized <code>@${username || 'unknown'}</code>.`,
        403
      )
    }

    const supabase = createPublicClient()
    const { error: saveError } = await supabase.rpc('upsert_x_oauth_connection', {
      p_server_secret: serverSecret,
      p_connection: {
        x_user_id: user.data.id,
        username: user.data.username,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: tokenExpiresAt(token.expires_in),
        scope: token.scope || '',
      },
    })

    if (saveError) {
      throw new Error(saveError.message)
    }

    const response = htmlResponse(
      'X authorization saved',
      `@${user.data.username} is connected. Daily skill posts can now be published automatically.`
    )
    response.cookies.delete('x_oauth_state')
    response.cookies.delete('x_code_verifier')
    return response
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : 'Unknown callback error'
    return htmlResponse('X authorization failed', escapeHtml(message), 500)
  }
}
