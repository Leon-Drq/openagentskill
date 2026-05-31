'use client'

import { useEffect, useState } from 'react'
import { Bookmark } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { trackSkillEvent } from '@/components/skill-event-tracker'
import { cn } from '@/lib/utils'

interface SaveSkillButtonProps {
  skillSlug: string
  compact?: boolean
  className?: string
}

export function SaveSkillButton({ skillSlug, compact, className }: SaveSkillButtonProps) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasUser, setHasUser] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    async function loadBookmark() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return
      setHasUser(Boolean(user))
      if (!user) return

      const { data } = await supabase
        .from('bookmarks')
        .select('skill_slug')
        .eq('user_id', user.id)
        .eq('skill_slug', skillSlug)
        .maybeSingle()

      if (active) setSaved(Boolean(data))
    }

    loadBookmark()
    return () => {
      active = false
    }
  }, [skillSlug])

  async function toggleSave() {
    if (loading) return
    if (!hasUser) {
      window.location.href = `/auth/login?next=${encodeURIComponent(`/skills/${skillSlug}`)}`
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      window.location.href = `/auth/login?next=${encodeURIComponent(`/skills/${skillSlug}`)}`
      return
    }

    if (saved) {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('skill_slug', skillSlug)
      if (!error) setSaved(false)
    } else {
      const { error } = await supabase
        .from('bookmarks')
        .insert({ user_id: user.id, skill_slug: skillSlug })
      if (!error) {
        setSaved(true)
        trackSkillEvent(skillSlug, 'save')
      }
    }
    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={toggleSave}
      disabled={loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 border border-border text-secondary transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50',
        compact ? 'px-2.5 py-1 text-xs' : 'w-full px-4 py-2.5 text-sm',
        saved && 'border-foreground text-foreground',
        className
      )}
      aria-pressed={saved}
    >
      <Bookmark className={cn('h-3.5 w-3.5', saved && 'fill-current')} aria-hidden="true" />
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}
