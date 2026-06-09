'use client'

import { Check, Clipboard, Terminal } from 'lucide-react'
import { useState } from 'react'
import { trackSkillEvent } from '@/components/skill-event-tracker'
import type { SkillInstallTarget } from '@/lib/install-targets'
import { cn } from '@/lib/utils'

interface SkillInstallTargetsProps {
  skillSlug: string
  targets: SkillInstallTarget[]
}

export function SkillInstallTargets({ skillSlug, targets }: SkillInstallTargetsProps) {
  const [activeId, setActiveId] = useState(targets[0]?.id)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const activeTarget = targets.find((target) => target.id === activeId) || targets[0]

  if (!activeTarget) return null

  async function copyTarget(target: SkillInstallTarget) {
    try {
      await navigator.clipboard.writeText(target.value)
      trackSkillEvent(skillSlug, 'install_copy', { target: target.id, kind: target.kind })
      setCopiedId(target.id)
      setTimeout(() => setCopiedId(null), 1800)
    } catch (error) {
      console.error('Failed to copy install target:', error)
    }
  }

  return (
    <section className="mb-10 border border-border bg-card">
      <div className="border-b border-border p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-secondary">Install targets</p>
            <h2 className="font-display text-2xl font-semibold">Install this skill in your agent workflow</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-secondary">
              Copy the registry command or an agent-specific install prompt for Codex, Claude Code, and Cursor.
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
                {target.kind === 'command' ? 'Command' : 'Prompt'}
              </span>
            </button>
          ))}
        </div>

        <div className="min-w-0 bg-background p-4 sm:p-5">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <h3 className="font-display text-xl font-semibold">{activeTarget.title}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">{activeTarget.description}</p>
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
              {copiedId === activeTarget.id ? 'Copied' : activeTarget.copyLabel}
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
