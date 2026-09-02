export const AUTOMATIC_DISCOVERY_MIN_STARS = 20
export const PUBLICATION_DAILY_TARGET = 1_000
export const PUBLICATION_FAST_TRACK_PER_RUN = 8
export const PUBLICATION_AI_REVIEW_PER_RUN = 8
// Six windows per hour provide enough retry headroom to reach the rolling
// 1,000/day target when some AI-reviewed candidates time out or are rejected.
// The publication worker still stops at PUBLICATION_DAILY_TARGET, so this
// increases resilience rather than raising the public release ceiling.
export const PUBLICATION_RUNS_PER_DAY = 144

export function meetsAutomaticDiscoveryStarFloor(stars: number | null | undefined) {
  return Number(stars || 0) >= AUTOMATIC_DISCOVERY_MIN_STARS
}

export function automaticPublicationCapacityPerDay() {
  return (
    (PUBLICATION_FAST_TRACK_PER_RUN + PUBLICATION_AI_REVIEW_PER_RUN) *
    PUBLICATION_RUNS_PER_DAY
  )
}
