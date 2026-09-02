'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GitHubAuthButton } from '@/components/github-auth-button'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedNext = searchParams.get('next')
  const nextPath = requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/profile'
  const claimIntent = searchParams.get('intent') === 'claim'
  const creatorIntent = nextPath === '/creator' || searchParams.get('intent') === 'creator' || claimIntent
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(nextPath)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center font-display text-lg font-bold tracking-tight mb-8 hover:opacity-70 transition-opacity">
          OpenAgentSkill
        </Link>

        <h1 className="font-display text-2xl font-bold mb-1">
          {claimIntent ? 'Verify Skill ownership' : creatorIntent ? 'Sign in to Creator Center' : 'Sign in'}
        </h1>
        <p className="mb-3 text-sm leading-relaxed text-secondary">
          {claimIntent
            ? 'Continue with GitHub to verify a matching repository instantly, or use email for repository-file verification.'
            : creatorIntent
            ? 'Claim your skills, manage your public creator profile, and view install analytics.'
            : 'Access your OpenAgentSkill account.'}
        </p>
        <p className="text-sm text-secondary mb-6">
          No account?{' '}
          <Link href={`/auth/sign-up?next=${encodeURIComponent(nextPath)}`} className="underline hover:opacity-70 transition-opacity">
            Create one
          </Link>
        </p>

        <GitHubAuthButton fallbackNext={nextPath} label={claimIntent ? 'Verify with GitHub' : 'Continue with GitHub'} />

        <form onSubmit={handleLogin} className="space-y-4">
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
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-border bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:border-foreground transition-colors"
              placeholder="••••••••"
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
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
