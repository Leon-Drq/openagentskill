export function getReviewEvidence(skill: {
  ai_review_score?: Record<string, unknown> | null; listing_status?: string | null;
  publisher_verified?: boolean | null; source_sync_status?: string | null;
}) {
  const review = skill.ai_review_score || {}
  const current = !['changed','error'].includes(skill.source_sync_status || '')
  return {
    indexed: true,
    static_checked: review.method === 'static' && current,
    ai_reviewed: review.method === 'ai' && Boolean(review.reviewed_at) && current,
    creator_verified: skill.publisher_verified === true,
    review_result: current ? String(review.decision || 'not_recorded') : 'version_needs_review',
    reviewed_at: typeof review.reviewed_at === 'string' ? review.reviewed_at : null,
    package_fingerprint: typeof review.package_fingerprint === 'string' ? review.package_fingerprint : null,
    policy_version: typeof review.policy_version === 'string' ? review.policy_version : null,
    notice: 'Publication, static checks, AI review, and creator verification are independent facts. None guarantees runtime safety.',
  }
}
