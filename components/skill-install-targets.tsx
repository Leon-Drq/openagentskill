'use client'

import { Check, Clipboard, Terminal } from 'lucide-react'
import { useState } from 'react'
import { trackSkillEvent } from '@/components/skill-event-tracker'
import { SkillDetailValue } from '@/components/skill-detail-text'
import { useI18n } from '@/lib/i18n/context'
import { formatSkillDetailCopy } from '@/lib/i18n/skill-detail-copy'
import type { SkillInstallTarget } from '@/lib/install-targets'
import { copyText } from '@/lib/copy-text'
import { cn } from '@/lib/utils'

interface SkillInstallTargetsProps {
  skillSlug: string
  targets: SkillInstallTarget[]
  compact?: boolean
}

export function SkillInstallTargets({ skillSlug, targets, compact = false }: SkillInstallTargetsProps) {
  const { locale } = useI18n()
  const [activeId, setActiveId] = useState(targets[0]?.id)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const activeTarget = targets.find((target) => target.id === activeId) || targets[0]

  if (!activeTarget) return null

  async function copyTarget(target: SkillInstallTarget) {
    try {
      const copied = await copyText(target.value)
      if (!copied) throw new Error('Clipboard is unavailable')
      trackSkillEvent(skillSlug, 'install_copy', { target: target.id, kind: target.kind })
      setCopiedId(target.id)
      setTimeout(() => setCopiedId(null), 1800)
    } catch (error) {
      console.error('Failed to copy install target:', error)
    }
  }

  if (compact) {
    return (
      <section
        className="overflow-hidden rounded-[8px] border border-border bg-background"
        aria-label={formatSkillDetailCopy(locale, 'installTargets')}
      >
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">
              {formatSkillDetailCopy(locale, 'installTargets')}
            </p>
            <p className="mt-1 text-sm font-semibold">
              <SkillDetailValue value={activeTarget.title} />
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-[8px] border border-border bg-card p-1 sm:grid-cols-4">
            {targets.map((target) => (
              <button
                key={target.id}
                type="button"
                onClick={() => setActiveId(target.id)}
                className={cn(
                  'min-h-8 rounded-[6px] px-2.5 text-xs font-semibold transition-colors',
                  activeTarget.id === target.id
                    ? 'bg-foreground text-background'
                    : 'text-secondary hover:text-foreground'
                )}
                aria-pressed={activeTarget.id === target.id}
              >
                {target.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch sm:p-4">
          <pre className="max-h-36 min-w-0 overflow-auto rounded-[6px] border border-border bg-card p-3 font-mono text-[11px] leading-relaxed text-foreground sm:text-xs">
            <code className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {activeTarget.kind === 'command' ? `$ ${activeTarget.value}` : activeTarget.value}
            </code>
          </pre>
          <button
            type="button"
            onClick={() => copyTarget(activeTarget)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-[#006b4f] bg-[#006b4f] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-85"
          >
            {copiedId === activeTarget.id ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Clipboard className="h-4 w-4" aria-hidden="true" />
            )}
            {copiedId === activeTarget.id
              ? formatSkillDetailCopy(locale, 'copied')
              : <SkillDetailValue value={activeTarget.copyLabel} />}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mb-10 border border-border bg-card">
      <div className="border-b border-border p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">{formatSkillDetailCopy(locale, 'installTargets')}</p>
            <h2 className="font-display text-2xl font-semibold">{formatSkillDetailCopy(locale, 'installWorkflow')}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
              {formatSkillDetailCopy(locale, 'agentHandoffDescription')}
            </p>
          </div>
          <div className="flex h-9 shrink-0 items-center border border-border bg-background">
            <Terminal className="ml-3 h-4 w-4 text-secondary" aria-hidden="true" />
            <span className="px-3 font-mono text-xs text-secondary">skill install</span>
          </div>
        </div>
      </div>

      <div className="grid gap-px bg-border lg:grid-cols-[240px_1fr]">
        <div className="grid bg-card sm:grid-cols-4 lg:block">
          {targets.map((target) => (
            <button
              key={target.id}
              type="button"
              onClick={() => setActiveId(target.id)}
              className={cn(
                'min-h-14 border-b border-border px-4 py-3 text-left text-sm transition-colors sm:border-r sm:border-b-0 lg:border-r-0 lg:border-b',
                activeTarget.id === target.id
                  ? 'bg-foreground text-background'
                  : 'bg-card text-secondary hover:bg-background hover:text-foreground'
              )}
              aria-pressed={activeTarget.id === target.id}
            >
              <span className="block font-semibold">{target.label}</span>
              <span className="mt-1 hidden text-xs opacity-75 sm:block lg:hidden xl:block">
                {target.kind === 'command'
                  ? formatSkillDetailCopy(locale, 'command')
                  : formatSkillDetailCopy(locale, 'prompt')}
              </span>
            </button>
          ))}
        </div>

        <div className="min-w-0 bg-background p-4 sm:p-5">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <h3 className="font-display text-xl font-semibold">
                <SkillDetailValue value={activeTarget.title} />
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
                <SkillDetailValue value={activeTarget.description} />
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyTarget(activeTarget)}
              className="inline-flex w-full items-center justify-center gap-2 border border-foreground bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85 sm:w-auto"
            >
              {copiedId === activeTarget.id ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Clipboard className="h-4 w-4" aria-hidden="true" />
              )}
              {copiedId === activeTarget.id
                ? formatSkillDetailCopy(locale, 'copied')
                : <SkillDetailValue value={activeTarget.copyLabel} />}
            </button>
          </div>

          <pre className="max-h-64 min-h-32 overflow-auto border border-border bg-card p-4 font-mono text-xs leading-relaxed text-foreground sm:text-sm">
            <code className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {activeTarget.kind === 'command' ? `$ ${activeTarget.value}` : activeTarget.value}
            </code>
          </pre>
        </div>
      </div>
    </section>
  )
}
