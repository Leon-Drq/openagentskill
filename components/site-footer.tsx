'use client'

import Link from 'next/link'
import { BrandMark } from '@/components/brand-mark'
import { useI18n } from '@/lib/i18n/context'

export function SiteFooter() {
  const { t } = useI18n()

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 sm:px-6 sm:py-12 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-display text-sm font-semibold tracking-tight transition-opacity hover:opacity-70">
            <BrandMark className="h-6 w-6" />
            OpenAgentSkill
          </Link>
          <p className="mt-1 text-xs text-secondary">Open infrastructure for agent skills.</p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-secondary" aria-label="Footer navigation">
          <Link href="/skills" className="hover:text-foreground">
            {t.nav.skills}
          </Link>
          <Link href="/best" className="hover:text-foreground">
            Best
          </Link>
          <Link href="/trending" className="hover:text-foreground">
            Trending
          </Link>
          <Link href="/hot" className="hover:text-foreground">
            Hot
          </Link>
          <Link href="/audits" className="hover:text-foreground">
            Audits
          </Link>
          <Link href="/official" className="hover:text-foreground">
            Official
          </Link>
          <Link href="/agents" className="hover:text-foreground">
            Agents
          </Link>
          <Link href="/use-cases" className="hover:text-foreground">
            Use Cases
          </Link>
          <Link href="/rankings" className="hover:text-foreground">
            Rankings
          </Link>
          <Link href="/reports/weekly" className="hover:text-foreground">
            Reports
          </Link>
          <Link href="/reports/monthly" className="hover:text-foreground">
            Monthly Index
          </Link>
          <Link href="/collections" className="hover:text-foreground">
            Stacks
          </Link>
          <Link href="/compare" className="hover:text-foreground">
            Compare
          </Link>
          <Link href="/compare/openagentskill-vs-skills-sh" className="hover:text-foreground">
            vs skills.sh
          </Link>
          <Link href="/guides" className="hover:text-foreground">
            Guides
          </Link>
          <Link href="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <Link href="/docs" className="hover:text-foreground">
            {t.nav.docs}
          </Link>
          <Link href="/api-docs" className="hover:text-foreground">
            {t.nav.apiDocs}
          </Link>
          <Link href="/activity" className="hover:text-foreground">
            {t.nav.activity}
          </Link>
          <a
            href="https://github.com/Leon-Drq/openagentskill"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
          <a href="https://x.com/openagentskill" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
            X
          </a>
        </nav>
      </div>
    </footer>
  )
}
