import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Page not found | OpenAgentSkill',
  description: 'This route is not part of the OpenAgentSkill registry.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotFound() {
  return (
    <main className="relative min-h-[68vh] overflow-hidden border-b border-border bg-background">
      <div className="brand-grain pointer-events-none absolute inset-0 opacity-45" />
      <section className="relative mx-auto flex max-w-4xl flex-col px-6 py-20 sm:px-8 sm:py-28">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">404 · Registry route not found</p>
        <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-[0.98] text-foreground sm:text-6xl">
          This page is not part of the skill registry.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          It may have moved, been retired, or never existed. Browse verified skills or describe a task to get a safer recommendation.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/skills"
            className="inline-flex min-h-11 items-center justify-center bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Browse skills
          </Link>
          <Link
            href="/resolve"
            className="inline-flex min-h-11 items-center justify-center border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Resolve a task
          </Link>
        </div>
      </section>
    </main>
  )
}
