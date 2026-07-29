'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trackSkillEvent } from '@/components/skill-event-tracker'
import { useI18n } from '@/lib/i18n/context'
import {
  formatSkillDetailCopy,
  type SkillDetailCopyKey,
} from '@/lib/i18n/skill-detail-copy'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'

interface ClaimSkillPanelProps {
  skillSlug: string
  repository?: string
  creatorName?: string
  sourceLabel?: string
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
    trackSkillEvent(skillSlug, 'claim_start')

    if (!hasUser) {
      const next = getLocalizedNavigationHref(`/skills/${skillSlug}`, locale)
      window.location.href = `/auth/login?next=${encodeURIComponent(next)}`
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
      <div id="claim-this-skill" className="scroll-mt-24 border border-border p-5">
        <p className="mb-2 text-xs uppercase text-secondary">
          {formatSkillDetailCopy(locale, 'ownerClaim')}
        </p>
        <h3 className="font-display text-lg font-semibold">
          {formatSkillDetailCopy(locale, 'verifiedMaintainer')}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-secondary">
          {formatSkillDetailCopy(locale, 'verifiedMaintainerDescription', {
            username: approvedClaim.github_username,
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
          <span className="font-mono text-foreground">{existingClaim.status}</span>
        </div>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={openPanel}
          className="mt-4 w-full border border-border px-3 py-2 text-sm transition-colors hover:border-foreground"
        >
          {hasUser
            ? formatSkillDetailCopy(locale, 'verifyMaintainerClaim')
            : formatSkillDetailCopy(locale, 'claimSkill')}
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-secondary">
              {formatSkillDetailCopy(locale, 'githubUsername')}
            </span>
            <input
              value={githubUsername}
              onChange={(event) => setGithubUsername(event.target.value)}
              placeholder="owner"
              className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-secondary">
              {formatSkillDetailCopy(locale, 'evidenceUrl')}
            </span>
            <input
              value={evidenceUrl}
              onChange={(event) => setEvidenceUrl(event.target.value)}
              placeholder={formatSkillDetailCopy(locale, 'evidenceUrlPlaceholder')}
              className="w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-secondary">
              {formatSkillDetailCopy(locale, 'verificationNote')}
            </span>
            <textarea
              value={evidenceNote}
              onChange={(event) => setEvidenceNote(event.target.value)}
              rows={3}
              placeholder={formatSkillDetailCopy(locale, 'verificationNotePlaceholder')}
              className="w-full resize-none border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>
          <button
            type="button"
            onClick={submitClaim}
            disabled={status === 'loading' || githubUsername.trim().length === 0}
            className="w-full border border-foreground bg-foreground px-3 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {status === 'loading'
              ? formatSkillDetailCopy(locale, 'submitting')
              : formatSkillDetailCopy(locale, 'submitClaim')}
          </button>
          {status === 'saved' && (
            <p className="text-xs text-secondary">
              {formatSkillDetailCopy(locale, 'claimSubmitted')}
            </p>
          )}
          {status === 'error' && (
            <p className="text-xs text-secondary">
              {formatSkillDetailCopy(locale, 'claimSubmitError')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
