'use client'

import { galleryCopy } from '@/lib/i18n/gallery-copy'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ThumbsDown, ThumbsUp, Share2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/context'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { copyText } from '@/lib/copy-text'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { getShowcaseShareUrl, type ShowcaseStats, type ShowcaseVote } from '@/lib/showcase-engagement'
import { localizeShowcase, type ShowcaseCase } from '@/lib/showcase-shared'

const EngagementContext = createContext<{
  stats: ShowcaseStats; ready: boolean; failed: boolean; refresh: () => Promise<void>
  toggle: (slug: string, direction: 1 | -1) => Promise<void>
} | null>(null)

export function ShowcaseEngagementProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n()
  const router = useRouter()
  const [stats, setStats] = useState<ShowcaseStats>({})
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const signedIn = useRef(false)
  const revision = useRef(0)
  const pending = useRef(new Set<string>())
  const refresh = useCallback(async () => {
    const current = ++revision.current
    try {
      const response = await fetch('/api/showcase/engagement', { cache: 'no-store', signal: AbortSignal.timeout(12000) })
      if (!response.ok) throw new Error('Unavailable')
      const data = await response.json()
      if (current !== revision.current) return
      signedIn.current = data.signedIn
      setStats(data.stats)
      setReady(true)
      setFailed(false)
    } catch {
      if (current === revision.current) { setFailed(true); setReady(false) }
    }
  }, [])
  useEffect(() => {
    const requestRevision = revision
    const timer = window.setTimeout(() => void refresh(), 0)
    const onFocus = () => { if (!pending.current.size) void refresh() }
    window.addEventListener('focus', onFocus)
    return () => { window.clearTimeout(timer); requestRevision.current++; window.removeEventListener('focus', onFocus) }
  }, [refresh])

  function signIn() {
    const next = window.location.pathname + window.location.search
    router.push(getLocalizedNavigationHref(`/auth/login?next=${encodeURIComponent(next)}&intent=gallery-vote`, locale))
  }

  async function toggle(slug: string, direction: 1 | -1) {
    if (!ready || pending.current.has(slug)) return
    if (!signedIn.current) { signIn(); return }
    pending.current.add(slug)
    revision.current++ // Do not let an earlier stats read undo this mutation.
    try {
      const vote: ShowcaseVote = stats[slug]?.vote === direction ? null : direction
      const response = await fetch('/api/showcase/engagement', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, vote }), signal: AbortSignal.timeout(12000),
      })
      if (response.status === 401) { signIn(); return }
      if (!response.ok) throw new Error('Unavailable')
      const data = await response.json()
      setStats((previous) => ({ ...previous, [slug]: { likes: data.likes, dislikes: data.dislikes, vote: data.vote } }))
      trackAnalyticsEvent('showcase_vote', { case_slug: slug, vote: data.vote ?? 0 })
    } catch (error) {
      // A timed-out request may have committed; reconcile before allowing another toggle.
      await refresh()
      throw error
    } finally { pending.current.delete(slug) }
  }

  return <EngagementContext.Provider value={{ stats, ready, failed, refresh, toggle }}>{children}</EngagementContext.Provider>
}

export function useShowcaseEngagement() {
  const value = useContext(EngagementContext)
  if (!value) throw new Error('Showcase engagement requires its provider')
  return value
}

export function ShowcaseActions({ item }: { item: Pick<ShowcaseCase, 'slug' | 'title'> }) {
  const { locale } = useI18n()
  const { stats, ready, failed, refresh, toggle } = useShowcaseEngagement()
  const [busy, setBusy] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareMenu, setShareMenu] = useState(false)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [manualUrl, setManualUrl] = useState('')
  const stat = stats[item.slug]
  const title = localizeShowcase(item.title, locale)
  const baseClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-3 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006b4f] disabled:opacity-50'

  async function vote(direction: 1 | -1) {
    if (busy) return
    setBusy(true)
    setMessage('')
    try { await toggle(item.slug, direction) }
    catch { setMessage(galleryCopy(locale, "Voting is unavailable. Please retry.", "投票暂时不可用，请重试。")) }
    finally { setBusy(false) }
  }

  async function share(method: 'copy' | 'native') {
    if (sharing) return
    setSharing(true)
    setMessage('')
    setCopied(false)
    setManualUrl('')
    setShareMenu(false)
    const url = getShowcaseShareUrl(item.slug, locale)
    try {
      if (method === 'native' && navigator.share) {
        try {
          await navigator.share({ title: `${title} · Skill Gallery`, url })
          trackAnalyticsEvent('showcase_share_complete', { case_slug: item.slug, method: 'native' })
          setMessage(galleryCopy(locale, "Shared through your device.", "已交给系统分享。"))
          return
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return
          // Unsupported/blocked system sharing can still fall back to a copyable link.
        }
      }
      if (!await copyText(url)) throw new Error('Clipboard unavailable')
      setCopied(true)
      setMessage(galleryCopy(locale, "Link copied. Paste it to share.", "链接已复制，可以粘贴分享。"))
      trackAnalyticsEvent('showcase_share_copy', { case_slug: item.slug })
    } catch {
      setManualUrl(url)
      setMessage(galleryCopy(locale, "Copy the link below to share.", "请手动复制下方链接。"))
    } finally { setSharing(false) }
  }

  return <div className="mt-3">
    <div className="flex flex-wrap items-center gap-2">
      {([1, -1] as const).map((direction) => {
        const selected = stat?.vote === direction
        const Icon = direction === 1 ? ThumbsUp : ThumbsDown
        const label = direction === 1 ? (galleryCopy(locale, "Like", "赞")) : (galleryCopy(locale, "Dislike", "踩"))
        const action = direction === 1 ? (galleryCopy(locale, "Like", "点赞")) : (galleryCopy(locale, "Dislike", "点踩"))
        const count = direction === 1 ? stat?.likes : stat?.dislikes
        return <button key={direction} type="button" disabled={busy || !ready} aria-pressed={selected}
          aria-label={`${selected ? galleryCopy(locale, 'Remove {action}', '取消{action}', { action: label }) : action} · ${title}`}
          onClick={() => void vote(direction)}
          className={`${baseClass} ${selected ? 'border-[#006b4f]/30 bg-[#006b4f]/5 text-[#006b4f]' : 'border-[#e4e0d8] text-[#6d675e] hover:border-[#006b4f] hover:text-[#006b4f]'}`}>
          <Icon className={`h-4 w-4 ${selected ? 'fill-current' : ''}`} aria-hidden="true" />
          <span>{label}</span><span className="font-mono tabular-nums">{ready ? (count ?? 0).toLocaleString(locale) : '—'}</span>
        </button>
      })}
      <button type="button" onClick={() => { setShareMenu(!shareMenu); if (!shareMenu) trackAnalyticsEvent('showcase_share_open', { case_slug: item.slug }) }} disabled={sharing} aria-expanded={shareMenu} aria-label={`${galleryCopy(locale, "Share", "分享")} · ${title}`} className={`${baseClass} border-[#e4e0d8] text-[#6d675e] hover:border-[#006b4f] hover:text-[#006b4f]`}>
        {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}{copied ? (galleryCopy(locale, "Copied", "已复制")) : (galleryCopy(locale, "Share", "分享"))}
      </button>
    </div>
    {shareMenu && <div role="group" aria-label={galleryCopy(locale, "Share options", "分享选项")} className="mt-2 flex flex-wrap gap-2 rounded-md border border-[#e4e0d8] p-2" onKeyDown={(event) => { if (event.key === 'Escape') setShareMenu(false) }}>
      <button type="button" onClick={() => void share('copy')} className="min-h-11 rounded px-3 text-xs text-[#006b4f] hover:bg-[#006b4f]/5">{galleryCopy(locale, "Copy link", "复制链接")}</button>
      {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && <button type="button" onClick={() => void share('native')} className="min-h-11 rounded px-3 text-xs text-[#006b4f] hover:bg-[#006b4f]/5">{galleryCopy(locale, "More sharing options", "更多分享方式")}</button>}
    </div>}
    {failed && <button type="button" onClick={() => void refresh()} className="min-h-11 text-xs text-[#006b4f] underline">{galleryCopy(locale, "Voting unavailable. Retry", "投票暂不可用，点击重试")}</button>}
    <p role="status" className="mt-1 text-xs text-[#6d675e]">{message}</p>
    {manualUrl && <input readOnly value={manualUrl} aria-label={galleryCopy(locale, "Share link", "分享链接")} onFocus={(event) => event.currentTarget.select()} className="mt-2 min-h-11 w-full min-w-0 rounded border border-[#e4e0d8] bg-transparent px-2 text-base" />}
  </div>
}
