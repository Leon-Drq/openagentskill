export type DatedDirectoryEntry = { slug: string; timestamp: string | null }

export function isChronologicalSort(sort: string) {
  return sort === 'new' || sort === 'fresh'
}

function timestamp(value: string | null) {
  if (!value) return Number.NEGATIVE_INFINITY
  const millis = Date.parse(value)
  if (!Number.isFinite(millis)) return Number.NEGATIVE_INFINITY
  // Postgres timestamps retain microseconds; dropping them could reorder a
  // same-millisecond batch differently on either side of a page boundary.
  const fraction = value.match(/\.(\d+)/)?.[1] || ''
  return millis * 1000 + Number(fraction.slice(3, 6).padEnd(3, '0'))
}

export function compareDirectoryDates(a: DatedDirectoryEntry, b: DatedDirectoryEntry) {
  return timestamp(b.timestamp) - timestamp(a.timestamp) || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)
}

export function chronologicalRegistryWindow(offset: number, providerCount: number, size = 16) {
  const from = Math.max(0, offset - providerCount)
  return { offset: from, limit: offset + size - from }
}

/**
 * At most P providers can precede any registry row. Registry rows before
 * max(0, offset - P) therefore precede this page, and rows at offset + size
 * cannot enter it. Fetch only those date/slug keys, then hydrate visible rows.
 */
export function chronologicalDirectoryPage<T extends DatedDirectoryEntry>(
  registry: T[], providers: T[], offset: number, registryOffset = 0, size = 16,
): T[] {
  return [...registry, ...providers].sort(compareDirectoryDates)
    .slice(offset - registryOffset, offset - registryOffset + size)
}
