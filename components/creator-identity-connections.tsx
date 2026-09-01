'use client'

import { useState } from 'react'
import { Github, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function CreatorIdentityConnections({
  githubUsername,
  githubVerifiedAt,
  xUsername,
  githubOAuthEnabled,
}: {
  githubUsername?: string | null
  githubVerifiedAt?: string | null
  xUsername?: string | null
  githubOAuthEnabled: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function connectGitHub() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=/creator`
    const { error: linkError } = await supabase.auth.linkIdentity({
      provider: 'github',
      options: { redirectTo },
    })
    if (linkError) {
      setError('GitHub OAuth is not available for this account yet. Repository-file verification below still works immediately.')
      setLoading(false)
    }
  }

  return (
    <section className="border border-border" aria-labelledby="identity-connections-heading">
      <div className="border-b border-border p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-secondary">Identity ledger</p>
        <h2 id="identity-connections-heading" className="mt-2 font-display text-2xl">Connected accounts</h2>
      </div>
      <div className="divide-y divide-border">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center border border-border"><Github className="size-4" /></span>
            <div>
              <p className="font-semibold">GitHub {githubUsername ? `@${githubUsername}` : ''}</p>
              <p className="mt-1 text-xs text-secondary">
                {githubVerifiedAt ? 'OAuth identity verified' : 'Connect once for instant personal-repository claims'}
              </p>
            </div>
          </div>
          {githubVerifiedAt ? (
            <span className="inline-flex items-center gap-1.5 border border-emerald-700/40 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700">
              <ShieldCheck className="size-3.5" /> Verified
            </span>
          ) : githubOAuthEnabled ? (
            <button type="button" onClick={connectGitHub} disabled={loading} className="border border-foreground bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50">
              {loading ? 'Connecting…' : 'Connect GitHub'}
            </button>
          ) : (
            <span className="border border-border px-3 py-2 text-xs text-secondary">Verify through repository</span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold">X {xUsername ? `@${xUsername}` : ''}</p>
            <p className="mt-1 text-xs text-secondary">Optional public attribution. It is shown as self-reported until OAuth verification is available.</p>
          </div>
          <span className="border border-border px-3 py-2 text-xs text-secondary">{xUsername ? 'Linked · unverified' : 'Not linked'}</span>
        </div>
      </div>
      {error ? <p className="border-t border-border p-4 text-xs text-amber-700" role="alert">{error}</p> : null}
    </section>
  )
}
