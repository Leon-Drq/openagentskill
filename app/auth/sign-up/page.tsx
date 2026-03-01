'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  )
}

function SignUpForm() {
  const router = useRouter()

  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref')
  const inviterName = searchParams.get('inviter')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: { display_name: displayName, invite_code_used: refCode || null },
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/auth/sign-up-success')
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center font-display text-lg font-bold tracking-tight mb-8 hover:opacity-70 transition-opacity">
          OPEN AGENT SKILL
        </Link>

        {inviterName && (
          <div className="border border-border px-4 py-3 mb-6 text-sm text-secondary">
            Invited by <strong className="text-foreground">{inviterName}</strong> — you'll both earn bonus points.
          </div>
        )}
        <h1 className="font-display text-2xl font-bold mb-1">Create an account</h1>
        <p className="text-sm text-secondary mb-6">
          Already have one?{' '}
          <Link href="/auth/login" className="underline hover:opacity-70 transition-opacity">
            Sign in
          </Link>
        </p>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest text-secondary mb-1.5">Display Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full border border-border bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:border-foreground transition-colors"
              placeholder="Ada Lovelace"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-secondary mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-border bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:border-foreground transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-secondary mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-border bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:border-foreground transition-colors"
              placeholder="min. 8 characters"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 font-mono">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-foreground text-background text-sm py-2.5 font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-xs text-secondary mt-6 leading-relaxed">
          By creating an account you agree to our terms of service. Earn points by publishing skills, submitting reviews, and inviting others.
        </p>
      </div>
    </div>
  )
}
