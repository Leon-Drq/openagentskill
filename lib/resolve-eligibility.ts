/** Source evidence is an eligibility gate, never a security approval. */
export function isInstallRecommendationEligible(candidate: {
  source_evidence: { canOfferInstall: boolean }
  safety: { blocked: boolean }
}) {
  return candidate.source_evidence.canOfferInstall && !candidate.safety.blocked
}
