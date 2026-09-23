'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { publicWebsite } from '@/lib/creator-profile'
import { isLocale } from '@/lib/i18n/config'

const ProfileSchema = z.object({
  username: z.string().trim().min(3).max(40).regex(/^[a-z0-9][a-z0-9-]*$/).refine(value => !['github', 'new', 'settings', 'edit'].includes(value)),
  display_name: z.string().trim().max(80),
  bio: z.string().trim().max(500),
  website: z.string().trim().max(300).refine(value => value === '' || publicWebsite(value) !== null),
  github_username: z.string().trim().max(39).regex(/^$|^[a-z0-9]([a-z0-9-]{0,37}[a-z0-9])?$/i),
  x_username: z.string().trim().max(15).regex(/^$|^[a-z0-9_]{1,15}$/i),
})

export async function updateCreatorProfile(formData: FormData) {
  const language = String(formData.get('lang') || 'en')
  const locale = isLocale(language) ? language : 'en'
  const resultUrl = (query: string) => `/creator?tab=profile&lang=${locale}&${query}`
  const parsed = ProfileSchema.safeParse({
    username: formData.get('username'),
    display_name: formData.get('display_name'),
    bio: formData.get('bio'),
    website: formData.get('website'),
    github_username: String(formData.get('github_username') || '').replace(/^@/, ''),
    x_username: String(formData.get('x_username') || '').replace(/^@/, ''),
  })

  if (!parsed.success) redirect(resultUrl('error=invalid-profile'))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/creator')

  const { data: currentProfile, error: profileError } = await supabase
    .from('profiles')
    .select('username,github_username,github_verified_at,x_username,x_verified_at')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) redirect(resultUrl('error=save-failed'))

  // A shared public URL must not disappear when someone edits their biography.
  if (currentProfile?.username && currentProfile.username !== parsed.data.username) redirect(resultUrl('error=handle-locked'))

  const githubUsername = currentProfile?.github_verified_at
    ? currentProfile.github_username
    : parsed.data.github_username.toLowerCase() || null
  const xUsername = currentProfile?.x_verified_at
    ? currentProfile.x_username
    : parsed.data.x_username.toLowerCase() || null
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
    redirect(resultUrl(error.code === '23505' ? 'error=handle-taken' : 'error=save-failed'))
  }

  revalidatePath('/creator')
  revalidatePath(`/creators/${parsed.data.username.toLowerCase()}`)
  revalidatePath(`/creators/${parsed.data.username.toLowerCase()}/opengraph-image`)
  revalidatePath(`/creators/${parsed.data.username.toLowerCase()}/twitter-image`)
  redirect(resultUrl('saved=1'))
}
