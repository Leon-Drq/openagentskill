'use client'

import { useEffect, useState } from 'react'
import { Bookmark } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { createClient } from '@/lib/supabase/client'
import { trackSkillEvent } from '@/components/skill-event-tracker'
import { useI18n } from '@/lib/i18n/context'
import { formatSkillDetailCopy } from '@/lib/i18n/skill-detail-copy'
import { withTimeout } from '@/lib/async'
import { cn } from '@/lib/utils'

interface SaveSkillButtonProps {
  skillSlug: string
  compact?: boolean
  className?: string
}

export function SaveSkillButton({ skillSlug, compact, className }: SaveSkillButtonProps) {
  const { locale } = useI18n()
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasUser, setHasUser] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    async function loadBookmark() {
      const supabase = createClient()
      const { data: { user }, error: authError } = await withTimeout(supabase.auth.getUser(), 8000, 'bookmark account')
      if (authError && authError.name !== 'AuthSessionMissingError' && authError.status !== 401) throw authError
      if (!active) return
      if (!user) { setHasUser(false); return }

      const { data, error } = await supabase
        .from('bookmarks')
        .select('skill_slug')
        .eq('user_id', user.id)
        .eq('skill_slug', skillSlug)
        .abortSignal(AbortSignal.timeout(8000))
        .maybeSingle()

      if (error) throw error
      if (active) { setSaved(Boolean(data)); setHasUser(true) }
    }

    loadBookmark().catch(() => { if (active) setFailed(true) })
    return () => {
      active = false
    }
  }, [skillSlug])

  async function toggleSave() {
    if (loading) return
    if (hasUser === false) {
      router.push(`/auth/login?next=${encodeURIComponent(getLocalizedNavigationHref(`/skills/${skillSlug}`, locale))}`)
      return
    }

    setLoading(true)
    setFailed(false)
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await withTimeout(supabase.auth.getUser(), 8000, 'bookmark account')
      if (authError && authError.name !== 'AuthSessionMissingError' && authError.status !== 401) throw authError
      if (!user) {
        router.push(`/auth/login?next=${encodeURIComponent(getLocalizedNavigationHref(`/skills/${skillSlug}`, locale))}`)
        return
      }
      const write = saved
        ? supabase.from('bookmarks').delete().eq('user_id', user.id).eq('skill_slug', skillSlug).abortSignal(AbortSignal.timeout(8000))
        : supabase.from('bookmarks').upsert({ user_id: user.id, skill_slug: skillSlug }, { onConflict: 'user_id,skill_slug', ignoreDuplicates: true }).abortSignal(AbortSignal.timeout(8000))
      // Explicit retries keep the same intent: insert-if-absent and delete are idempotent.
      const { error } = await withTimeout(Promise.resolve(write), 8000, 'bookmark update')
      if (error) throw error
      setHasUser(true)
      setSaved(!saved)
      if (!saved) trackSkillEvent(skillSlug, 'save')
    } catch { setFailed(true) }
    finally { setLoading(false) }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggleSave}
        disabled={loading || (hasUser === null && !failed)}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 border border-border text-secondary transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50',
          compact ? 'px-2.5 py-1 text-xs' : 'w-full px-4 py-2.5 text-sm',
          saved && 'border-foreground text-foreground',
          className
        )}
        aria-pressed={saved}
      >
        <Bookmark className={cn('h-3.5 w-3.5', saved && 'fill-current')} aria-hidden="true" />
        {saved ? formatSkillDetailCopy(locale, 'saved') : formatSkillDetailCopy(locale, 'save')}
      </button>
      {failed && <p role="status" className="text-xs text-secondary">{formatSkillDetailCopy(locale, 'saveError')}</p>}
    </>
  )
}
