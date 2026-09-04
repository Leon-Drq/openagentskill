import { ImageResponse } from 'next/og'
import { SkillSocialCard } from '@/components/skill-social-card'
import { auditRiskLabel, buildSkillAudit } from '@/lib/audits'
import { convertSkillRecordToManifest } from '@/lib/db/skills'
import { formatCompactNumber, getSkillQualityProfile } from '@/lib/quality'
import { getSkillBySlugOrFallback } from '@/lib/skill-fallbacks'
import { getGitHubAvatarUrl } from '@/lib/github-owner'
import { defaultLocale } from '@/lib/i18n/config'
import { getSkillGitHubOwner, getSkillSocialProvenance } from '@/lib/seo/social-card'
import { buildSkillSearchMetadata } from '@/lib/seo/search-metadata'

export const runtime = 'nodejs'
export const alt = 'OpenAgentSkill skill preview'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let record = null
  try {
    record = await getSkillBySlugOrFallback(slug)
  } catch {
    record = null
  }

  // A missing skill must not produce a plausible-looking social card. Those
  // 200 image responses make obsolete URLs look valid to crawlers and social
  // scrapers, which in turn contributes to soft-404 noise.
  if (!record) {
    return new Response('Not Found', {
      status: 404,
      headers: {
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
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
