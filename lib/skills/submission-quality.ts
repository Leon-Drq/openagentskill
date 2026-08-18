export interface SubmissionQualityInput {
  githubStars: number
  githubRepo: string
  githubUpdatedAt: string
  reviewTotal: number
  reviewMaximum?: number
  tags: string[]
  verified?: boolean
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100
}

export function estimateSubmissionQuality(input: SubmissionQualityInput) {
  const stars = Math.max(0, Number(input.githubStars || 0))
  const starScore = Math.min(35, Math.log10(stars + 1) * 7)
  const reviewMaximum = Math.max(1, input.reviewMaximum || 40)
  const reviewScore = Math.min(15, Math.max(0, input.reviewTotal) / reviewMaximum * 15)
  const updatedAt = Date.parse(input.githubUpdatedAt)
  const ageDays = Number.isFinite(updatedAt) ? (Date.now() - updatedAt) / 86_400_000 : Number.POSITIVE_INFINITY
  const freshnessScore = ageDays <= 30 ? 15 : ageDays <= 90 ? 12 : ageDays <= 180 ? 8 : ageDays <= 365 ? 4 : 0
  const metadataScore =
    (/^[^/]+\/[^/]+$/.test(input.githubRepo) ? 3 : 0) +
    (input.tags.length >= 3 ? 4 : 0) +
    (input.verified ? 8 : 0)
  const score = Math.min(100, starScore + reviewScore + freshnessScore + metadataScore)

  return {
    score: roundScore(score),
    signals: {
      star_score: roundScore(starScore),
      review_score: roundScore(reviewScore),
      freshness_score: freshnessScore,
      usage_score: 0,
      metadata_score: metadataScore,
      model: 'v2',
    },
  }
}
