'use client'

import Link from 'next/link'
import { BrandMark } from '@/components/brand-mark'
import { useI18n } from '@/lib/i18n/context'

export function SiteFooter() {
  const { t } = useI18n()

  return (
    <footer className="relative overflow-hidden border-t border-border bg-background">
      <div className="brand-grain pointer-events-none absolute inset-0 opacity-45" />
      <div className="relative mx-auto max-w-6xl px-6 py-12 sm:py-14">
        <div className="grid gap-10 border-b border-border pb-10 lg:grid-cols-[1.15fr_1.85fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 font-sans text-sm font-semibold tracking-tight transition-opacity hover:opacity-70">
              <BrandMark className="h-7 w-7" />
              OpenAgentSkill
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-secondary">
              The skill layer for AI agents: discover, compare, audit, and install reusable capabilities across Codex, Claude Code, Cursor, and agent runtimes.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="https://github.com/Leon-Drq/openagentskill"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border bg-card px-3 py-2 text-xs font-semibold transition-colors hover:border-foreground"
              >
                GitHub
              </a>
              <a
                href="https://x.com/openagentskill"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border bg-card px-3 py-2 text-xs font-semibold transition-colors hover:border-foreground"
              >
                X
              </a>
            </div>
          </div>

          <nav className="grid gap-8 text-sm sm:grid-cols-3" aria-label="Footer navigation">
            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Explore</h2>
              <div className="mt-4 grid gap-2 text-secondary">
                <Link href="/skills" className="hover:text-foreground">{t.nav.skills}</Link>
                <Link href="/agent-skills" className="hover:text-foreground">Agent Skills</Link>
                <Link href="/agent-skill" className="hover:text-foreground">What Is an Agent Skill?</Link>
                <Link href="/ai-agent-skills" className="hover:text-foreground">AI Agent Skills</Link>
                <Link href="/tasks" className="hover:text-foreground">Tasks</Link>
                <Link href="/skill-packs" className="hover:text-foreground">Skill Packs</Link>
                <Link href="/best" className="hover:text-foreground">Best Skills</Link>
                <Link href="/trending" className="hover:text-foreground">Trending</Link>
                <Link href="/collections" className="hover:text-foreground">Stacks</Link>
                <Link href="/use-cases" className="hover:text-foreground">Use Cases</Link>
                <Link href="/agents" className="hover:text-foreground">Agents</Link>
                <Link href="/agent" className="hover:text-foreground">Agent Entry</Link>
              </div>
            </div>

            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Trust</h2>
              <div className="mt-4 grid gap-2 text-secondary">
                <Link href="/compare" className="hover:text-foreground">Compare</Link>
                <Link href="/safety" className="hover:text-foreground">Safety Gate</Link>
                <Link href="/skills-registry" className="hover:text-foreground">Skills Registry</Link>
                <Link href="/rankings" className="hover:text-foreground">Rankings</Link>
                <Link href="/outcomes" className="hover:text-foreground">Outcomes</Link>
                <Link href="/audits" className="hover:text-foreground">Audits</Link>
                <Link href="/official" className="hover:text-foreground">Official</Link>
                <Link href="/reports/weekly" className="hover:text-foreground">Weekly Reports</Link>
                <Link href="/reports/monthly" className="hover:text-foreground">Monthly Index</Link>
                <Link href="/reports/state-of-agent-skills-2026" className="hover:text-foreground">State of Agent Skills</Link>
                <Link href="/compare/openagentskill-vs-skills-sh" className="hover:text-foreground">vs skills.sh</Link>
                <Link href="/alternatives/agentskills-io" className="hover:text-foreground">AgentSkills.io Alternative</Link>
              </div>
            </div>

            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Build</h2>
              <div className="mt-4 grid gap-2 text-secondary">
                <Link href="/docs" className="hover:text-foreground">{t.nav.docs}</Link>
                <Link href="/openagentskill" className="hover:text-foreground">About OpenAgentSkill</Link>
                <Link href="/api-docs" className="hover:text-foreground">{t.nav.apiDocs}</Link>
                <Link href="/llms.txt" prefetch={false} className="hover:text-foreground">llms.txt</Link>
                <Link href="/openapi.json" prefetch={false} className="hover:text-foreground">OpenAPI</Link>
	                <Link href="/cli" className="hover:text-foreground">CLI</Link>
	                <Link href="/creator-kit" className="hover:text-foreground">Creator Kit</Link>
	                <Link href="/x-kit" className="hover:text-foreground">X Growth Kit</Link>
	                <Link href="/submit" className="hover:text-foreground">{t.nav.submit}</Link>
                <Link href="/blog" className="hover:text-foreground">Blog</Link>
                <Link href="/guides" className="hover:text-foreground">Guides</Link>
                <Link href="/activity" className="hover:text-foreground">{t.nav.activity}</Link>
              </div>
            </div>
          </nav>
        </div>

        <div className="flex flex-col gap-3 pt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-secondary sm:flex-row sm:items-center sm:justify-between">
          <span>OpenAgentSkill Registry</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
            <span>Built for agent-native discovery</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
