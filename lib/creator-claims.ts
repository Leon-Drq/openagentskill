import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath, revalidateTag } from 'next/cache'

/** Call only after ownership verification. Keep D1 writes below its bind budget,
 * and require the listing update to finish before reporting claim success.
 * Repeating this operation also repairs an approved claim whose earlier update failed.
 */
export async function syncVerifiedClaimListings(
  admin: SupabaseClient,
  slugs: string[],
  owner: { userId: string; githubUsername: string | null; xUsername?: string | null },
) {
  const uniqueSlugs = [...new Set(slugs)]
  for (let offset = 0; offset < uniqueSlugs.length; offset += 50) {
    const batch = uniqueSlugs.slice(offset, offset + 50)
    const { data, error } = await admin.from('skills').update({
      author_user_id: owner.userId,
      publisher_github: owner.githubUsername,
      ...(owner.xUsername !== undefined ? { publisher_x: owner.xUsername } : {}),
      publisher_verified: true,
      updated_at: new Date().toISOString(),
    }).in('slug', batch).select('slug')
    if (error || data?.length !== batch.length) {
      throw new Error('Ownership verified, but listing updates are incomplete. Retry the claim to finish syncing.')
    }
    // The data is committed. Cache failure must not hide a successful claim.
    try {
      for (const slug of batch) {
        revalidateTag(`public-skill:${slug}`, { expire: 0 })
        revalidatePath(`/skills/${slug}`)
      }
      revalidateTag('public-skill-directory', { expire: 0 })
      revalidatePath('/creator')
    } catch {
      console.warn('[claims] Cache invalidation deferred after ownership sync.')
    }
  }
}
