// Keep PostgREST URLs bounded as automatic preview coverage grows. Large
// memberships use the invoker RPC's POST body, with the same SQL filters.
export function mediaSlugsNeedPost(slugs: string[] | null) {
  return slugs !== null && encodeURIComponent(slugs.join(',')).length > 2400
}

export function slugQueryBatches(slugs: string[]) {
  const batches: string[][] = []
  let batch: string[] = [], length = 0
  for (const slug of slugs) {
    const size = encodeURIComponent(slug).length + 3
    if (length + size > 2400 && batch.length) { batches.push(batch); batch = []; length = 0 }
    batch.push(slug); length += size
  }
  if (batch.length) batches.push(batch)
  return batches
}
