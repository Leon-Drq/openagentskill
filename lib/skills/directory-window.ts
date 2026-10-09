/** Preserve the combined ranking while projecting only the visible cards. */
export function projectDirectoryWindow<T, U>(
  records: T[], providers: U[], offset: number, prefix: number,
  project: (record: T) => U, size = 16,
): U[] {
  const total = records.length + providers.length
  const cards: U[] = []
  for (let index = offset; index < Math.min(offset + size, total); index++) {
    if (index < prefix) cards.push(providers[index])
    else if (index < prefix + records.length) cards.push(project(records[index - prefix]))
    else cards.push(providers[index - records.length])
  }
  return cards
}
