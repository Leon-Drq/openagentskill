import Link from 'next/link'
import { InstallCommand } from '@/components/install-command'
import { convertSkillRecordToManifest } from '@/lib/db/skills'
import { formatCompactNumber, getPlatformHints, getSkillQualityProfile } from '@/lib/quality'
import type { GrowthRankedSkill } from '@/lib/seo/growth-directories'
import { getSkillTrustProfile } from '@/lib/trust'

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unknown'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function GrowthSkillList({
  items,
  compareSeed,
  showInstall = true,
}: {
  items: GrowthRankedSkill[]
  compareSeed?: string[]
  showInstall?: boolean
}) {
  if (items.length === 0) {
    return (
      <div className="border border-border p-8">
        <h2 className="font-display text-2xl font-semibold">No matching skills yet.</h2>
        <p className="mt-3 text-sm leading-relaxed text-secondary">
          The index is still expanding this section. New skills will appear as the importer and activity events add more signals.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((item) => {
        const skill = item.skill
        const manifest = convertSkillRecordToManifest(skill)
        const quality = getSkillQualityProfile(skill)
        const trust = getSkillTrustProfile(skill)
        const platforms = [...new Set([...(skill.frameworks || []), ...getPlatformHints(skill)])]
        const compareSlugs = [
          skill.slug,
          ...(compareSeed || items.filter((row) => row.skill.slug !== skill.slug).slice(0, 3).map((row) => row.skill.slug)),
        ].slice(0, 4)

        return (
          <article key={skill.slug} className="grid gap-5 py-7 lg:grid-cols-[auto_1fr_280px]">
            <div className="font-mono text-2xl text-secondary tabular-nums">#{item.rank}</div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Link href={`/skills/${skill.slug}`} className="min-w-0">
                  <h2 className="font-display text-2xl font-semibold leading-tight hover:text-secondary">
                    {skill.name}
                  </h2>
                </Link>
                <span className="border border-border px-2 py-0.5 font-mono text-xs text-secondary">
                  {item.badge}
                </span>
                <span className="border border-border px-2 py-0.5 font-mono text-xs text-secondary">
                  Trust {trust.score}
                </span>
                <span className="border border-border px-2 py-0.5 font-mono text-xs text-secondary">
                  {quality.label} {quality.score}
                </span>
              </div>
              <p className="max-w-3xl text-sm leading-relaxed text-secondary">{skill.description}</p>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed">{item.reason}</p>
              <div className="mt-4 flex flex-wrap gap-4 font-mono text-xs text-secondary">
                <span>{formatCompactNumber(skill.github_stars || 0)} stars</span>
                <span>{formatDate(skill.github_last_pushed_at || skill.updated_at)} push</span>
                <span>{trust.label}</span>
                {platforms.slice(0, 2).map((platform) => <span key={platform}>{platform}</span>)}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/alternatives/${skill.slug}`}
                  className="border border-border px-2.5 py-1 text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground"
                >
                  Alternatives
                </Link>
                <Link
                  href={`/compare?skills=${encodeURIComponent(compareSlugs.join(','))}`}
                  className="border border-border px-2.5 py-1 text-xs text-secondary transition-colors hover:border-foreground hover:text-foreground"
                >
                  Compare
                </Link>
              </div>
            </div>
            {showInstall && (
              <div className="min-w-0">
                <InstallCommand
                  command={manifest.technical.installCommand || `npx skills add ${skill.github_repo}`}
                  skillSlug={skill.slug}
                  compact
                />
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
