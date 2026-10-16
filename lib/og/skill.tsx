import { ImageResponse } from 'next/og'
import { SkillSocialCard } from '@/components/skill-social-card'
import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { convertSkillRecordToManifest } from '@/lib/db/skills'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'
import { getCanonicalSkillSlug, getSkillBySlugOrFallbackStrict } from '@/lib/skill-fallbacks'
import { getGitHubAvatarUrl } from '@/lib/github-owner'
import { defaultLocale } from '@/lib/i18n/config'
import { getSkillGitHubOwner, getSkillSocialProvenance } from '@/lib/seo/social-card'
import { buildSkillSearchMetadata } from '@/lib/seo/search-metadata'
import { renderOgOrCached } from './response'
import { ogError, validOgIdentifier } from './cache'

const size = { width: 1200, height: 630 }

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

export async function skillOgImage(requestedSlug: string) {
  if (!validOgIdentifier(requestedSlug)) return ogError()
  const slug = getCanonicalSkillSlug(requestedSlug)
  return renderOgOrCached('skill', [slug], () => renderSkill(slug))
}

async function renderSkill(slug: string) {
  // A backend failure is a retryable 503, never a cacheable missing skill.
  const record = await getSkillBySlugOrFallbackStrict(slug)

  // A missing skill must not produce a plausible-looking social card. Those
  // 200 image responses make obsolete URLs look valid to crawlers and social
  // scrapers, which in turn contributes to soft-404 noise.
  if (!record) {
    return ogError()
  }

  const skill = convertSkillRecordToManifest(record)
  const stars = formatCompactNumber(skill.stats.stars || 0)
  const quality = getSkillQualityProfile(record)
  const score = quality.score || skill.stats.qualityScore || 0
  const safety = auditRiskLabel(buildSkillAudit(record).risk_level)
  const install = record.github_repo
    ? `npx skills add ${record.github_repo}`
    : skill.technical.installCommand || `npx skills add ${slug}`
  const provenance = getSkillSocialProvenance(record)
  const githubOwner = getSkillGitHubOwner(record)
  const socialDescription = buildSkillSearchMetadata(record, defaultLocale).description

  return new ImageResponse(
    <SkillSocialCard
      name={truncate(skill.name, 46)}
      slug={slug}
      scenario={truncate(socialDescription, 82)}
      score={score}
      safety={safety}
      stars={`${stars} stars`}
      install={truncate(install, 48)}
      statusLabel={provenance.label}
      statusDetail={provenance.detail}
      statusTone={provenance.tone}
      creator={truncate(githubOwner, 24)}
      repository={truncate(record.github_repo || record.repository || slug, 32)}
      avatarUrl={record.github_repo ? getGitHubAvatarUrl(githubOwner, 144) : null}
    />,
    size
  )
}
