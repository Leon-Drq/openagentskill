import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGitHubIdentity } from '@/lib/creator-ownership'

function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/creator'
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const next = safeNext(request.nextUrl.searchParams.get('next'))
  const redirectUrl = new URL(next, request.nextUrl.origin)

  if (!code) {
    redirectUrl.searchParams.set('error', 'oauth-code-missing')
    return NextResponse.redirect(redirectUrl)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    redirectUrl.searchParams.set('error', 'github-connect-failed')
    return NextResponse.redirect(redirectUrl)
  }

  const { data: { user } } = await supabase.auth.getUser()
  const github = user ? getGitHubIdentity(user) : null
  if (user && github) {
    const githubId = Number(github.id)
    await supabase.from('profiles').upsert({
      id: user.id,
      github_username: github.username.toLowerCase(),
      github_user_id: Number.isSafeInteger(githubId) ? githubId : null,
      github_verified_at: new Date().toISOString(),
      ...(github.avatarUrl ? { avatar_url: github.avatarUrl } : {}),
      updated_at: new Date().toISOString(),
    })
    redirectUrl.searchParams.set('connected', 'github')
  }

  return NextResponse.redirect(redirectUrl)
}
