'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { BrandMark } from '@/components/brand-mark'
import { useI18n } from '@/lib/i18n/context'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'

function FooterLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  const { locale } = useI18n()
  return <Link href={getLocalizedNavigationHref(href, locale)} prefetch={false} className={className}>{children}</Link>
}

export function SiteFooter() {
  const { t } = useI18n()

  return (
    <footer className="relative overflow-hidden border-t border-border bg-background">
      <div className="brand-grain pointer-events-none absolute inset-0 opacity-45" />
      <div className="relative mx-auto max-w-6xl px-6 py-12 sm:py-14">
        <div className="grid gap-10 border-b border-border pb-10 lg:grid-cols-[1.15fr_1.85fr]">
          <div>
            <FooterLink href="/" className="inline-flex items-center gap-2 font-sans text-sm font-semibold tracking-tight transition-opacity hover:opacity-70">
              <BrandMark className="h-7 w-7" />
              OpenAgentSkill
            </FooterLink>
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
                <FooterLink href="/skills" className="hover:text-foreground">{t.nav.skills}</FooterLink>
                <FooterLink href="/agent-skills" className="hover:text-foreground">Agent Skills</FooterLink>
                <FooterLink href="/agent-skill" className="hover:text-foreground">What Is an Agent Skill?</FooterLink>
                <FooterLink href="/ai-agent-skills" className="hover:text-foreground">AI Agent Skills</FooterLink>
                <FooterLink href="/tasks" className="hover:text-foreground">Tasks</FooterLink>
                <FooterLink href="/skill-packs" className="hover:text-foreground">Skill Packs</FooterLink>
                <FooterLink href="/best" className="hover:text-foreground">Best Skills</FooterLink>
                <FooterLink href="/trending" className="hover:text-foreground">Trending</FooterLink>
                <FooterLink href="/collections" className="hover:text-foreground">Stacks</FooterLink>
                <FooterLink href="/use-cases" className="hover:text-foreground">Use Cases</FooterLink>
                <FooterLink href="/agents" className="hover:text-foreground">Agents</FooterLink>
                <FooterLink href="/agent" className="hover:text-foreground">Agent Entry</FooterLink>
              </div>
            </div>

            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Trust</h2>
              <div className="mt-4 grid gap-2 text-secondary">
                <FooterLink href="/compare" className="hover:text-foreground">Compare</FooterLink>
                <FooterLink href="/safety" className="hover:text-foreground">Safety Gate</FooterLink>
                <FooterLink href="/agent-skills-registry" className="hover:text-foreground">Skills Registry</FooterLink>
                <FooterLink href="/rankings" className="hover:text-foreground">Rankings</FooterLink>
                <FooterLink href="/outcomes" className="hover:text-foreground">Outcomes</FooterLink>
                <FooterLink href="/audits" className="hover:text-foreground">Audits</FooterLink>
                <FooterLink href="/official" className="hover:text-foreground">Official</FooterLink>
                <FooterLink href="/reports/weekly" className="hover:text-foreground">Weekly Reports</FooterLink>
                <FooterLink href="/reports/monthly" className="hover:text-foreground">Monthly Index</FooterLink>
                <FooterLink href="/reports/state-of-agent-skills-2026" className="hover:text-foreground">State of Agent Skills</FooterLink>
                <FooterLink href="/compare/openagentskill-vs-skills-sh" className="hover:text-foreground">vs skills.sh</FooterLink>
                <FooterLink href="/alternatives/agentskills-io" className="hover:text-foreground">AgentSkills.io Alternative</FooterLink>
              </div>
            </div>

            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondary">Build</h2>
              <div className="mt-4 grid gap-2 text-secondary">
                <FooterLink href="/docs" className="hover:text-foreground">{t.nav.docs}</FooterLink>
                <FooterLink href="/openagentskill" className="hover:text-foreground">About OpenAgentSkill</FooterLink>
                <FooterLink href="/api-docs" className="hover:text-foreground">{t.nav.apiDocs}</FooterLink>
                <FooterLink href="/llms.txt" className="hover:text-foreground">llms.txt</FooterLink>
                <FooterLink href="/openapi.json" className="hover:text-foreground">OpenAPI</FooterLink>
                <FooterLink href="/cli" className="hover:text-foreground">CLI</FooterLink>
                <FooterLink href="/creator-kit" className="hover:text-foreground">Creator Kit</FooterLink>
                <FooterLink href="/x-kit" className="hover:text-foreground">X Growth Kit</FooterLink>
                <FooterLink href="/submit" className="hover:text-foreground">{t.nav.submit}</FooterLink>
                <FooterLink href="/blog" className="hover:text-foreground">Blog</FooterLink>
                <FooterLink href="/guides" className="hover:text-foreground">Guides</FooterLink>
                <FooterLink href="/activity" className="hover:text-foreground">{t.nav.activity}</FooterLink>
              </div>
            </div>
          </nav>
        </div>

        <div className="flex flex-col gap-3 pt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-secondary sm:flex-row sm:items-center sm:justify-between">
          <span>OpenAgentSkill Registry</span>
          <div className="flex flex-wrap items-center gap-4">
            <FooterLink href="/privacy" className="transition-colors hover:text-foreground">Privacy</FooterLink>
            <span>Built for agent-native discovery</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
