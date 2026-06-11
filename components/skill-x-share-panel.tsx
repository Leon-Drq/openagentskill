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
    <div className="border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-secondary">Growth loop</p>
          <h3 className="mt-1 font-display text-lg font-semibold">Share this skill</h3>
        </div>
        <span className="shrink-0 border border-border px-2 py-1 font-mono text-xs text-secondary">X</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-secondary">
        Scenario-led draft for {skillName}, with the OpenAgentSkill Update theme and canonical URL.
      </p>

      <div className="mt-4 rounded-[8px] border border-border bg-background p-3">
        <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-secondary">
          {mainText}
        </pre>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => copy(mainText, 'main')}
          className="inline-flex items-center justify-center gap-2 border border-border px-3 py-2 text-sm transition-colors hover:border-foreground"
        >
          {copied === 'main' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied === 'main' ? 'Copied' : 'Copy post'}
        </button>
        <a
          href={mainIntentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 border border-foreground bg-foreground px-3 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-80"
        >
          Open X draft
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      {replyText && replyIntentUrl && (
        <details className="mt-4 border-t border-border pt-4">
          <summary className="cursor-pointer text-xs font-semibold text-secondary hover:text-foreground">
            Optional reply with install command
          </summary>
          <div className="mt-3 rounded-[8px] border border-border bg-background p-3">
            <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-secondary">
              {replyText}
            </pre>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => copy(replyText, 'reply')}
              className="inline-flex items-center justify-center gap-2 border border-border px-3 py-2 text-sm transition-colors hover:border-foreground"
            >
              {copied === 'reply' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied === 'reply' ? 'Copied' : 'Copy reply'}
            </button>
            <a
              href={replyIntentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-border px-3 py-2 text-sm transition-colors hover:border-foreground"
            >
              Open reply draft
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </details>
      )}
    </div>
  )
}
