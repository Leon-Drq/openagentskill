import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { isOwnerPublishAuthorized } from '@/lib/security/owner-publish-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ProductMetadataSchema } from '@/lib/skills/product-metadata-schema'

export const runtime = 'nodejs'
const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
const schema = z.object({
  repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/).max(200),
  skillPath: z.string().min(1).max(500).regex(/(^|\/)SKILL\.md$/),
  submissionId: z.string().uuid().optional(),
  requestId: z.string().uuid(), reason: z.string().trim().min(10).max(2000),
  productMetadata: ProductMetadataSchema,
  dryRun: z.boolean().default(false),
}).strict()

/** Metadata-only owner operation: never publishes, retries review or changes source. */
export async function POST(request: NextRequest) {
  if (!isOwnerPublishAuthorized(request)) return NextResponse.json({ error: 'Owner credentials required.' }, { status: 401, headers })
  try {
    if (Number(request.headers.get('content-length') || 0) > 40000) return NextResponse.json({ error: 'Request too large.' }, { status: 413, headers })
    const raw = await request.text()
    if (Buffer.byteLength(raw) > 40000) return NextResponse.json({ error: 'Request too large.' }, { status: 413, headers })
    const parsed = schema.safeParse(JSON.parse(raw))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid product metadata.', issues: parsed.error.issues }, { status: 400, headers })
    const body = parsed.data
    const { data, error } = await createAdminClient({ requestTimeoutMs: 12000 }).rpc('update_skill_product_metadata', {
      p_request_id: body.requestId, p_repository: body.repository, p_path: body.skillPath,
      p_submission_id: body.submissionId || null, p_metadata: body.productMetadata,
      p_reason: body.reason, p_dry_run: body.dryRun,
    })
    if (error) return NextResponse.json({ error: error.code === '22023' ? error.message : 'Metadata could not be saved. Retry with the same requestId.' }, { status: error.code === '22023' ? 409 : 503, headers })
    if (!body.dryRun && data.slug) {
      try {
        revalidateTag('public-skill-directory', { expire: 0 })
        revalidateTag(`public-skill:${data.slug}`, { expire: 0 })
        revalidatePath(`/skills/${data.slug}`)
        revalidatePath('/skills')
      } catch { console.warn('[product-metadata] Cache invalidation deferred.') }
    }
    return NextResponse.json({ success: true, ...data, url: data.slug && (data.ai_review_approved || ['static_checked', 'owner_published'].includes(data.listing_status)) ? `https://www.openagentskill.com/skills/${data.slug}` : null }, { headers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof SyntaxError ? 'Invalid JSON.' : 'Metadata update unavailable.' }, { status: error instanceof SyntaxError ? 400 : 503, headers })
  }
}
