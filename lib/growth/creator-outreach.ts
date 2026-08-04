import { getSkillsBySlugs, type SkillRecord } from '@/lib/db/skills'
import type { CandidateRepo } from '@/lib/indexer/github-search'
import { isGenericFoundationRepoName } from '@/lib/x/candidates'
import { buildCommunityIndexedReplyText } from '@/lib/x/poster'
import { createPublicClient } from '@/lib/supabase/public'

const OUTREACH_DB_TIMEOUT_MS = 8_000
const MAX_OUTREACH_DRAFTS_PER_RUN = 6

export interface CreatorEmailDraft {
  subject: string
  text: string
  claimUrl: string
  listingUrl: string
  automaticSending: false
  contactPolicy: string
}

export interface CreatorOutreachResult {
  status: 'drafted' | 'skipped' | 'error'
  eligible: number
  drafted: number
  skipped: number
  errors: number
  results: Array<{
    skillSlug: string
    sourceTweetId?: string
    status: 'drafted' | 'skipped' | 'error'
    reason?: string
  }>
}

type CreatorOutreachCandidate = CandidateRepo & {
  discovery: NonNullable<CandidateRepo['discovery']> & {
    x: NonNullable<NonNullable<CandidateRepo['discovery']>['x']>
  }
}

function numberFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function candidateSlug(candidate: CandidateRepo) {
  return `${candidate.owner}-${candidate.repo}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')
}

function isCreatorOutreachCandidate(candidate: CandidateRepo): candidate is CreatorOutreachCandidate {
  return candidate.discovery?.source === 'x-radar' && Boolean(candidate.discovery.x?.tweetId)
}

function getReviewScore(skill: SkillRecord) {
  const qualityScore = Number(skill.quality_score || 0)
  if (qualityScore > 0) return qualityScore

  const review = skill.ai_review_score
  if (review && typeof review === 'object' && 'total' in review) {
    return Number((review as { total?: unknown }).total || 0)
  }
  return 0
}

function eligibilityReason(candidate: CreatorOutreachCandidate, skill: SkillRecord) {
  const signal = candidate.discovery.x
  const minSignal = Math.min(Math.max(numberFromEnv('X_CREATOR_REPLY_MIN_SIGNAL', 8), 1), 100)
  const maxAgeDays = Math.min(Math.max(numberFromEnv('X_CREATOR_REPLY_MAX_AGE_DAYS', 10), 1), 30)
  const createdAt = signal.createdAt ? Date.parse(signal.createdAt) : NaN

  if (!signal.authorUsername) return 'No public X author username available'
  if (Number(signal.engagementScore || 0) < minSignal) return `Signal below ${minSignal}`
  if (Number.isFinite(createdAt) && Date.now() - createdAt > maxAgeDays * 86_400_000) {
    return `Source post is older than ${maxAgeDays} days`
  }
  if (!skill.ai_review_approved) return 'Skill is not approved'
  if (Number(skill.github_stars || 0) < 10) return 'Skill is below the 10-star quality floor'
  if (!skill.license || skill.license === 'Unknown') return 'Skill license needs review'
  if (getReviewScore(skill) < 60) return 'Skill review score is below 60'
  if (isGenericFoundationRepoName(skill.github_repo || candidate.fullName)) return 'Generic foundation repository'
  return null
}

function clampDraftLimit(value: number | undefined) {
  const configured = value ?? numberFromEnv('X_CREATOR_OUTREACH_DRAFT_LIMIT', 2)
  return Math.min(Math.max(Math.floor(configured), 1), MAX_OUTREACH_DRAFTS_PER_RUN)
}

function buildListingUrl(slug: string, campaign: string) {
  return `https://www.openagentskill.com/skills/${slug}?ref=x&utm_source=creator_outreach&utm_medium=organic&utm_campaign=${encodeURIComponent(campaign)}`
}

export function buildCreatorEmailDraft(skill: SkillRecord, creatorName?: string | null): CreatorEmailDraft {
  const name = (creatorName || skill.author_name || 'there').trim()
  const listingUrl = buildListingUrl(skill.slug, 'creator_email_draft')
  const claimUrl = `${listingUrl}#claim-this-skill`

  return {
    subject: `${skill.name} is now listed on OpenAgentSkill`,
    text: [
      `Hi ${name},`,
      '',
      `We found ${skill.name} through its public skill launch and created an attribution-first listing with its install path, trust signals, and audit context.`,
      '',
      `Listing: ${listingUrl}`,
      `Claim it free to correct metadata or add maintainer context: ${claimUrl}`,
      '',
      'We do not change your repository or open promotional pull requests without your approval.',
      '',
      'OpenAgentSkill',
    ].join('\n'),
    claimUrl,
    listingUrl,
    automaticSending: false,
    contactPolicy: 'Draft only. Send only after creator opt-in or through a verified public business contact.',
  }
}

async function recordCreatorReplyDraft(candidate: CreatorOutreachCandidate, skill: SkillRecord) {
  const serverSecret = process.env.INDEXER_SECRET
  if (!serverSecret) throw new Error('Missing INDEXER_SECRET')

  const signal = candidate.discovery.x
  const emailDraft = buildCreatorEmailDraft(skill, signal.authorName || skill.author_name)
  const sourceUrl = signal.sourceUrl || `https://x.com/${signal.authorUsername}/status/${signal.tweetId}`
  const claimUrl = `${buildListingUrl(skill.slug, 'creator_x_reply')}#claim-this-skill`
  const response = await createPublicClient({ requestTimeoutMs: OUTREACH_DB_TIMEOUT_MS }).rpc('record_x_reply_draft', {
    p_server_secret: serverSecret,
    p_draft: {
      source_tweet_id: signal.tweetId,
      source_url: sourceUrl,
      source_author_username: signal.authorUsername,
      source_author_name: signal.authorName || skill.author_name || null,
      source_text: signal.text,
      skill_id: skill.id,
      skill_slug: skill.slug,
      draft_text: buildCommunityIndexedReplyText(skill, {
        creatorName: signal.authorName || signal.authorUsername || skill.author_name,
        sourceUrl,
      }),
      status: 'draft',
      score: signal.engagementScore,
      reason: `X skill radar: ${Math.round(signal.engagementScore)} signal, ${skill.github_stars} GitHub stars`,
      metadata: {
        outreach_kind: 'creator_x_reply',
        auto_publish: true,
        source: 'x_skill_radar',
        source_query: signal.query,
        source_post_created_at: signal.createdAt || null,
        source_metrics: signal.metrics,
        claim_url: claimUrl,
        share_kit_url: `https://www.openagentskill.com/creator-kit?skill=${encodeURIComponent(skill.slug)}`,
        email_draft: emailDraft,
      },
    },
  })

  if (response.error) throw new Error(`Failed to record creator outreach draft: ${response.error.message}`)
  return response.data as { status?: string; reason?: string } | null
}

/**
 * Turn newly discovered X-linked skills into one optional, attributable creator
 * reply. The database's partial unique index prevents repeat replies to the
 * same launch post even when future radar scans see it again.
 */
export async function enqueueCreatorOutreachDrafts(
  candidates: CandidateRepo[],
  options: { maxDrafts?: number } = {}
): Promise<CreatorOutreachResult> {
  const xCandidates = candidates.filter(isCreatorOutreachCandidate)
  if (!xCandidates.length) {
    return { status: 'skipped', eligible: 0, drafted: 0, skipped: 0, errors: 0, results: [] }
  }

  const skills = await getSkillsBySlugs(xCandidates.map(candidateSlug))
  const skillsBySlug = new Map(skills.map((skill) => [skill.slug, skill]))
  const maxDrafts = clampDraftLimit(options.maxDrafts)
  const decisions = xCandidates
    .map((candidate) => {
      const skill = skillsBySlug.get(candidateSlug(candidate))
      return {
        candidate,
        skill,
        reason: skill ? eligibilityReason(candidate, skill) : 'Skill is not indexed and approved yet',
      }
    })
    .sort((left, right) => (right.candidate.discovery.x.engagementScore || 0) - (left.candidate.discovery.x.engagementScore || 0))

  const results: CreatorOutreachResult['results'] = []
  let eligible = 0
  let drafted = 0
  let skipped = 0
  let errors = 0

  for (const decision of decisions) {
    const skillSlug = decision.skill?.slug || candidateSlug(decision.candidate)
    const sourceTweetId = decision.candidate.discovery.x.tweetId
    if (decision.reason || !decision.skill) {
      skipped += 1
      results.push({ skillSlug, sourceTweetId, status: 'skipped', reason: decision.reason || 'Not eligible' })
      continue
    }

    eligible += 1
    if (drafted >= maxDrafts) {
      skipped += 1
      results.push({ skillSlug, sourceTweetId, status: 'skipped', reason: `Per-run cap of ${maxDrafts} reached` })
      continue
    }

    try {
      const response = await recordCreatorReplyDraft(decision.candidate, decision.skill)
      if (response?.status === 'drafted') {
        drafted += 1
        results.push({ skillSlug, sourceTweetId, status: 'drafted' })
      } else {
        skipped += 1
        results.push({ skillSlug, sourceTweetId, status: 'skipped', reason: response?.reason || 'Duplicate creator reply draft' })
      }
    } catch (error) {
      errors += 1
      results.push({
        skillSlug,
        sourceTweetId,
        status: 'error',
        reason: error instanceof Error ? error.message : 'Unknown creator outreach error',
      })
    }
  }

  return {
    status: drafted > 0 ? 'drafted' : errors > 0 ? 'error' : 'skipped',
    eligible,
    drafted,
    skipped,
    errors,
    results,
  }
}
