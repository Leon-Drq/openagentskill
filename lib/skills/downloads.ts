import 'server-only'
import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifiedDownloadBytes } from './download-policy'
import { isDataPaused } from '@/lib/data-maintenance'
import { slugQueryBatches } from './media-query'

const DOWNLOAD_BATCH_SIZE = 100
const getCachedDownloadTotals = unstable_cache(async (slugs: string[]) => {
  const db = createAdminClient({ requestTimeoutMs: 3000 })
  const { data, error } = await db.from('skill_download_totals').select('skill_slug,downloads')
    .in('skill_slug', slugs).limit(DOWNLOAD_BATCH_SIZE)
  if (error) throw error
  return Object.fromEntries((data || []).map(row => [row.skill_slug, Number(row.downloads)])) as Record<string, number>
}, ['site-download-totals-v3-scoped'], { revalidate: 3600, tags: ['site-download-totals'] })

export async function getDownloadTotals(slugs: readonly string[]) {
  // Missing counts are not zero downloads; callers already display null safely.
  if (isDataPaused()) return null
  const normalized = [...new Set(slugs.map(slug => slug.trim()).filter(Boolean))].sort()
  const result: Record<string, number> = {}
  // Required scope prevents accidental whole-ledger reads. Batch without
  // truncating a ranking's candidates; reordered callers share the same keys.
  for (const batch of slugQueryBatches(normalized)) {
    Object.assign(result, await getCachedDownloadTotals(batch))
  }
  return result
}

export async function downloadResponse(input: {
  userId: string; slug: string; bytes: Uint8Array; size: number; sha256: string;
  kind: 'skill-document' | 'paid-file'; filename: string;
}, db = createAdminClient({ requestTimeoutMs: 8000 })) {
  if (!verifiedDownloadBytes(input.bytes, input.size, input.sha256) || !/^[a-zA-Z0-9._-]+$/.test(input.filename)) throw new Error('invalid_download')
  const { error } = await db.rpc('record_skill_download', {
    p_user_id: input.userId, p_slug: input.slug, p_sha256: input.sha256, p_kind: input.kind,
  })
  // A failed ledger write must not produce a falsely tracked file response.
  if (error) throw error
  // Stream the verified bytes so paid packages can exceed the buffered function limit.
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(input.bytes)); controller.close() } })
  return new NextResponse(body, { headers: {
    'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${input.filename}"`,
    'Content-Length': String(input.size), 'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex', Vary: 'Cookie',
  } })
}
