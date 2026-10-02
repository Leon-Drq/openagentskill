'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Bookmark, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'
import { galleryCopy } from '@/lib/i18n/gallery-copy'
import { formatSkillDetailCopy } from '@/lib/i18n/skill-detail-copy'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { trackSkillEvent } from '@/components/skill-event-tracker'
import type { SkillEngagementMap } from '@/lib/skill-engagement'

const EngagementContext = createContext<{
  stats: SkillEngagementMap; ready: boolean; failed: boolean
  refresh: () => Promise<void>
  change: (slug: string, intent: { vote: 1 | -1 | null } | { saved: boolean }) => Promise<void>
} | null>(null)

// One batch per visible page. Never mount an auth/bookmark query for every card.
export function SkillEngagementProvider({ slugs, children }: { slugs: string[]; children: ReactNode }) {
  const key = [...new Set(slugs)].sort().join(',')
  const { locale } = useI18n()
  const router = useRouter()
  const [stats, setStats] = useState<SkillEngagementMap>({})
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const signedIn = useRef(false)
  const revision = useRef(0)
  const pending = useRef(new Set<string>())
  const refresh = useCallback(async () => {
    const current = ++revision.current
    try {
      const response = await fetch(`/api/skills/engagement?slugs=${encodeURIComponent(key)}`, { cache: 'no-store', signal: AbortSignal.timeout(12000) })
      if (!response.ok) throw Error('Unavailable')
      const data = await response.json()
      if (current !== revision.current) return
      signedIn.current = data.signedIn
      setStats(data.stats)
      setReady(true)
      setFailed(false)
    } catch { if (current === revision.current) { setReady(false); setFailed(true) } }
  }, [key])
  useEffect(() => {
    const requestRevision = revision
    const timer = window.setTimeout(() => void refresh(), 0)
    const focus = () => { if (!pending.current.size) void refresh() }
    window.addEventListener('focus', focus)
    return () => { window.clearTimeout(timer); requestRevision.current++; window.removeEventListener('focus', focus) }
  }, [refresh])

  async function change(slug: string, intent: { vote: 1 | -1 | null } | { saved: boolean }) {
    if (!ready || pending.current.has(slug)) return
    const signIn = () => router.push(getLocalizedNavigationHref(`/auth/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`, locale))
    if (!signedIn.current) { signIn(); return }
    pending.current.add(slug)
    revision.current++
    try {
      const response = await fetch('/api/skills/engagement', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, ...intent }), signal: AbortSignal.timeout(12000) })
      if (response.status === 401) { signIn(); return }
      if (!response.ok) throw Error('Unavailable')
      const data = await response.json()
      setStats(previous => ({ ...previous, [slug]: { ...previous[slug], ...('vote' in intent ? { vote: data.vote, likes: data.likes, dislikes: data.dislikes } : { saved: data.saved }) } }))
      if ('saved' in intent && intent.saved) trackSkillEvent(slug, 'save')
    } catch (error) { await refresh(); throw error }
    finally { pending.current.delete(slug) }
  }
  return <EngagementContext.Provider value={{ stats, ready, failed, refresh, change }}>{children}</EngagementContext.Provider>
}

export function SkillActions({ slug, name, compact = false }: { slug: string; name: string; compact?: boolean }) {
  const context = useContext(EngagementContext)
  if (!context) throw Error('Skill actions require a shared provider')
  const { stats, ready, failed, refresh, change } = context
  const { locale } = useI18n()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const stat = stats[slug]
  const button = `inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-secondary transition-colors hover:border-[#006b4f] hover:text-[#006b4f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006b4f] disabled:opacity-50 ${compact ? 'bg-background/95 shadow-sm' : ''}`
  async function act(intent: { vote: 1 | -1 | null } | { saved: boolean }) {
    if (busy) return
    setBusy(true); setMessage('')
    try { await change(slug, intent) }
    catch { setMessage('saved' in intent ? formatSkillDetailCopy(locale, 'saveError') : galleryCopy(locale, 'Voting is unavailable. Please retry.', '投票暂时不可用，请重试。')) }
    finally { setBusy(false) }
  }
  return <div data-skill-actions={slug} className="min-w-0">
    <div className="flex flex-wrap gap-2">
      {([1, -1] as const).map(direction => {
        const selected = stat?.vote === direction
        const Icon = direction === 1 ? ThumbsUp : ThumbsDown
        const label = direction === 1 ? galleryCopy(locale, 'Like', '点赞') : galleryCopy(locale, 'Dislike', '点踩')
        return <button key={direction} type="button" disabled={busy || !ready || !stat} aria-pressed={selected}
          aria-label={`${selected ? galleryCopy(locale, 'Remove {action}', '取消{action}', { action: label }) : label} · ${name}`}
          title={selected ? galleryCopy(locale, 'Remove {action}', '取消{action}', { action: label }) : label}
          onClick={() => void act({ vote: selected ? null : direction })} className={`${button} ${selected ? 'border-[#006b4f]/50 bg-[#006b4f]/5 text-[#006b4f]' : ''}`}>
          <Icon className={`h-3.5 w-3.5 ${selected ? 'fill-current' : ''}`} aria-hidden="true" />
          <span className={compact ? 'sr-only' : undefined}>{label}</span><span className="font-mono tabular-nums">{ready && stat ? (direction === 1 ? stat.likes : stat.dislikes).toLocaleString(locale) : '—'}</span>
        </button>
      })}
      <button type="button" disabled={busy || !ready || !stat} aria-pressed={stat?.saved ?? false}
        aria-label={`${formatSkillDetailCopy(locale, stat?.saved ? 'saved' : 'save')} · ${name}`}
        title={formatSkillDetailCopy(locale, stat?.saved ? 'saved' : 'save')}
        onClick={() => void act({ saved: !stat?.saved })} className={`${button} ${stat?.saved ? 'border-[#006b4f]/50 bg-[#006b4f]/5 text-[#006b4f]' : ''}`}>
        <Bookmark className={`h-3.5 w-3.5 ${stat?.saved ? 'fill-current' : ''}`} aria-hidden="true" /><span className={compact ? 'sr-only' : undefined}>{formatSkillDetailCopy(locale, stat?.saved ? 'saved' : 'save')}</span>
      </button>
      {failed && compact && <button type="button" onClick={() => void refresh()} className={button}
        title={galleryCopy(locale, 'Voting unavailable. Retry', '互动暂不可用，点击重试')}
        aria-label={galleryCopy(locale, 'Voting unavailable. Retry', '互动暂不可用，点击重试')}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /></button>}
    </div>
    {failed && !compact && <button type="button" onClick={() => void refresh()} className="mt-1 min-h-11 rounded-md bg-background/95 px-2 text-xs text-[#006b4f] underline">{galleryCopy(locale, 'Voting unavailable. Retry', '互动暂不可用，点击重试')}</button>}
    {message && <p role="status" className="mt-2 max-w-64 rounded-md bg-background/95 p-2 text-xs text-secondary">{message}</p>}
  </div>
}
