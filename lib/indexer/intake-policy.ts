export const AUTOMATIC_DISCOVERY_MIN_STARS = 20
export const PUBLICATION_DAILY_TARGET = 1_000
export const PUBLICATION_FAST_TRACK_PER_RUN = 8
export const PUBLICATION_AI_REVIEW_PER_RUN = 8
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
