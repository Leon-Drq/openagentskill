import { redirect } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/public'

export default async function RefPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  // Verify invite code exists
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('invite_code', code)
    .single()

  if (!data) redirect('/auth/sign-up')

  // Redirect to sign-up with invite code in query param (stored in cookie by sign-up form)
  redirect(`/auth/sign-up?ref=${code}&inviter=${encodeURIComponent(data.display_name || 'a member')}`)
}
