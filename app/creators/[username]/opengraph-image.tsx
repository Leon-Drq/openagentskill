import { ImageResponse } from 'next/og'
import { createPublicClient } from '@/lib/supabase/public'

// Next 16.3 deprecates Edge Runtime; match the site's existing social cards.
export const runtime = 'nodejs'
export const alt = 'OpenAgentSkill creator profile'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function CreatorImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const { data: profile, error } = await createPublicClient({ requestTimeoutMs: 5000 })
    .from('profiles').select('username,display_name,bio').eq('username', username.toLowerCase()).maybeSingle()
  if (error) return new Response('Temporarily unavailable', { status: 503 })
  if (!profile) return new Response('Not found', { status: 404 })
  const name = (profile.display_name || profile.username).slice(0, 60)
  return new ImageResponse(<div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%', padding: 64, background: '#F8F7F3', color: '#171717', borderTop: '12px solid #006b4f' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24 }}><span>OpenAgentSkill</span><span style={{ color: '#006b4f' }}>Skill Creators</span></div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ fontSize: name.length > 30 ? 56 : 76, lineHeight: 1.1, letterSpacing: '-2px' }}>{name}</div>
      <div style={{ fontSize: 26, lineHeight: 1.5, color: '#626262' }}>{(profile.bio || 'Skills, work, and the person behind them.').slice(0, 160)}</div>
    </div>
    <div style={{ display: 'flex', borderTop: '1px solid #DDDBD4', paddingTop: 24, fontSize: 22 }}>openagentskill.com/creators/{profile.username}</div>
  </div>, size)
}
