export function shouldRetryAutomatedReview(reviewModel: string | null | undefined) {
  return Boolean(reviewModel?.startsWith('heuristic'))
}
