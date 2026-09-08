import { createHash } from 'node:crypto'
// @ts-expect-error Standalone Node regression tests load TypeScript directly.
import { evaluateFastTrackCandidate } from '../indexer/fast-track.ts'

export const REVIEW_POLICY_VERSION = 'risk-first-v1'
export interface ReviewPackage {
  repository: string
  readmeContent: string
  codeFiles: { path: string; content: string }[]
  manifestData?: object & { license?: unknown }
  packageFingerprint?: string
  packageComplete?: boolean
  githubStats: { stars: number; forks: number; lastUpdated: string; license?: string; language?: string }
}

export function reviewFingerprint(data: ReviewPackage) {
  return createHash('sha256').update(JSON.stringify({
    policy: REVIEW_POLICY_VERSION,
    repository: data.repository,
    package: data.packageFingerprint,
    complete: data.packageComplete === true,
    document: data.readmeContent,
    files: [...data.codeFiles].sort((a, b) => a.path.localeCompare(b.path)),
    license: data.githubStats.license || data.manifestData?.license,
    manifest: data.manifestData,
  })).digest('hex')
}

export function triageReview(data: ReviewPackage) {
  const license = String(data.manifestData?.license || data.githubStats.license || '')
  const knownLicense = /^(MIT|Apache-2\.0|BSD-[23]-Clause|ISC|MPL-2\.0|(?:A?GPL|LGPL)-[23]\.0(?:-only|-or-later)?|CC0-1\.0|Unlicense)$/i.test(license.trim())
  const decision = evaluateFastTrackCandidate({
    stars: data.githubStats.stars, minimumStars: 0,
    licenseStatus: !license || /unknown|noassertion/i.test(license) ? 'unknown'
      : /proprietary|unlicensed|all rights reserved/i.test(license) ? 'restricted' : 'detected',
    updatedAt: data.githubStats.lastUpdated,
    document: data.readmeContent, files: data.codeFiles,
    packageTruncated: data.packageComplete !== true,
  })
  const manifest = data.manifestData as { name?: string; description?: string } | undefined
  const structured = Boolean(manifest?.name && manifest?.description && data.readmeContent.length >= 300)
  const fingerprint = reviewFingerprint(data)
  // Incomplete package coverage cannot be repaired by asking a model about the same excerpt.
  const manual = data.packageComplete !== true || decision.riskLevel === 'high' || decision.riskLevel === 'critical'
    || !structured || !knownLicense
  // A reproducible 2% sample audits apparently low-risk packages too.
  const sampled = decision.eligible && parseInt(fingerprint.slice(0, 8), 16) % 50 === 0
  return { fingerprint, decision, sampled, method: manual ? 'manual' : decision.eligible && !sampled ? 'static' : 'ai' } as const
}
