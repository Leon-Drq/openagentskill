import { NextResponse } from 'next/server'
import { auditRiskColor, auditRiskLabel, buildSkillAudit, normalizeAuditRecord } from '@/lib/audits'
import { getAgentOutcomeStats, getSkillAuditBySlug, getSkillBySlug } from '@/lib/db/skills'
import { getAgentProvenProfile } from '@/lib/agent-proven'
import { getSkillTrustProfile } from '@/lib/trust'

export const dynamic = 'force-dynamic'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function estimateWidth(text: string, base = 10) {
  return Math.max(48, Math.round(text.length * 6.2 + base))
}

function makeBadge(label: string, value: string, color = '#111111') {
  const safeLabel = escapeXml(label)
  const safeValue = escapeXml(value)
  const labelWidth = estimateWidth(label, 16)
  const valueWidth = estimateWidth(value, 18)
  const width = labelWidth + valueWidth
  const valueX = labelWidth + valueWidth / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${safeLabel}: ${safeValue}">
  <title>${safeLabel}: ${safeValue}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".08"/>
    <stop offset="1" stop-color="#000" stop-opacity=".08"/>
  </linearGradient>
  <clipPath id="r"><rect width="${width}" height="20" rx="0" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${width}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14">${safeLabel}</text>
    <text x="${valueX}" y="14">${safeValue}</text>
  </g>
</svg>`
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const skill = await getSkillBySlug(slug).catch(() => null)

  if (!skill) {
    return new NextResponse(makeBadge('OpenAgentSkill', 'not found', '#737373'), {
      status: 404,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    })
  }

  const url = new URL(request.url)
  const mode = (url.searchParams.get('metric') || 'listed').toLowerCase()
  const wantsListed = mode === 'listed' || mode === 'listing' || mode === 'registry'
  const wantsProven = mode === 'proven' || mode === 'agent-proven'
  const trust = getSkillTrustProfile(skill)
  const storedAudit = mode === 'audit' ? await getSkillAuditBySlug(skill.slug).catch(() => null) : null
  const provenStats = wantsProven ? await getAgentOutcomeStats(skill.slug).catch(() => null) : null
  const proven = wantsProven ? getAgentProvenProfile(provenStats) : null
  const audit = mode === 'audit'
    ? storedAudit
      ? normalizeAuditRecord(storedAudit)
      : buildSkillAudit(skill)
    : null
  const label = url.searchParams.get('label') || 'OpenAgentSkill'
  const value =
    wantsListed
      ? 'listed'
      : mode === 'stars'
      ? `${Number(skill.github_stars || 0).toLocaleString()} stars`
      : mode === 'quality'
        ? `${Math.round(Number(skill.quality_score || 0))}/100 quality`
        : proven
          ? proven.metrics.totalOutcomes > 0
            ? `${proven.score}/100 proven`
            : 'unproven'
        : mode === 'audit' && audit
          ? `${audit.audit_score}/100 ${auditRiskLabel(audit.risk_level).toLowerCase()}`
          : `${trust.score}/100 ${trust.tier === 'production' ? 'trusted' : 'trust'}`
  const color = wantsListed
    ? '#006b4f'
    : proven
    ? proven.metrics.totalOutcomes <= 0
      ? '#737373'
      : proven.score >= 75
        ? '#006b4f'
        : proven.score >= 50
          ? '#b7791f'
          : '#991b1b'
    : mode === 'audit' && audit
      ? auditRiskColor(audit.risk_level)
      : trust.tier === 'production'
        ? '#111111'
        : trust.tier === 'strong'
          ? '#2563eb'
          : trust.tier === 'review'
            ? '#b45309'
            : '#991b1b'

  return new NextResponse(makeBadge(label, value, color), {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
