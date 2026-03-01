'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface PointEvent {
  id: string
  amount: number
  event_type: string
  description: string
  created_at: string
}

interface Profile {
  id: string
  username: string | null
  display_name: string | null
  bio: string | null
  invite_code: string | null
  twitter: string | null
  website: string | null
}

interface Props {
  user: User
  profile: Profile | null
  totalPoints: number
  pointEvents: PointEvent[]
  bookmarkSlugs: string[]
}

function getLevelInfo(points: number) {
  if (points >= 100000) return { level: 6, title: 'Legend',    next: null,   progress: 100 }
  if (points >= 25000)  return { level: 5, title: 'Sage',      next: 100000, progress: Math.round((points - 25000) / (100000 - 25000) * 100) }
  if (points >= 8000)   return { level: 4, title: 'Architect', next: 25000,  progress: Math.round((points - 8000) / (25000 - 8000) * 100) }
  if (points >= 2000)   return { level: 3, title: 'Artisan',   next: 8000,   progress: Math.round((points - 2000) / (8000 - 2000) * 100) }
  if (points >= 500)    return { level: 2, title: 'Builder',   next: 2000,   progress: Math.round((points - 500) / (2000 - 500) * 100) }
  return                       { level: 1, title: 'Explorer',  next: 500,    progress: Math.round(points / 500 * 100) }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ProfileClient({ user, profile, totalPoints, pointEvents, bookmarkSlugs }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'points' | 'bookmarks' | 'invite'>('points')
  const levelInfo = getLevelInfo(totalPoints)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User'
  const inviteLink = profile?.invite_code
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://openagentskill.com'}/ref/${profile.invite_code}`
    : null

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-lg font-bold tracking-tight hover:opacity-70 transition-opacity">
            OPEN AGENT SKILL
          </Link>
          <button onClick={handleSignOut} className="text-sm text-secondary hover:text-foreground transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1">{displayName}</h1>
            <p className="text-sm text-secondary font-mono">{user.email}</p>
            {profile?.bio && <p className="text-sm text-secondary mt-2 max-w-sm">{profile.bio}</p>}
          </div>
          <div className="text-right">
            <div className="font-display text-4xl font-bold">{totalPoints.toLocaleString()}</div>
            <div className="text-xs uppercase tracking-widest text-secondary mt-0.5">points</div>
          </div>
        </div>

        {/* Level bar */}
        <div className="mb-10 p-5 border border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="font-display text-lg font-bold">Level {levelInfo.level}</span>
              <span className="text-secondary text-sm ml-2">— {levelInfo.title}</span>
            </div>
            {levelInfo.next && (
              <span className="text-xs text-secondary font-mono">{totalPoints.toLocaleString()} / {levelInfo.next.toLocaleString()}</span>
            )}
          </div>
          <div className="h-1.5 bg-border">
            <div
              className="h-full bg-foreground transition-all duration-700"
              style={{ width: `${Math.min(levelInfo.progress, 100)}%` }}
            />
          </div>
          {levelInfo.next && (
            <p className="text-xs text-secondary mt-2">{levelInfo.next - totalPoints} points to {['','Explorer','Builder','Artisan','Architect','Sage','Legend'][levelInfo.level + 1] || 'next level'}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-border mb-8">
          {(['points', 'bookmarks', 'invite'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm capitalize tracking-wide transition-colors ${tab === t ? 'border-b-2 border-foreground font-medium text-foreground' : 'text-secondary hover:text-foreground'}`}
            >
              {t === 'points' ? `Points History` : t === 'bookmarks' ? `Bookmarks (${bookmarkSlugs.length})` : 'Invite & Earn'}
            </button>
          ))}
        </div>

        {/* Points History */}
        {tab === 'points' && (
          <div>
            {pointEvents.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-secondary text-sm">No point activity yet.</p>
                <p className="text-secondary text-xs mt-1">Submit a skill or install one to start earning.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pointEvents.map(event => (
                  <div key={event.id} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{event.description}</p>
                      <p className="text-xs text-secondary font-mono mt-0.5">{formatDate(event.created_at)}</p>
                    </div>
                    <span className={`font-mono text-sm font-medium ${event.amount >= 0 ? 'text-foreground' : 'text-secondary'}`}>
                      {event.amount >= 0 ? '+' : ''}{event.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bookmarks */}
        {tab === 'bookmarks' && (
          <div>
            {bookmarkSlugs.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-secondary text-sm">No bookmarks yet.</p>
                <Link href="/skills" className="text-xs underline hover:opacity-70 transition-opacity mt-1 block">Browse skills</Link>
              </div>
            ) : (
              <div className="grid gap-3">
                {bookmarkSlugs.map(slug => (
                  <Link key={slug} href={`/skills/${slug}`} className="border border-border px-5 py-4 hover:border-foreground transition-colors block">
                    <span className="font-mono text-sm">{slug}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invite */}
        {tab === 'invite' && (
          <div>
            <div className="border border-border p-6 mb-6">
              <h3 className="font-display text-lg font-bold mb-1">Refer a friend, earn 200 points</h3>
              <p className="text-sm text-secondary mb-5 leading-relaxed">
                When someone signs up using your link and publishes their first skill, you both earn bonus points.
              </p>
              {inviteLink ? (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-secondary mb-2">Your invite link</label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={inviteLink}
                      className="flex-1 border border-border bg-transparent px-3 py-2 text-sm font-mono focus:outline-none"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(inviteLink)}
                      className="px-4 py-2 border border-border text-sm hover:bg-foreground hover:text-background transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-secondary mt-2 font-mono">Code: {profile?.invite_code}</p>
                </div>
              ) : (
                <p className="text-sm text-secondary font-mono">Invite link will appear after email confirmation.</p>
              )}
            </div>

            <div className="border border-border p-6">
              <h4 className="font-display text-base font-bold mb-4">Point rewards</h4>
              <div className="divide-y divide-border text-sm">
                {[
                  ['Publish a skill', '+500 pts'],
                  ['Your skill gets installed', '+10 pts each'],
                  ['Your skill gets starred', '+5 pts each'],
                  ['Submit a review', '+50 pts'],
                  ['Successful referral', '+200 pts'],
                  ['Daily login', '+5 pts'],
                ].map(([label, pts]) => (
                  <div key={label} className="py-2.5 flex justify-between">
                    <span className="text-secondary">{label}</span>
                    <span className="font-mono font-medium">{pts}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
