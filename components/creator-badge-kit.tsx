'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Copy, ExternalLink } from 'lucide-react'

interface CreatorBadgeKitProps {
  skillSlug: string
}

function badgeMarkdown(slug: string) {
  const base = 'https://www.openagentskill.com'
  return [
    `[![Listed on OpenAgentSkill](${base}/api/badge/${slug}?metric=listed&label=Listed)](${base}/skills/${slug})`,
    `[![OpenAgentSkill Trust](${base}/api/badge/${slug}?metric=trust&label=Trust)](${base}/skills/${slug})`,
    `[![OpenAgentSkill Audit](${base}/api/badge/${slug}?metric=audit&label=Audit)](${base}/skills/${slug}/audit)`,
    `[![Agent Proven](${base}/api/badge/${slug}?metric=proven&label=Agent%20Proven)](${base}/skills/${slug})`,
  ].join('\n')
}

export function CreatorBadgeKit({ skillSlug }: CreatorBadgeKitProps) {
  const [copied, setCopied] = useState(false)
  const markdown = badgeMarkdown(skillSlug)

  async function copyBadges() {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1_800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-[8px] border border-border bg-card" aria-labelledby="creator-badge-title">
      <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">Creator backlink kit</p>
          <h3 id="creator-badge-title" className="mt-2 font-display text-xl font-semibold">
            Add the evidence badges to your README
          </h3>
          <p className="mt-2 max-w-md text-xs leading-5 text-secondary">
            Show the canonical listing, current trust and audit signals, and real Agent Proven evidence where developers evaluate the repository.
          </p>
        </div>
        <button
          type="button"
          onClick={copyBadges}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[8px] border border-[#006b4f] bg-[#006b4f] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy all badges'}
        </button>
      </div>

      <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-all bg-background p-4 font-mono text-[10px] leading-5 text-secondary [overflow-wrap:anywhere] sm:text-[11px]">
        <code>{markdown}</code>
      </pre>

      <div className="grid gap-px border-t border-border bg-border sm:grid-cols-3">
        <Link
          href={`/api/badge/${skillSlug}?metric=listed&label=Listed`}
          prefetch={false}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 bg-card px-3 text-xs font-semibold text-secondary hover:text-foreground"
        >
          Preview badge <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <Link
          href={`/skills/${skillSlug}/audit`}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 bg-card px-3 text-xs font-semibold text-secondary hover:text-foreground"
        >
          Open audit <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <Link
          href="/creator-kit"
          className="inline-flex min-h-10 items-center justify-center gap-1.5 bg-card px-3 text-xs font-semibold text-secondary hover:text-foreground"
        >
          Creator Kit <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
