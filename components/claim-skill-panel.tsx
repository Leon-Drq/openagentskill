'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trackSkillEvent } from '@/components/skill-event-tracker'

interface ClaimSkillPanelProps {
  skillSlug: string
  repository?: string
  approvedClaim?: {
    github_username: string
    evidence_url: string | null
  } | null
}

interface ClaimState {
  status: 'pending' | 'approved' | 'rejected'
  github_username: string
  evidence_url: string | null
  evidence_note: string | null
}

export function ClaimSkillPanel({ skillSlug, repository, approvedClaim }: ClaimSkillPanelProps) {
  const [open, setOpen] = useState(false)
  const [hasUser, setHasUser] = useState<boolean | null>(null)
  const [existingClaim, setExistingClaim] = useState<ClaimState | null>(null)
  const [githubUsername, setGithubUsername] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState(repository || '')
  const [evidenceNote, setEvidenceNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle')

  useEffect(() => {
    let active = true

    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return
      setHasUser(Boolean(user))
      if (!user) return

      const response = await fetch(`/api/claims?skill_slug=${encodeURIComponent(skillSlug)}`)
      if (!active || !response.ok) return
      const data = await response.json()
      if (data.claim) {
        setExistingClaim(data.claim)
        setGithubUsername(data.claim.github_username || '')
        setEvidenceUrl(data.claim.evidence_url || repository || '')
        setEvidenceNote(data.claim.evidence_note || '')
      }
    }

    load()
    return () => {
      active = false
    }
  }, [skillSlug, repository])

  function openPanel() {
    if (!hasUser) {
      window.location.href = `/auth/login?next=${encodeURIComponent(`/skills/${skillSlug}`)}`
      return
    }
    setOpen(true)
    trackSkillEvent(skillSlug, 'claim_start')
  }

  async function submitClaim() {
    if (status === 'loading') return
    setStatus('loading')

    const response = await fetch('/api/claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skill_slug: skillSlug,
        github_username: githubUsername,
        repo_url: repository || null,
        verification_method: 'github_profile',
        evidence_url: evidenceUrl || null,
        evidence_note: evidenceNote || null,
      }),
    })

    if (!response.ok) {
      setStatus('error')
      return
    }

    const data = await response.json()
    setExistingClaim(data.claim)
    setStatus('saved')
  }

  if (approvedClaim) {
    return (
      <div className="border border-border p-5">
        <h3 className="font-display text-lg font-semibold">Claimed by owner</h3>
        <p className="mt-2 text-xs leading-relaxed text-secondary">
          This skill has an approved owner claim from @{approvedClaim.github_username}.
        </p>
        {approvedClaim.evidence_url && (
          <a
            href={approvedClaim.evidence_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-xs text-secondary underline underline-offset-2 hover:text-foreground"
          >
            Verification evidence
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="border border-border p-5">
      <h3 className="font-display text-lg font-semibold">Claim this skill</h3>
      <p className="mt-2 text-xs leading-relaxed text-secondary">
        Project owners can request ownership review. Approved claims unlock a stronger trust signal.
      </p>

      {existingClaim && !open ? (
        <div className="mt-4 border border-border p-3 text-xs text-secondary">
          Claim status: <span className="font-mono text-foreground">{existingClaim.status}</span>
        </div>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={openPanel}
          className="mt-4 w-full border border-border px-3 py-2 text-sm transition-colors hover:border-foreground"
        >
          {hasUser ? 'Start claim' : 'Sign in to claim'}
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-secondary">GitHub username</span>
            <input
              value={githubUsername}
              onChange={(event) => setGithubUsername(event.target.value)}
              placeholder="owner"
              className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-secondary">Evidence URL</span>
            <input
              value={evidenceUrl}
              onChange={(event) => setEvidenceUrl(event.target.value)}
              placeholder="GitHub profile, repo, issue, or website"
              className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-secondary">Verification note</span>
            <textarea
              value={evidenceNote}
              onChange={(event) => setEvidenceNote(event.target.value)}
              rows={3}
              placeholder="How should we verify you own or maintain this skill?"
              className="w-full resize-none border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>
          <button
            type="button"
            onClick={submitClaim}
            disabled={status === 'loading' || githubUsername.trim().length === 0}
            className="w-full border border-foreground bg-foreground px-3 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {status === 'loading' ? 'Submitting...' : 'Submit claim'}
          </button>
          {status === 'saved' && <p className="text-xs text-secondary">Claim submitted for review.</p>}
          {status === 'error' && <p className="text-xs text-secondary">Could not submit claim. Check your sign-in state and username.</p>}
        </div>
      )}
    </div>
  )
}
