import { SiteHeader } from '@/components/site-header'

function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[6px] bg-muted ${className}`} />
}

export default function RouteLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div
        className="fixed inset-x-0 top-16 z-40 h-0.5 overflow-hidden bg-border"
        role="progressbar"
        aria-label="Loading page"
      >
        <div className="h-full w-2/3 animate-pulse bg-[#006b4f]" />
      </div>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14" aria-busy="true">
        <span className="sr-only" role="status" aria-live="polite">
          Loading the next page
        </span>
        <div className="max-w-3xl space-y-5">
          <SkeletonLine className="h-3 w-36" />
          <SkeletonLine className="h-12 w-full sm:h-16" />
          <SkeletonLine className="h-5 w-5/6" />
          <SkeletonLine className="h-5 w-2/3" />
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="min-h-48 rounded-[8px] border border-border bg-card p-5">
              <SkeletonLine className="h-3 w-24" />
              <SkeletonLine className="mt-5 h-7 w-4/5" />
              <SkeletonLine className="mt-4 h-4 w-full" />
              <SkeletonLine className="mt-2 h-4 w-5/6" />
              <SkeletonLine className="mt-8 h-9 w-32" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
