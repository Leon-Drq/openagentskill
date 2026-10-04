'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { publicWebsite } from '@/lib/creator-profile'
import { getLocaleFromSearchParam } from '@/lib/i18n/config'
import { accountHref } from '@/lib/account-workspace'

const schema = z.object({ display_name: z.string().trim().max(80), bio: z.string().trim().max(500), website: z.string().trim().max(300).refine(value => !value || publicWebsite(value) !== null) })
export async function updateAccountProfile(form: FormData) {
  const locale = getLocaleFromSearchParam(String(form.get('lang') || 'en')) || 'en'
  const next = accountHref('settings', locale)
  const client = await createClient()
  const { data: { user }, error: authError } = await client.auth.getUser()
  if (authError || !user || user.is_anonymous) redirect(`/auth/login?next=${encodeURIComponent(next)}`)
  const parsed = schema.safeParse({ display_name: form.get('display_name'), bio: form.get('bio'), website: form.get('website') })
  if (!parsed.success) redirect(`${next}&error=invalid-profile`)
  const current = await client.from('profiles').select('username').eq('id', user.id).maybeSingle()
  if (current.error) redirect(`${next}&error=save-failed`)
  // Identity, ownership, invite codes, points, and shared handles cannot be edited here.
  const result = await client.from('profiles').upsert({ id: user.id, display_name: parsed.data.display_name || null, bio: parsed.data.bio || null, website: parsed.data.website || null, updated_at: new Date().toISOString() })
  if (result.error) redirect(`${next}&error=save-failed`)
  revalidatePath('/profile')
  revalidatePath('/creator')
  if (current.data?.username) {
    revalidatePath(`/creators/${current.data.username}`)
    revalidatePath(`/creators/${current.data.username}/opengraph-image`)
    revalidatePath(`/creators/${current.data.username}/twitter-image`)
  }
  redirect(`${next}&saved=1`)
}
