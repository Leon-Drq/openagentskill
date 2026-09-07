import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { isOwnerPublishAuthorized } from '@/lib/security/owner-publish-auth'
import { OwnerPublicationSchema } from '@/lib/skills/owner-publication-schema'
import { OwnerPublicationError, publishOwnerSkill } from '@/lib/skills/owner-publication'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60
const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }

export async function GET(request: NextRequest) {
  if (!isOwnerPublishAuthorized(request)) {
    return NextResponse.json({ error: 'Owner publishing credentials required.' }, { status: 401, headers })
  }
  try {
    // Verify the real server credential and migration without creating a listing
    // or returning any private publication history.
    const { error } = await createAdminClient({ requestTimeoutMs: 8000 })
      .from('owner_skill_publications').select('request_id', { head: true }).limit(1)
    if (error) throw error
    return NextResponse.json({ ready: true, publication_channel: 'owner', community_review: 'unchanged' }, { headers })
  } catch {
    return NextResponse.json({ ready: false, error: 'Owner publishing database connection is unavailable.' }, { status: 503, headers })
  }
}

export async function POST(request: NextRequest) {
  if (!isOwnerPublishAuthorized(request)) {
    return NextResponse.json({ error: 'Owner publishing credentials required.' }, { status: 401, headers })
  }
  if (Number(request.headers.get('content-length') || 0) > 16000) {
    return NextResponse.json({ error: 'Request too large.' }, { status: 413, headers })
  }
  try {
    const body = await request.text()
    if (Buffer.byteLength(body) > 16000) return NextResponse.json({ error: 'Request too large.' }, { status: 413, headers })
    const parsed = OwnerPublicationSchema.safeParse(JSON.parse(body))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid publication request.', issues: parsed.error.issues }, { status: 400, headers })
    const result = await publishOwnerSkill(parsed.data)
    if (!parsed.data.dryRun) {
      // Publication is already committed; invalidation failures must not turn
      // a successful publish into an ambiguous error for the caller.
      try {
        revalidateTag('public-skill-directory', { expire: 0 })
        revalidatePath(`/skills/${result.slug}`)
        revalidatePath('/skills')
      } catch {
        console.warn('[owner-publish] Cache invalidation deferred after publication.')
      }
    }
    return NextResponse.json({ success: true, ...result }, { headers })
  } catch (error) {
    if (error instanceof OwnerPublicationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: error.status, headers })
    }
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400, headers })
    console.error('[owner-publish] Source validation or publication failed.')
    return NextResponse.json({ error: 'Could not read the source. Retry using the same requestId.' }, { status: 503, headers })
  }
}
