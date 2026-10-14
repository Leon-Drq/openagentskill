import 'server-only'
import { unstable_cache } from 'next/cache'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifiedDownloadBytes } from './download-policy'

export const getDownloadTotals = unstable_cache(async () => {
  const db = createAdminClient({ requestTimeoutMs: 3000 })
  const result: Record<string, number> = {}
  // Keyset pagination: never silently truncate a growing ledger at 1000 rows.
  let after = ''
  for (;;) {
    const { data, error } = await db.from('skill_download_totals').select('skill_slug,downloads')
      .gt('skill_slug', after).order('skill_slug').limit(1000)
    if (error) throw error
    for (const row of data || []) result[row.skill_slug] = Number(row.downloads)
    if (!data || data.length < 1000) break
    after = data[data.length - 1].skill_slug
  }
  return result
}, ['site-download-totals-v2-operations'], { revalidate: 60, tags: ['site-download-totals'] })

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
