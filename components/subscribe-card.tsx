'use client'

import { useState } from 'react'

interface SubscribeCardProps {
  source: string
  topics?: string[]
  title?: string
  description?: string
}

export function SubscribeCard({
  source,
  topics = [],
  title = 'Get the best skills in your inbox',
  description = 'Receive a compact digest of high-quality skills, stack ideas, and practical agent workflows.',
}: SubscribeCardProps) {
  const [email, setEmail] = useState('')
  const [cadence, setCadence] = useState<'daily' | 'weekly'>('weekly')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email || status === 'saving') return
    setStatus('saving')
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, cadence, topics, source }),
    })
    setStatus(response.ok ? 'saved' : 'error')
    if (response.ok) setEmail('')
  }

  return (
    <form onSubmit={submit} className="border border-border bg-card p-5">
      <p className="mb-3 text-xs uppercase tracking-widest text-secondary">Digest</p>
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-secondary">{description}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="min-w-0 border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-secondary/50 focus:border-foreground"
        />
        <button
          type="submit"
          disabled={status === 'saving'}
          className="border border-foreground bg-foreground px-5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving...' : 'Subscribe'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(['weekly', 'daily'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCadence(item)}
            className={`border px-2.5 py-1 text-xs capitalize transition-colors ${
              cadence === item
                ? 'border-foreground text-foreground'
                : 'border-border text-secondary hover:border-foreground hover:text-foreground'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {status === 'saved' && <p className="mt-3 text-xs text-secondary">Subscribed. Future digests can use these preferences.</p>}
      {status === 'error' && <p className="mt-3 text-xs text-secondary">Could not subscribe right now.</p>}
    </form>
  )
}
