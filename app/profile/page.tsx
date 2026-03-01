import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileClient } from '@/components/profile-client'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: pointEvents }, { data: bookmarks }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('point_events').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('bookmarks').select('skill_slug').eq('user_id', user.id),
  ])

  const totalPoints = (pointEvents || []).reduce((sum, e) => sum + e.amount, 0)

  return (
    <ProfileClient
      user={user}
      profile={profile}
      totalPoints={totalPoints}
      pointEvents={pointEvents || []}
      bookmarkSlugs={(bookmarks || []).map(b => b.skill_slug)}
    />
  )
}
