import { SkillDetailLink as Link } from '@/components/skill-detail-link'
import { SkillDetailText } from '@/components/skill-detail-text'
import type { SkillAttribution, SkillAttributionStatus } from '@/lib/skill-attribution'
import type { SkillDetailCopyKey } from '@/lib/i18n/skill-detail-copy'

interface SkillAttributionPanelProps {
  attribution: SkillAttribution
}

function statusCopyKey(status: SkillAttributionStatus): SkillDetailCopyKey {
  switch (status) {
    case 'verified_maintainer':
      return 'attributionVerifiedMaintainer'
    case 'community_submitted':
      return 'attributionCommunitySubmitted'
    case 'agent_submitted':
      return 'attributionAgentSubmitted'
    case 'community_indexed':
      return 'attributionCommunityIndexed'
    default:
      return 'attributionRegistryIndexed'
  }
}

function ExternalTextLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) {
    return (
      <span className="font-mono text-xs text-secondary">
        <SkillDetailText id="unknown" />
      </span>
    )
  }

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
          <p className="mb-2 text-xs uppercase text-secondary">
            <SkillDetailText id="listingSource" />
          </p>
          <h3 id="skill-attribution-title" className="font-display text-lg font-semibold">
            <SkillDetailText id={statusCopyKey(attribution.status)} />
          </h3>
        </div>
        <span
          className={`border px-2 py-1 font-mono text-[10px] uppercase ${
            isVerified ? 'border-foreground text-foreground' : 'border-border text-secondary'
          }`}
        >
          <SkillDetailText id={isVerified ? 'verified' : 'claimable'} />
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-secondary">
        <SkillDetailText
          id={isVerified ? 'attributionPublicVerified' : 'attributionTrustUnverified'}
        />
      </p>

      <dl className="mt-5 space-y-3">
        <div>
          <dt className="text-xs uppercase text-secondary">
            <SkillDetailText id="creator" />
          </dt>
          <dd className="mt-1">
            <ExternalTextLink href={attribution.creatorUrl}>{attribution.creatorName}</ExternalTextLink>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-secondary">
            <SkillDetailText id="source" />
          </dt>
          <dd className="mt-1">
            <ExternalTextLink href={attribution.sourceUrl}>{attribution.sourceDetail}</ExternalTextLink>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-secondary">
            <SkillDetailText id="indexedBy" />
          </dt>
          <dd className="mt-1 font-mono text-xs text-foreground">
            <SkillDetailText
              id={isVerified ? 'attributionIndexedVerified' : 'attributionIndexedCommunity'}
            />
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-secondary">
        <SkillDetailText
          id={isVerified ? 'attributionPublicVerified' : 'attributionPublicUnverified'}
        />
      </p>

      <Link
        href="#claim-this-skill"
        className="mt-4 block w-full border border-border px-3 py-2 text-center text-sm transition-colors hover:border-foreground"
      >
        <SkillDetailText id={isVerified ? 'verificationEvidence' : 'claimSkill'} />
      </Link>
    </section>
  )
}
