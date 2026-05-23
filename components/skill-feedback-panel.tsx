'use client'

import { useState } from 'react'

interface SkillFeedbackPanelProps {
  skillSlug: string
}

function getAnonymousAgentId() {
  const key = 'openagentskill.webAgentId'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const created = `web-user-${crypto.randomUUID()}`
  window.localStorage.setItem(key, created)
  return created
}

export function SkillFeedbackPanel({ skillSlug }: SkillFeedbackPanelProps) {
  const [agentId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return getAnonymousAgentId()
  })
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function sendFeedback(success: boolean) {
    if (!agentId || status === 'saving') return
    setStatus('saving')
    const response = await fetch('/api/agent/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill_slug: skillSlug,
        agent_id: agentId,
        success,
        latency_ms: null,
        error_message: success ? null : message || 'User marked this skill for review',
        metadata: {
          source: 'skill_detail_page',
          comment: message || null,
        },
      }),
    })

    setStatus(response.ok ? 'saved' : 'error')
    if (response.ok) setMessage('')
  }

  return (
    <div className="border border-border p-5">
      <h3 className="font-display text-lg font-semibold mb-3">Community Signal</h3>
      <p className="mb-4 text-xs leading-relaxed text-secondary">
        Share whether this skill looks useful for your agent workflow. Aggregated feedback improves rankings over time.
      </p>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={3}
        placeholder="Optional note..."
        className="mb-3 w-full resize-none border border-border bg-transparent px-3 py-2 text-xs outline-none placeholder:text-secondary/50 focus:border-foreground"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => sendFeedback(true)}
          disabled={status === 'saving'}
          className="border border-foreground bg-foreground px-3 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          Useful
        </button>
        <button
          type="button"
          onClick={() => sendFeedback(false)}
          disabled={status === 'saving'}
          className="border border-border px-3 py-2 text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
        >
          Needs review
        </button>
      </div>
      {status === 'saved' && <p className="mt-3 text-xs text-secondary">Thanks. Signal recorded.</p>}
      {status === 'error' && <p className="mt-3 text-xs text-secondary">Could not save feedback right now.</p>}
    </div>
  )
}
