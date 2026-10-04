'use client'

import { useState } from 'react'
import { Github, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { trackAnalyticsEvent } from '@/lib/analytics'
import type { Locale } from '@/lib/i18n/config'
import { accountCopy } from '@/lib/i18n/account-copy'
import { safeAccountNext } from '@/lib/account-workspace'

export function CreatorIdentityConnections({
  locale = 'en',
  returnTo = '/creator',
  githubUsername,
  githubVerifiedAt,
  xUsername,
  xVerifiedAt,
  githubOAuthEnabled,
  githubAppInstallUrl,
}: {
  locale?: Locale
  returnTo?: string
  githubUsername?: string | null
  githubVerifiedAt?: string | null
  xUsername?: string | null
  xVerifiedAt?: string | null
  githubOAuthEnabled: boolean
  githubAppInstallUrl?: string | null
}) {
  const c = (key: Parameters<typeof accountCopy>[1]) => accountCopy(locale, key)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function connectGitHub() {
    setLoading(true)
    setError('')
    trackAnalyticsEvent('creator_github_connect_start', { placement: 'creator_dashboard' })
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeAccountNext(returnTo))}`
    try {
      const { error: linkError } = await supabase.auth.linkIdentity({ provider: 'github', options: { redirectTo } })
      if (linkError) throw linkError
    } catch {
      setError(c('connectionError'))
      setLoading(false)
    }
  }

  return (
    <section className="border border-border" aria-labelledby="identity-connections-heading">
      <div className="border-b border-border p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-secondary">GitHub / X</p>
        <h2 id="identity-connections-heading" className="mt-2 font-display text-2xl">{c('identity')}</h2>
      </div>
      <div className="divide-y divide-border">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center border border-border"><Github className="size-4" /></span>
            <div>
              <p className="font-semibold">GitHub {githubUsername ? `@${githubUsername}` : ''}</p>
              <p className="mt-1 text-xs text-secondary">
                {githubVerifiedAt ? c('verified') : c('githubNote')}
              </p>
            </div>
          </div>
          {githubVerifiedAt ? (
            githubAppInstallUrl ? (
              <a href={githubAppInstallUrl} className="inline-flex items-center gap-1.5 border border-emerald-700/40 bg-emerald-500/5 px-3 py-2 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="size-3.5" /> {c('liveSync')}
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 border border-emerald-700/40 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700">
                <ShieldCheck className="size-3.5" /> {c('verified')}
              </span>
            )
          ) : githubOAuthEnabled ? (
            <button type="button" onClick={connectGitHub} disabled={loading} className="border border-foreground bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50">
              {loading ? c('connecting') : c('connectGitHub')}
            </button>
          ) : (
            <span className="border border-border px-3 py-2 text-xs text-secondary">{c('creator')}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold">X {xUsername ? `@${xUsername}` : ''}</p>
            <p className="mt-1 text-xs text-secondary">{c('xNote')}</p>
          </div>
          <span className="border border-border px-3 py-2 text-xs text-secondary">{xVerifiedAt ? c('verified') : xUsername ? c('selfReported') : c('notLinked')}</span>
        </div>
      </div>
      {error ? <p className="border-t border-border p-4 text-xs text-amber-700" role="alert">{error}</p> : null}
    </section>
  )
}
