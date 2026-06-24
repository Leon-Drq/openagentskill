'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'

interface SkillXSharePanelProps {
  skillName: string
  mainText: string
  mainIntentUrl: string
  replyText?: string
  replyIntentUrl?: string
}

export function SkillXSharePanel({
  skillName,
  mainText,
  mainIntentUrl,
  replyText,
  replyIntentUrl,
}: SkillXSharePanelProps) {
  const [copied, setCopied] = useState<string | null>(null)

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value)
    setCopied(key)
    window.setTimeout(() => setCopied(null), 1800)
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-border bg-card shadow-[0_14px_36px_rgba(22,20,16,0.04)]">
      <div className="relative border-b border-border bg-[#fbfaf7] p-5">
        <div className="brand-grain pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">
              Growth loop
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold">
              Share kit
            </h3>
          </div>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-border bg-background font-mono text-xs text-secondary">
            X
          </span>
        </div>
      </div>

      <div className="p-5">
        <p className="text-xs leading-relaxed text-secondary">
          Scenario-led draft for{' '}
          <span className="text-foreground">{skillName}</span>, ready for a
          manual X post.
        </p>

        <div className="mt-4 overflow-hidden rounded-[8px] border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border bg-[#fbfaf7] px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-secondary">
              Curator note
            </span>
            <span className="h-2 w-2 rounded-full bg-[#006b4f]" />
          </div>
          <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed text-secondary">
            {mainText}
          </pre>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => copy(mainText, 'main')}
            className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-border px-3 py-2 text-sm transition-colors hover:border-foreground"
          >
            {copied === 'main' ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copied === 'main' ? 'Copied' : 'Copy post'}
          </button>
          <a
            href={mainIntentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[#006b4f] bg-[#006b4f] px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Open X draft
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        {replyText && replyIntentUrl && (
          <details className="mt-4 rounded-[8px] border border-border bg-background p-3">
            <summary className="cursor-pointer text-xs font-semibold text-secondary hover:text-foreground">
              Optional reply with install command
            </summary>
            <div className="mt-3 rounded-[8px] border border-border bg-[#fbfaf7] p-3">
              <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-secondary">
                {replyText}
              </pre>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => copy(replyText, 'reply')}
                className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-border px-3 py-2 text-sm transition-colors hover:border-foreground"
              >
                {copied === 'reply' ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                {copied === 'reply' ? 'Copied' : 'Copy reply'}
              </button>
              <a
                href={replyIntentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-border px-3 py-2 text-sm transition-colors hover:border-foreground"
              >
                Open reply draft
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
