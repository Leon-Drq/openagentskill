'use client'

import { useState } from 'react'
import { trackSkillEvent } from '@/components/skill-event-tracker'
import { useI18n } from '@/lib/i18n/context'
import { formatSkillDetailCopy } from '@/lib/i18n/skill-detail-copy'

interface InstallCommandProps {
  command: string
  skillSlug: string
  compact?: boolean
}

export function InstallCommand({ command, skillSlug, compact = false }: InstallCommandProps) {
  const { locale } = useI18n()
  const [copied, setCopied] = useState(false)

  const fullCommand = command || `npx skills add ${skillSlug}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullCommand)
      trackSkillEvent(skillSlug, 'install_copy', { command: fullCommand })
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('[v0] Failed to copy:', err)
    }
  }

  if (compact) {
    return (
      <div className="block max-w-full overflow-hidden border border-border bg-card">
        <div className="flex min-w-0 flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <code className="min-w-0 break-all font-mono text-xs leading-5 text-foreground sm:text-sm">
            $ {fullCommand}
          </code>
          <button
            onClick={copyToClipboard}
            className="self-start text-xs text-secondary transition-colors hover:text-foreground sm:self-auto"
            aria-label={formatSkillDetailCopy(locale, 'copy')}
          >
            {copied ? '✓' : formatSkillDetailCopy(locale, 'copy')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="my-8 max-w-full border border-border bg-card">
      <div className="flex flex-col items-start gap-2 border-b border-border px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h3 className="text-sm font-semibold">{formatSkillDetailCopy(locale, 'installWithOneCommand')}</h3>
        <button
          onClick={copyToClipboard}
          className="shrink-0 border border-border bg-background px-3 py-1 text-xs font-mono transition-colors hover:bg-muted"
          aria-label={formatSkillDetailCopy(locale, 'copy')}
        >
          {copied ? formatSkillDetailCopy(locale, 'copied') : formatSkillDetailCopy(locale, 'copy')}
        </button>
      </div>
      <div className="min-w-0">
        <pre className="max-w-full overflow-x-auto p-4 font-mono text-sm md:text-base">
          <code className="text-foreground">$ {fullCommand}</code>
        </pre>
      </div>
    </div>
  )
}
