/** Missing URL parameters are null, which Number(null) would turn into zero. */
export function parseOptionalNonNegative(searchValue: string | null, bodyValue: unknown): number | undefined {
  for (const value of [searchValue, bodyValue]) {
    if (value == null || typeof value === 'boolean' || (typeof value === 'string' && !value.trim())) continue
    if (typeof value !== 'string' && typeof value !== 'number') continue
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) return parsed
  }
  return undefined
}
