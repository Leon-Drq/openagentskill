export type PaginationItem = number | 'gap-before' | 'gap-after'

export function requestedDirectoryPage(value: string | string[] | undefined): number | null {
  if (value === undefined) return 1
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const page = Number(value)
  return Number.isSafeInteger(page) ? page : null
}

export function pageCount(total: number, size = 16) {
  return Math.max(1, Math.ceil(Math.max(0, total) / size))
}

export function clampResultPage(page: number, total: number, size = 16) {
  return Math.max(1, Math.min(page, pageCount(total, size)))
}

/** Keep link count bounded even for very large directories. */
export function paginationItems(page: number, totalPages: number, compact = false): PaginationItem[] {
  const current = Math.max(1, Math.min(page, totalPages))
  if (totalPages <= (compact ? 3 : 7)) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages = compact
    ? [1, current === 1 ? 2 : current === totalPages ? totalPages - 1 : current, totalPages]
    : [1, ...Array.from({ length: current <= 3 || current >= totalPages - 2 ? 4 : 3 }, (_, i) =>
        (current <= 3 ? 2 : current >= totalPages - 2 ? totalPages - 4 : current - 1) + i), totalPages]
  const result: PaginationItem[] = []
  for (const value of [...new Set(pages)].sort((a, b) => a - b)) {
    const previous = result[result.length - 1]
    if (typeof previous === 'number' && value - previous > 1) result.push(previous === 1 ? 'gap-before' : 'gap-after')
    result.push(value)
  }
  return result
}
