'use client'

import { accountCopy } from '@/lib/i18n/account-copy'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bookmark, ChevronDown, LogOut, Settings2, Sparkles, UserRound } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { useI18n } from '@/lib/i18n/context'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { getNavigationAccountCopy } from '@/lib/i18n/navigation-account-copy'
import { cn } from '@/lib/utils'
import styles from './site-header.module.css'

export function NavUserMenu({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { t, locale } = useI18n()
  const c = getNavigationAccountCopy(locale)
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | undefined
    void import('@/lib/supabase/client').then(({ createClient }) => {
      if (!active) return
      // INITIAL_SESSION supplies the initial user. This is display state only;
      // protected pages still verify identity server-side. No profile query here.
      const { data: { subscription } } = createClient().auth.onAuthStateChange((_event, session) => {
        if (active) setUser(session?.user ?? null)
      })
      unsubscribe = () => subscription.unsubscribe()
    }).catch(() => { /* Public navigation remains usable if auth is unavailable. */ })
    return () => { active = false; unsubscribe?.() }
  }, [])

  useEffect(() => {
    if (!open || mobile) return
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open, mobile])

  const navigate = () => { setOpen(false); onNavigate?.() }
  const signOut = async () => {
    setSigningOut(true)
    setError(false)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { error: authError } = await createClient().auth.signOut()
      if (authError) throw authError
      setUser(null)
      navigate()
      router.refresh()
    } catch { setError(true) }
    finally { setSigningOut(false) }
  }

  if (!user) {
    const next = encodeURIComponent(getLocalizedNavigationHref('/profile', locale))
    return <div className={cn(styles.authLinks, mobile && styles.mobileAuth)}>
      <Link href={getLocalizedNavigationHref(`/auth/login?next=${next}`, locale)} prefetch={false} onClick={navigate} className={styles.login}>{c.login}</Link>
      <Link href={getLocalizedNavigationHref(`/auth/sign-up?next=${next}`, locale)} prefetch={false} onClick={navigate} className={styles.signup}>{c.signup}</Link>
    </div>
  }

  const accountLinks = <>
    <div className={styles.accountHeading}><span>{c.account}</span><small>{user.email}</small></div>
    <Link href={getLocalizedNavigationHref('/profile', locale)} prefetch={false} onClick={navigate}>
      <UserRound size={17} aria-hidden="true" /><span>{accountCopy(locale, 'workspace')}</span>
    </Link>
    <Link href={getLocalizedNavigationHref('/profile?tab=bookmarks', locale)} prefetch={false} onClick={navigate}><Bookmark size={17} aria-hidden="true" />{c.saved}</Link>
    <Link href={getLocalizedNavigationHref('/profile?tab=settings', locale)} prefetch={false} onClick={navigate}><Settings2 size={17} aria-hidden="true" />{accountCopy(locale, 'settings')}</Link>
    <Link href={getLocalizedNavigationHref('/creator', locale)} prefetch={false} onClick={navigate}><Sparkles size={17} aria-hidden="true" />{t.nav.creatorConsole}</Link>
    <button type="button" onClick={signOut} disabled={signingOut}><LogOut size={17} aria-hidden="true" />{c.signout}</button>
    {error && <p role="alert" className={styles.accountError}>{c.signoutError}</p>}
  </>

  if (mobile) return <div className={styles.mobileAccount}>{accountLinks}</div>

  return <div ref={root} className={styles.account}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}
    onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); trigger.current?.focus() } }}>
    <button ref={trigger} type="button" className={styles.accountTrigger} aria-label={c.account}
      aria-expanded={open} aria-controls="header-account-menu" onClick={() => setOpen(value => !value)}>
      <span className={styles.avatar}>{user.email?.slice(0, 1).toUpperCase() || <UserRound size={17} aria-hidden="true" />}</span>
      <ChevronDown size={14} className={cn(styles.chevron, open && styles.rotated)} aria-hidden="true" />
    </button>
    {open && <div id="header-account-menu" className={styles.accountMenu}>{accountLinks}</div>}
  </div>
}
