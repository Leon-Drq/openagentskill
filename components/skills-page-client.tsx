'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n/context'
import { InstallCommand } from './install-command'
import { LanguageSwitcher } from './language-switcher'

interface Skill {
  id: string
  slug: string
  name: string
  tagline: string
  stats: {
    downloads: number
    stars: number
    rating: number
    weeklyGrowth?: number
  }
  technical: {
    installCommand?: string
  }
  compatibility: Array<{ platform: string }>
  author: {
    name: string
  }
  verified: boolean
}

interface SkillsPageClientProps {
  skills: Skill[]
  query?: string
}

export function SkillsPageClient({ skills, query }: SkillsPageClientProps) {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 md:py-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <Link href="/" className="flex items-center gap-2 hover:opacity-60 transition-opacity">
              <span className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-foreground rounded-full flex items-center justify-center font-display font-bold text-xs sm:text-sm">
                O
              </span>
              <span className="text-lg sm:text-xl md:text-2xl font-display font-bold">
                Open Agent Skill
              </span>
            </Link>
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="hidden sm:flex gap-4 md:gap-6 text-xs sm:text-sm">
                <Link href="/docs" className="text-secondary hover:text-foreground transition-colors">
                  {t.nav.docs}
                </Link>
                <Link href="/api-docs" className="text-secondary hover:text-foreground transition-colors">
                  {t.nav.apiDocs}
                </Link>
              </div>
              <LanguageSwitcher />
            </div>
          </div>

          {/* Search */}
          <form action="/skills" method="get" className="relative">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder={t.skillsPage.search}
              className="w-full border border-border bg-background px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-serif focus:border-foreground focus:outline-none"
            />
          </form>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12">
        {/* Stats */}
        <div className="mb-6 sm:mb-8 md:mb-12 text-center">
          <p className="text-sm text-secondary mb-2">
            {skills.length === 1
              ? t.skillsPage.skillCount.replace('{count}', String(skills.length))
              : t.skillsPage.skillsCount.replace('{count}', String(skills.length))}
          </p>
          {query && (
            <p className="text-xs text-secondary">
              {t.skillsPage.showingResults.replace('{query}', query)} ·{' '}
              <Link href="/skills" className="underline">
                {t.skillsPage.clear}
              </Link>
            </p>
          )}
        </div>

        {/* Skills List */}
        {skills.length === 0 ? (
          <div className="border border-border p-8 sm:p-12 text-center">
            <p className="text-secondary mb-4">{t.skillsPage.noSkills}</p>
            <Link href="/skills" className="text-foreground underline text-sm">
              {t.skillsPage.viewAllSkills}
            </Link>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8 md:space-y-12">
            {skills.map((skill, index) => (
              <article key={skill.id} className="border-b border-border pb-6 sm:pb-8 md:pb-12 last:border-0">
                <div className="flex gap-3 sm:gap-4 md:gap-6 items-start">
                  <div className="font-mono text-base sm:text-lg md:text-xl text-secondary shrink-0 w-6 sm:w-8 md:w-10 text-right pt-1">
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Name & Tagline */}
                    <div className="mb-3 sm:mb-4">
                      <Link href={`/skills/${skill.slug}`} className="inline-block">
                        <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-semibold hover:opacity-60 transition-opacity mb-2">
                          {skill.name}
                        </h2>
                      </Link>
                      <p className="text-sm sm:text-base md:text-lg text-secondary italic leading-relaxed">
                        {skill.tagline}
                      </p>
                    </div>

                    {/* Install Command */}
                    {skill.technical.installCommand && (
                      <div className="mb-3 sm:mb-4">
                        <InstallCommand command={skill.technical.installCommand} skillSlug={skill.slug} compact />
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-secondary font-mono mb-3 sm:mb-4">
                      <span>{t.skillsPage.installs.replace('{count}', (skill.stats.downloads / 1000).toFixed(1))}</span>
                      <span>★ {(skill.stats.stars / 1000).toFixed(1)}k</span>
                      <span>{skill.stats.rating}/5</span>
                      {skill.stats.weeklyGrowth && skill.stats.weeklyGrowth > 0 && (
                        <span className="text-foreground">↑ {skill.stats.weeklyGrowth}%</span>
                      )}
                    </div>

                    {/* Platforms */}
                    <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
                      {skill.compatibility.slice(0, 6).map((compat) => (
                        <span key={compat.platform} className="text-xs border border-border px-2 py-1 text-secondary">
                          {compat.platform}
                        </span>
                      ))}
                    </div>

                    {/* Author */}
                    <div className="text-xs text-secondary">
                      {t.skillsPage.by} {skill.author.name}
                      {skill.verified && <span className="ml-2 font-mono">{t.skillsPage.verified}</span>}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 sm:mt-16 md:mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8 text-sm">
            <div>
              <p className="font-semibold mb-3">{t.skillsPage.footer.platform}</p>
              <ul className="space-y-2 text-secondary">
                <li>
                  <Link href="/docs" className="hover:text-foreground">
                    {t.skillsPage.footer.documentation}
                  </Link>
                </li>
                <li>
                  <Link href="/api-docs" className="hover:text-foreground">
                    {t.skillsPage.footer.api}
                  </Link>
                </li>
                <li>
                  <Link href="/submit" className="hover:text-foreground">
                    {t.skillsPage.footer.submitSkill}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-3">{t.skillsPage.footer.community}</p>
              <ul className="space-y-2 text-secondary">
                <li>
                  <a href="https://github.com/openagentskill" className="hover:text-foreground">
                    {t.skillsPage.footer.github}
                  </a>
                </li>
                <li>
                  <a href="https://discord.gg/openagentskill" className="hover:text-foreground">
                    {t.skillsPage.footer.discord}
                  </a>
                </li>
                <li>
                  <a href="https://twitter.com/openagentskill" className="hover:text-foreground">
                    {t.skillsPage.footer.twitter}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-3">{t.skillsPage.footer.resources}</p>
              <ul className="space-y-2 text-secondary">
                <li>
                  <Link href="/about" className="hover:text-foreground">
                    {t.skillsPage.footer.about}
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-foreground">
                    {t.skillsPage.footer.blog}
                  </Link>
                </li>
                <li>
                  <Link href="/standards" className="hover:text-foreground">
                    {t.skillsPage.footer.standards}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
