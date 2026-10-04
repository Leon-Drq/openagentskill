import { redirect } from 'next/navigation'
import { getLocaleFromSearchParam } from '@/lib/i18n/config'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { createPublicClient } from '@/lib/supabase/public'

export default async function RefPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ lang?: string }> }) {
  const locale = getLocaleFromSearchParam((await searchParams).lang) || 'en'
  const { code } = await params

  // Verify invite code exists
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('invite_code', code)
    .single()

  if (!data) redirect(getLocalizedNavigationHref('/auth/sign-up?next='+encodeURIComponent(getLocalizedNavigationHref('/profile', locale)), locale))

  // Redirect to sign-up with invite code in query param (stored in cookie by sign-up form)
  redirect(getLocalizedNavigationHref(`/auth/sign-up?ref=${encodeURIComponent(code)}&inviter=${encodeURIComponent(data.display_name || 'a member')}&next=${encodeURIComponent(getLocalizedNavigationHref('/profile', locale))}`, locale))
}
