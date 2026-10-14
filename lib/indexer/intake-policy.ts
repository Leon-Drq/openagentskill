export const AUTOMATIC_DISCOVERY_MIN_STARS = 20
export const PUBLICATION_DAILY_TARGET = 1_000
export const PUBLICATION_FAST_TRACK_PER_RUN = 14
export const PUBLICATION_AI_REVIEW_PER_RUN = 8
// Four batched windows per hour reduce idle invocations. A larger fast-track
// batch retains 2,112 daily candidate slots for the unchanged 1,000/day ceiling.
// AI review gates and the per-run AI limit remain unchanged.
export const PUBLICATION_RUNS_PER_DAY = 96

export function meetsAutomaticDiscoveryStarFloor(stars: number | null | undefined) {
  return Number(stars || 0) >= AUTOMATIC_DISCOVERY_MIN_STARS
}

export function automaticPublicationCapacityPerDay() {
  return (
    (PUBLICATION_FAST_TRACK_PER_RUN + PUBLICATION_AI_REVIEW_PER_RUN) *
    PUBLICATION_RUNS_PER_DAY
  )
}
