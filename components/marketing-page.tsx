import type { ReactNode } from 'react'
import Link, { type LinkProps } from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

interface MarketingPageShellProps {
  children: ReactNode
}

interface MarketingHeroProps {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  aside?: ReactNode
  className?: string
}

interface MarketingMetric {
  value: ReactNode
  label: ReactNode
}

interface MarketingMetricStripProps {
  items: MarketingMetric[]
  columns?: string
  className?: string
}

interface MarketingFeature {
  label: string
  title: string
  copy: string
}

interface MarketingFeatureGridProps {
  items: MarketingFeature[]
  columns?: string
  className?: string
}

interface MarketingButtonLinkProps extends LinkProps {
  children: ReactNode
  className?: string
  variant?: 'primary' | 'secondary' | 'text'
  target?: string
  rel?: string
}

export function MarketingPageShell({ children }: MarketingPageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}

export function MarketingHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className = '',
}: MarketingHeroProps) {
  const layoutClass = aside ? 'grid gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-end' : ''

  return (
    <section className={`relative overflow-hidden border-b border-border ${className}`}>
      <div className="brand-grain pointer-events-none absolute inset-0 opacity-65" />
      <div className={`relative mx-auto max-w-6xl px-6 py-12 sm:py-16 lg:py-20 ${layoutClass}`}>
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-secondary">{eyebrow}</p>
          <h1 className="mt-5 max-w-4xl font-display text-4xl font-normal leading-[0.98] text-balance sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {description ? (
            <div className="mt-6 max-w-2xl text-base leading-7 text-secondary sm:text-lg">{description}</div>
          ) : null}
          {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
        {aside ? <div className="min-w-0">{aside}</div> : null}
      </div>
    </section>
  )
}

export function MarketingMetricStrip({
  items,
  columns = 'grid-cols-2 sm:grid-cols-4',
  className = '',
}: MarketingMetricStripProps) {
  return (
    <div className={`grid gap-px overflow-hidden rounded-[8px] border border-border bg-border text-center ${columns} ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="bg-background p-4">
          <div className="font-mono text-2xl leading-none text-foreground">{item.value}</div>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

export function MarketingFeatureGrid({
  items,
  columns = 'md:grid-cols-3',
  className = '',
}: MarketingFeatureGridProps) {
  return (
    <div className={`grid gap-px overflow-hidden rounded-[8px] border border-border bg-border ${columns} ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="bg-background p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-secondary">{item.label}</p>
          <h2 className="mt-3 font-display text-xl font-normal leading-snug">{item.title}</h2>
          <p className="mt-3 text-sm leading-6 text-secondary">{item.copy}</p>
        </div>
      ))}
    </div>
  )
}

export function MarketingButtonLink({
  children,
  className = '',
  variant = 'secondary',
  ...props
}: MarketingButtonLinkProps) {
  const variantClass =
    variant === 'primary'
      ? 'border-[#006b4f] bg-[#006b4f] text-white hover:opacity-90'
      : variant === 'text'
        ? 'border-transparent text-secondary hover:text-foreground'
        : 'border-border bg-background text-secondary hover:border-foreground hover:text-foreground'

  return (
    <Link
      className={`inline-flex min-h-11 items-center justify-center rounded-[8px] border px-5 py-2 text-sm font-semibold transition ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </Link>
  )
}
