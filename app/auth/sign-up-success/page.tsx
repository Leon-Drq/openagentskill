import Link from 'next/link'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <Link href="/" className="font-display text-lg font-bold tracking-tight mb-12 hover:opacity-70 transition-opacity block">
        OPEN AGENT SKILL
      </Link>
      <h1 className="font-display text-3xl font-bold mb-3">Check your inbox</h1>
      <p className="text-secondary max-w-xs leading-relaxed mb-8">
        We sent a confirmation link to your email. Click it to activate your account and start earning points.
      </p>
      <Link href="/" className="text-sm underline hover:opacity-70 transition-opacity">
        Back to home
      </Link>
    </div>
  )
}
