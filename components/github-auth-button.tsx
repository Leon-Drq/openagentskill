'use client'

import { useState } from 'react'
import { Github } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { trackAnalyticsEvent } from '@/lib/analytics'

function safeNext(value: string | null, fallback: string) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback
}

export function GitHubAuthButton({
  fallbackNext = '/creator',
  label = 'Continue with GitHub',
}: {
  fallbackNext?: string
  label?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const enabled = process.env.NEXT_PUBLIC_GITHUB_OAUTH_ENABLED === 'true'

  if (!enabled) return null

  async function continueWithGitHub() {
    setLoading(true)
    setError('')
    trackAnalyticsEvent('creator_github_connect_start', { placement: 'auth' })
    const next = safeNext(new URLSearchParams(window.location.search).get('next'), fallbackNext)
    const redirectTo = new URL('/auth/callback', window.location.origin)
    redirectTo.searchParams.set('next', next)

    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: redirectTo.toString() },
    })
    if (oauthError) {
      setError('GitHub sign-in could not start. You can still use email and password.')
      setLoading(false)
    }
  }

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={continueWithGitHub}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 border border-foreground bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        <Github className="size-4" aria-hidden="true" />
        {loading ? 'Connecting to GitHub…' : label}
      </button>
      {error ? <p className="mt-2 text-xs text-red-600" role="alert">{error}</p> : null}
      <div className="mt-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-secondary" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span>or continue with email</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  )
}
