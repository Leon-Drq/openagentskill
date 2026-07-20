export default function Loading() {
  return (
    <main className="relative min-h-[48vh] overflow-hidden border-b border-border bg-background" aria-busy="true" aria-live="polite">
      <div className="brand-grain pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-7xl px-6 py-16 sm:px-8 sm:py-24">
        <div className="h-3 w-32 animate-pulse bg-muted" />
        <div className="mt-8 h-12 max-w-2xl animate-pulse bg-muted/80 sm:h-16" />
        <div className="mt-4 h-12 max-w-xl animate-pulse bg-muted/60 sm:h-16" />
        <div className="mt-10 h-5 max-w-lg animate-pulse bg-muted/60" />
        <div className="mt-3 h-5 max-w-md animate-pulse bg-muted/45" />
      </div>
    </main>
  )
}
