'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { studioCopy } from '@/lib/i18n/creator-studio-copy'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'

/** Mounted only when a menu opens: no extra auth request on every public page load. */
export function CreatorMenuProfile({ onNavigate }: { onNavigate: () => void }) {
  const { locale } = useI18n()
  const [profile, setProfile] = useState<{ username: string | null } | null>(null)
  useEffect(() => {
    let active = true
    void import('@/lib/supabase/client').then(async ({ createClient }) => {
      const client = createClient()
      const { data } = await client.auth.getUser()
      if (!data.user) return
      const { data: row } = await client.from('profiles').select('username').eq('id', data.user.id).maybeSingle()
      if (active) setProfile({ username: row?.username || null })
    }).catch(() => { /* The static Creator Center entry remains available. */ })
    return () => { active = false }
  }, [])
  if (!profile) return null
  return <Link prefetch={false} onClick={onNavigate} href={getLocalizedNavigationHref(profile.username ? `/creators/${encodeURIComponent(profile.username)}` : '/creator?tab=profile', locale)} className="mt-1 block border-t border-border px-3 py-3 text-sm text-[#006b4f] hover:bg-muted">
    {studioCopy(locale, profile.username ? 'profile' : 'edit')} ↗
  </Link>
}
