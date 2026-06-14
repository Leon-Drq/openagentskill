import Link from 'next/link'
import type { SkillAttribution } from '@/lib/skill-attribution'

interface SkillAttributionPanelProps {
  attribution: SkillAttribution
}

function ExternalTextLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return <span className="font-mono text-xs text-secondary">Unknown</span>

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all font-mono text-xs text-foreground underline underline-offset-2 hover:text-secondary [overflow-wrap:anywhere]"
    >
      {children}
    </a>
  )
}

export function SkillAttributionPanel({ attribution }: SkillAttributionPanelProps) {
  const isVerified = attribution.status === 'verified_maintainer'

  return (
    <section className="border border-border p-5" aria-labelledby="skill-attribution-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-2 text-xs uppercase text-secondary">Listing source</p>
          <h3 id="skill-attribution-title" className="font-display text-lg font-semibold">
            {attribution.statusLabel}
          </h3>
        </div>
        <span
          className={`border px-2 py-1 font-mono text-[10px] uppercase ${
            isVerified ? 'border-foreground text-foreground' : 'border-border text-secondary'
          }`}
        >
          {isVerified ? 'Verified' : 'Claimable'}
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-secondary">
        {attribution.trustNote}
      </p>

      <dl className="mt-5 space-y-3">
        <div>
          <dt className="text-xs uppercase text-secondary">Creator</dt>
          <dd className="mt-1">
            <ExternalTextLink href={attribution.creatorUrl}>{attribution.creatorName}</ExternalTextLink>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-secondary">Source</dt>
          <dd className="mt-1">
            <ExternalTextLink href={attribution.sourceUrl}>{attribution.sourceDetail}</ExternalTextLink>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-secondary">Indexed by</dt>
          <dd className="mt-1 font-mono text-xs text-foreground">{attribution.indexedBy}</dd>
        </div>
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-secondary">
        {attribution.publicNote}
      </p>

      <Link
        href="#claim-this-skill"
        className="mt-4 block w-full border border-border px-3 py-2 text-center text-sm transition-colors hover:border-foreground"
      >
        {attribution.claimCta}
      </Link>
    </section>
  )
}
