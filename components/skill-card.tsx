import Link from 'next/link'
import { Skill } from '@/lib/types'

interface SkillCardProps {
  skill: Skill
}

export function SkillCard({ skill }: SkillCardProps) {
  return (
    <Link 
      href={`/skills/${skill.slug}`}
      className="block border border-border bg-card p-6 transition-all hover:border-foreground"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-display text-2xl font-semibold leading-tight text-foreground mb-2">
            {skill.name}
          </h3>
          <p className="text-secondary text-base italic leading-relaxed">
            {skill.tagline}
          </p>
        </div>
        {skill.verified && (
          <span className="ml-4 shrink-0 border border-foreground px-2 py-1 text-xs font-mono">
            {'VERIFIED'}
          </span>
        )}
      </div>

      <p className="text-foreground leading-relaxed mb-4">
        {skill.description}
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {skill.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="border border-border px-2 py-1 text-xs text-secondary"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-secondary border-t border-border pt-4">
        <div className="flex items-center gap-4">
          <span className="font-mono">{skill.stats.downloads.toLocaleString()} downloads</span>
          <span className="font-mono">★ {skill.stats.stars.toLocaleString()}</span>
          <span className="font-mono">⊕ {skill.stats.rating}/5</span>
        </div>
        <span className="text-xs">{skill.author.name}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {skill.compatibility.slice(0, 3).map((compat) => (
          <span
            key={compat.platform}
            className="text-xs font-mono text-secondary"
          >
            {compat.platform}
          </span>
        ))}
      </div>
    </Link>
  )
}
