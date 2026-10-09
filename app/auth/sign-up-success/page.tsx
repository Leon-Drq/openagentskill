import Link from '@/components/crawl-link'
import { safeAccountNext } from '@/lib/account-workspace'
import { getLocaleFromSearchParam } from '@/lib/i18n/config'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'

export default async function SignUpSuccessPage({ searchParams }: { searchParams: Promise<{ next?: string; lang?: string }> }) {
  const params = await searchParams
  const locale = getLocaleFromSearchParam(params.lang) || 'en'
  const next = safeAccountNext(params.next)
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <Link href="/" className="font-display text-lg font-bold tracking-tight mb-12 hover:opacity-70 transition-opacity block">
        OpenAgentSkill
      </Link>
      <h1 className="font-display text-3xl font-bold mb-3">Check your inbox</h1>
      <p className="text-secondary max-w-xs leading-relaxed mb-8">
        We sent a confirmation link to your email. Click it to activate your account and continue to your workspace.
      </p>
      <Link href={getLocalizedNavigationHref(`/auth/login?next=${encodeURIComponent(next)}`, locale)} className="text-sm underline hover:opacity-70 transition-opacity">
        Continue to sign in
      </Link>
    </div>
  )
}
