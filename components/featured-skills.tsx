import Link from 'next/link'

interface FeaturedSkill {
  slug: string
  name: string
  description: string
  author_name: string
  github_stars: number
  downloads: number
  trust_level: string
  author_type: string
}

function formatNumber(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

export function FeaturedSkills({ skills }: { skills: FeaturedSkill[] }) {
  if (!skills || skills.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
      {skills.map((skill) => (
        <Link
          key={skill.slug}
          href={`/skills/${skill.slug}`}
          className="bg-background p-6 hover:bg-muted/30 transition-colors group"
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-display text-lg font-semibold group-hover:opacity-70 transition-opacity">
              {skill.name}
            </h3>
            {skill.trust_level === 'verified' && (
              <span className="text-xs font-mono border border-border px-1.5 py-0.5 shrink-0 ml-2">
                VERIFIED
              </span>
            )}
          </div>

          <p className="text-sm text-secondary mb-4 leading-relaxed line-clamp-2">
            {skill.description}
          </p>

          <div className="flex items-center gap-4 text-xs font-mono text-secondary">
            <span>{skill.author_name}</span>
            <span className="text-border">{'|'}</span>
            <span>{formatNumber(skill.github_stars)} stars</span>
            <span className="text-border">{'|'}</span>
            <span>{formatNumber(skill.downloads)} downloads</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
