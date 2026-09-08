// Publication authority and automated review are independent facts.
export const PUBLIC_SKILL_FILTER = 'ai_review_approved.eq.true,listing_status.in.(owner_published,static_checked)'

export function needsOwnerPublicationReview(skill: {
  listing_status?: string | null
  ai_review_approved?: boolean | null
}) {
  return skill.listing_status === 'owner_published' && skill.ai_review_approved !== true
}

export const OWNER_PUBLICATION_NOTICE =
  'Published by the site owner. Automated review approval and runtime verification are not implied.'
