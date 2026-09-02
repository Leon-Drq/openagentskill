'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { trackSkillEvent } from '@/components/skill-event-tracker'
import { useI18n } from '@/lib/i18n/context'
import {
  formatSkillDetailCopy,
  type SkillDetailCopyKey,
} from '@/lib/i18n/skill-detail-copy'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { trackAnalyticsEvent } from '@/lib/analytics'

interface ClaimSkillPanelProps {
  skillSlug: string
  repository?: string
  creatorName?: string
  sourceLabel?: string
  approvedClaim?: {
    github_username: string | null
    x_username?: string | null
    evidence_url: string | null
    verification_tier?: 'maintainer' | 'official'
    verified_at?: string | null
  } | null
}

interface ClaimState {
  status: 'pending' | 'approved' | 'rejected'
  github_username: string | null
  x_username: string | null
  evidence_url: string | null
  evidence_note: string | null
  verification_method?: string
  verification_tier?: 'maintainer' | 'official'
  verified_at?: string | null
  challenge_expires_at?: string | null
}

interface ClaimChallenge {
  token: string
  path: string
  expires_at: string
  repository: string
}

function getSourceLabelCopyKey(value: string): SkillDetailCopyKey | null {
  switch (value.trim().toLowerCase()) {
    case 'verified maintainer':
      return 'attributionVerifiedMaintainer'
    case 'community submitted':
      return 'attributionCommunitySubmitted'
    case 'agent submitted':
      return 'attributionAgentSubmitted'
    case 'community indexed':
    case 'community-indexed':
      return 'attributionCommunityIndexed'
    case 'registry indexed':
    case 'registry-indexed':
      return 'attributionRegistryIndexed'
    default:
      return null
  }
}

export function ClaimSkillPanel({
  skillSlug,
  repository,
  creatorName,
  sourceLabel = 'community-indexed',
  approvedClaim,
}: ClaimSkillPanelProps) {
  const { locale } = useI18n()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [hasUser, setHasUser] = useState<boolean | null>(null)
  const [existingClaim, setExistingClaim] = useState<ClaimState | null>(null)
  const [githubUsername, setGithubUsername] = useState('')
  const [xUsername, setXUsername] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState(repository || '')
  const [evidenceNote, setEvidenceNote] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle')
  const [challenge, setChallenge] = useState<ClaimChallenge | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'checking' | 'verified' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

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
        setXUsername(data.claim.x_username || '')
        setEvidenceUrl(data.claim.evidence_url || repository || '')
        setEvidenceNote(data.claim.evidence_note || '')
      }
    }

    load()
    return () => {
      active = false
    }
  }, [skillSlug, repository])

  useEffect(() => {
    if (!hasUser || typeof window === 'undefined') return
    const url = new URL(window.location.href)
    let changed = false
    if (url.searchParams.get('connected') === 'github') {
      trackAnalyticsEvent('creator_github_connected', { placement: 'skill_claim', skill_slug: skillSlug })
      url.searchParams.delete('connected')
      changed = true
    }
    if (url.searchParams.get('claim') !== '1') {
      if (changed) window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
      return
    }
    const timeoutId = window.setTimeout(() => setOpen(true), 0)
    url.searchParams.delete('claim')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    return () => window.clearTimeout(timeoutId)
  }, [hasUser, skillSlug])

  function openPanel() {
    trackSkillEvent(skillSlug, 'claim_start')

    if (hasUser === null) return
    if (!hasUser) {
      const next = getLocalizedNavigationHref(`/skills/${skillSlug}`, locale)
      const separator = next.includes('?') ? '&' : '?'
      const claimReturnPath = `${next}${separator}claim=1#claim-this-skill`
      router.push(`/auth/login?next=${encodeURIComponent(claimReturnPath)}&intent=claim`)
      return
    }
    setOpen(true)
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
        x_username: xUsername,
        repo_url: repository || null,
        verification_method: 'github_profile',
        evidence_url: evidenceUrl || null,
        evidence_note: evidenceNote || null,
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setErrorMessage(data.error || 'Could not create the ownership challenge.')
      setStatus('error')
      return
    }

    trackAnalyticsEvent('skill_claim_submit', {
      skill_slug: skillSlug,
      verification_method: data.claim?.verification_method || 'repository_file',
    })
    setExistingClaim(data.claim)
    setChallenge(data.challenge || null)
    setStatus('saved')
    if (data.claim?.status === 'approved') {
      trackAnalyticsEvent('skill_claim_verified', {
        skill_slug: skillSlug,
        verification_method: data.claim.verification_method || 'github_oauth',
      })
      router.refresh()
      window.setTimeout(() => document.getElementById('creator-badge-kit')?.scrollIntoView({ behavior: 'smooth' }), 450)
    }
  }

  async function verifyChallenge() {
    if (verificationStatus === 'checking') return
    setVerificationStatus('checking')
    setErrorMessage('')
    const response = await fetch('/api/claims/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill_slug: skillSlug }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setErrorMessage(data.error || 'Verification failed. Check the file and try again.')
      setVerificationStatus('error')
      return
    }
    setExistingClaim((current) => current ? { ...current, status: 'approved', verified_at: data.verified_at } : current)
    trackAnalyticsEvent('skill_claim_verified', {
      skill_slug: skillSlug,
      verification_method: 'repository_file',
    })
    setVerificationStatus('verified')
    setChallenge(null)
    router.refresh()
    window.setTimeout(() => document.getElementById('creator-badge-kit')?.scrollIntoView({ behavior: 'smooth' }), 450)
  }

  async function copyChallengeToken() {
    if (!challenge) return
    await navigator.clipboard.writeText(challenge.token)
  }

  if (approvedClaim) {
    return (
      <div id="claim-this-skill" className="scroll-mt-24 border border-border p-5">
        <p className="mb-2 text-xs uppercase text-secondary">
          {formatSkillDetailCopy(locale, 'ownerClaim')}
        </p>
        <h3 className="font-display text-lg font-semibold">
          {approvedClaim.verification_tier === 'official' ? 'Official publisher' : formatSkillDetailCopy(locale, 'verifiedMaintainer')}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-secondary">
          {formatSkillDetailCopy(locale, 'verifiedMaintainerDescription', {
            username: approvedClaim.github_username || approvedClaim.x_username || 'verified creator',
          })}
        </p>
        {approvedClaim.evidence_url && (
          <a
            href={approvedClaim.evidence_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-xs text-secondary underline underline-offset-2 hover:text-foreground"
          >
            {formatSkillDetailCopy(locale, 'verificationEvidence')}
          </a>
        )}
      </div>
    )
  }

  return (
    <div id="claim-this-skill" className="scroll-mt-24 border border-border p-5">
      <p className="mb-2 text-xs uppercase text-secondary">
        {formatSkillDetailCopy(locale, 'ownerClaim')}
      </p>
      <h3 className="font-display text-lg font-semibold">
        {formatSkillDetailCopy(locale, 'claimThisListing')}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-secondary">
        {formatSkillDetailCopy(locale, 'claimListingDescription', {
          sourceLabel: getSourceLabelCopyKey(sourceLabel)
            ? formatSkillDetailCopy(locale, getSourceLabelCopyKey(sourceLabel)!)
            : sourceLabel,
          creatorName: creatorName || formatSkillDetailCopy(locale, 'source'),
        })}
      </p>

      {existingClaim && !open ? (
        <div className="mt-4 border border-border p-3 text-xs text-secondary">
          {formatSkillDetailCopy(locale, 'claimStatus')}:{' '}
          <span className="font-mono text-foreground">{verificationStatus === 'verified' ? 'approved' : existingClaim.status}</span>
        </div>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={openPanel}
          disabled={hasUser === null}
          className="mt-4 w-full border border-border px-3 py-2 text-sm transition-colors hover:border-foreground"
        >
          {hasUser === null
            ? 'Checking account…'
            : hasUser
            ? formatSkillDetailCopy(locale, 'verifyMaintainerClaim')
            : formatSkillDetailCopy(locale, 'claimSkill')}
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="border border-border bg-muted/30 p-3 text-xs leading-relaxed text-secondary">
            Connect the GitHub account that owns this repository for instant verification. Organization and collaborator claims use a one-time repository file. X is optional and never proves ownership by itself.
          </div>
          {repository ? (
            <div className="border border-border bg-background p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-secondary">Repository to verify</p>
              <p className="mt-1 break-all font-mono text-xs text-foreground">{repository}</p>
            </div>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-xs text-secondary">X username (optional)</span>
            <input
              value={xUsername}
              onChange={(event) => setXUsername(event.target.value.replace(/^@/, ''))}
              placeholder="creator"
              className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>
          <details className="border border-border bg-background p-3">
            <summary className="cursor-pointer text-xs font-semibold text-secondary hover:text-foreground">Advanced ownership evidence</summary>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs text-secondary">{formatSkillDetailCopy(locale, 'githubUsername')}</span>
                <input value={githubUsername} onChange={(event) => setGithubUsername(event.target.value)} placeholder="owner" className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-secondary">{formatSkillDetailCopy(locale, 'evidenceUrl')}</span>
                <input value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder={formatSkillDetailCopy(locale, 'evidenceUrlPlaceholder')} className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-secondary">{formatSkillDetailCopy(locale, 'verificationNote')}</span>
                <textarea value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} rows={2} placeholder={formatSkillDetailCopy(locale, 'verificationNotePlaceholder')} className="w-full resize-none border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" />
              </label>
            </div>
          </details>
          <button
            type="button"
            onClick={submitClaim}
            disabled={status === 'loading' || (!githubUsername.trim() && !xUsername.trim() && !evidenceUrl.trim())}
            className="w-full border border-foreground bg-foreground px-3 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {status === 'loading'
              ? formatSkillDetailCopy(locale, 'submitting')
              : 'Verify ownership'}
          </button>
          {challenge ? (
            <div className="border border-emerald-700/40 bg-emerald-500/5 p-4 text-xs">
              <p className="font-mono uppercase tracking-[0.14em] text-emerald-700">Ownership challenge</p>
              <ol className="mt-3 list-decimal space-y-2 pl-4 leading-relaxed text-secondary">
                <li>Create <code className="break-all text-foreground">{challenge.path}</code> on the repository default branch.</li>
                <li>Paste the exact token below as the complete file content and commit it.</li>
                <li>Return here and verify. The token expires in 24 hours.</li>
              </ol>
              <div className="mt-3 flex items-stretch border border-border bg-background">
                <code className="min-w-0 flex-1 break-all p-3 text-foreground">{challenge.token}</code>
                <button type="button" onClick={copyChallengeToken} className="border-l border-border px-3 font-semibold hover:bg-muted">Copy</button>
              </div>
              <button
                type="button"
                onClick={verifyChallenge}
                disabled={verificationStatus === 'checking'}
                className="mt-3 w-full bg-foreground px-3 py-2 font-semibold text-background disabled:opacity-50"
              >
                {verificationStatus === 'checking' ? 'Checking GitHub…' : 'Verify repository ownership'}
              </button>
            </div>
          ) : null}
          {status === 'saved' && (
            <p className="text-xs text-secondary">
              {existingClaim?.status === 'approved'
                ? 'Ownership verified. This listing is now linked to your creator profile.'
                : formatSkillDetailCopy(locale, 'claimSubmitted')}
            </p>
          )}
          {(status === 'error' || verificationStatus === 'error') && (
            <p className="text-xs text-red-600" role="alert">
              {errorMessage || formatSkillDetailCopy(locale, 'claimSubmitError')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
