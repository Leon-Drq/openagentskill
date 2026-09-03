'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Github, LoaderCircle } from 'lucide-react'
import { trackAnalyticsEvent } from '@/lib/analytics'

export function CreatorBatchClaim({
  githubUsername,
  availableCount,
}: {
  githubUsername: string
  availableCount: number
}) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function claimAll() {
    if (state === 'loading') return
    setState('loading')
    setMessage('')

    const response = await fetch('/api/claims/batch', { method: 'POST' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setMessage(payload.error || 'Could not claim GitHub-owned skills.')
      setState('error')
      return
    }

    trackAnalyticsEvent('creator_claim_all', {
      github_username: githubUsername,
      claimed_count: Number(payload.claimed || 0),
    })
    setMessage(payload.claimed
      ? `${payload.claimed} GitHub-owned skill${payload.claimed === 1 ? '' : 's'} verified.`
      : 'All eligible GitHub-owned skills are already claimed.')
    setState('done')
    router.refresh()
  }

  return (
    <section className="border border-border p-6" aria-labelledby="claim-github-skills">
      <div className="flex items-start gap-3">
        <Github className="mt-0.5 size-5" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary">Ownership accelerator</p>
          <h2 id="claim-github-skills" className="mt-2 font-display text-2xl">Claim every matching repository</h2>
          <p className="mt-2 text-sm leading-6 text-secondary">
            Your verified <span className="font-mono text-foreground">@{githubUsername}</span> identity can approve all indexed skills whose GitHub owner matches exactly. Organization repositories still require repository proof.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={claimAll}
        disabled={state === 'loading' || (availableCount === 0 && state !== 'done')}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-foreground px-4 py-3 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === 'loading' ? <LoaderCircle className="size-4 animate-spin" /> : state === 'done' ? <CheckCircle2 className="size-4" /> : null}
        {state === 'loading' ? 'Verifying ownership…' : `Claim ${availableCount.toLocaleString()} matching skill${availableCount === 1 ? '' : 's'}`}
      </button>
      {message ? <p className={`mt-3 text-xs ${state === 'error' ? 'text-red-700' : 'text-emerald-700'}`}>{message}</p> : null}
    </section>
  )
}
