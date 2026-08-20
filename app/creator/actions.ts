'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const ProfileSchema = z.object({
  username: z.string().trim().min(3).max(40).regex(/^[a-z0-9][a-z0-9-]*$/),
  display_name: z.string().trim().max(80),
  bio: z.string().trim().max(500),
  website: z.union([z.literal(''), z.string().url().max(300)]),
  github_username: z.string().trim().max(39).regex(/^$|^[a-z0-9]([a-z0-9-]{0,37}[a-z0-9])?$/i),
  x_username: z.string().trim().max(15).regex(/^$|^[a-z0-9_]{1,15}$/i),
})

export async function updateCreatorProfile(formData: FormData) {
  const parsed = ProfileSchema.safeParse({
    username: formData.get('username'),
    display_name: formData.get('display_name'),
    bio: formData.get('bio'),
    website: formData.get('website'),
    github_username: String(formData.get('github_username') || '').replace(/^@/, ''),
    x_username: String(formData.get('x_username') || '').replace(/^@/, ''),
  })

  if (!parsed.success) redirect('/creator?error=invalid-profile')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/creator')

  const githubUsername = parsed.data.github_username.toLowerCase() || null
  const xUsername = parsed.data.x_username.toLowerCase() || null
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    username: parsed.data.username.toLowerCase(),
    display_name: parsed.data.display_name || null,
    bio: parsed.data.bio || null,
    website: parsed.data.website || null,
    github_username: githubUsername,
    x_username: xUsername,
    twitter: xUsername ? `https://x.com/${xUsername}` : null,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    redirect(error.code === '23505' ? '/creator?error=handle-taken' : '/creator?error=save-failed')
  }

  revalidatePath('/creator')
  revalidatePath(`/creators/${parsed.data.username.toLowerCase()}`)
  redirect('/creator?saved=1')
}
