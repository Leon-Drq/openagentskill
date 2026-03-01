'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function NavUserMenu() {
  const [user, setUser] = useState<User | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoaded(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!loaded) return null

  if (user) {
    return (
      <Link
        href="/profile"
        className="text-xs sm:text-sm text-secondary hover:text-foreground transition-colors font-mono border border-border px-2.5 py-1 hover:border-foreground"
      >
        {user.email?.split('@')[0]}
      </Link>
    )
  }

  return (
    <Link
      href="/auth/login"
      className="text-xs sm:text-sm text-secondary hover:text-foreground transition-colors"
    >
      Sign in
    </Link>
  )
}
