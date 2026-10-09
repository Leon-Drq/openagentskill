'use client'

import Link from '@/components/crawl-link'
import { ChevronDown, Search, type LucideIcon } from 'lucide-react'
import { NativeSelect } from '@/components/ui/native-select'
import { discoveryIcons } from './discovery-navigation'
import { discoveryCopy } from '@/lib/discovery'
import { directoryCopy, directoryLabel } from '@/lib/i18n/directory-copy'
import { directoryFilterCopy } from '@/lib/i18n/directory-filter-copy'
import { commerceCopy } from '@/lib/i18n/commerce-copy'
import type { Locale } from '@/lib/i18n/config'
import { directoryAccessOptions, type DirectoryFilterDraft } from '@/lib/skills/directory-filters'
import { SKILL_CATEGORIES, TOPIC_RULES, categoryLabel } from '@/lib/skills/taxonomy'

type Updates = Partial<DirectoryFilterDraft>
interface Props {
  locale: Locale
  value: DirectoryFilterDraft
  onChange: (updates: Updates) => void
  disabled?: boolean
  href?: (updates: Updates) => string
  categories: string[]
  useCases: Array<{ slug: string; shortTitle: string }>
  platformOptions: string[]
}

function FilterChoice({ children, selected, disabled, href, onClick, compact = false, icon: Icon }: {
  children: React.ReactNode; selected: boolean; disabled?: boolean; href?: string; onClick: () => void; compact?: boolean; icon?: LucideIcon
}) {
  const className = `flex min-h-11 items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-sm transition-colors lg:min-h-10 lg:text-xs ${compact ? 'justify-center border' : 'w-full'} ${selected ? 'border-[#006b4f]/25 bg-[#006b4f]/10 font-semibold text-[#006b4f]' : 'border-border text-secondary hover:bg-muted hover:text-foreground'} ${disabled ? 'pointer-events-none opacity-50' : ''}`
  const content = <>{Icon && <Icon size={15} className="shrink-0" aria-hidden="true" />}{children}</>
  return href ? <Link href={href} prefetch={false} scroll={false} aria-current={selected ? 'true' : undefined} aria-disabled={disabled || undefined} className={className}
    onNavigate={event => { event.preventDefault(); if (!disabled) onClick() }}>{content}</Link>
    : <button type="button" aria-pressed={selected} disabled={disabled} onClick={onClick} className={className}>{content}</button>
}

export function DirectoryFilterPanel({ locale, value, onChange, disabled, href, categories, useCases, platformOptions }: Props) {
  const c = directoryCopy(locale), f = directoryFilterCopy(locale), d = discoveryCopy(locale), prices = commerceCopy(locale)
  const label = (key: string) => directoryLabel(locale, key)
  const primaryCategories = SKILL_CATEGORIES.slice(0, 6).map(item => item[0] as string)
  const otherCategories = categories.filter(key => !primaryCategories.includes(key))
  const choice = (key: keyof DirectoryFilterDraft, option: string, title: string, compact = false, icon?: LucideIcon) => {
    const updates = { [key]: option }
    return <FilterChoice key={option} selected={value[key] === option} disabled={disabled} href={href?.(updates)} onClick={() => onChange(updates)} compact={compact} icon={icon}>{title}</FilterChoice>
  }
  const categoryChoice = (key: string) => {
    const item = SKILL_CATEGORIES.find(item => item[0] === key)
    return choice('category', key, key === 'all' ? label('allCategories') : item ? categoryLabel(key, locale) : label(key), false, item ? discoveryIcons[item[3]] : Search)
  }
  const advanced = [
    { key: 'tag', title: label('taskTag'), options: TOPIC_RULES.filter(t => value.category === 'all' || t[1] === value.category || t[0] === value.tag).map(t => [t[0], t[locale === 'zh' ? 3 : 2]]) },
    { key: 'useCase', title: c.useCase, options: useCases.map(v => [v.slug, v.shortTitle]) },
    { key: 'platform', title: c.platform, options: [...new Set(['Codex', 'Claude Code', 'Cursor', ...platformOptions, ...(value.platform !== 'all' ? [value.platform] : [])])].map(v => [v, v]) },
    { key: 'minStars', title: c.minimum, options: [...new Set(['20', '100', '500', '1000', '5000', ...(value.minStars !== 'all' ? [value.minStars] : [])])].map(v => [v, v + '+']) },
  ] as const
  const advancedActive = advanced.some(item => value[item.key] !== 'all') || value.pricing !== 'all'

  return <div className="space-y-5" data-directory-filter-panel>
    <section aria-label={f.access}>
      <h3 className="mb-2.5 text-xs font-medium text-secondary">{f.access}</h3>
      <div className="grid grid-cols-2 gap-2">{directoryAccessOptions.map(option => choice('access', option, f[option], true))}</div>
    </section>
    <div className="grid gap-0.5 border-t border-border pt-4" data-discovery-filters>
      {([['featured', d.featured], ['examples', d.withExamples]] as const).map(([key, title]) => <label key={key} className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm">
        <input type="checkbox" checked={value[key] === 'true'} disabled={disabled} onChange={event => onChange({ [key]: event.target.checked ? 'true' : 'all' })} className="h-4 w-4 accent-[#006b4f]" />{title}
      </label>)}
    </div>
    <nav className="border-t border-border pt-4" aria-label={c.category} data-directory-categories>
      <h3 className="mb-2 text-xs font-medium text-secondary">{c.category}</h3>
      {['all', ...primaryCategories].map(categoryChoice)}
      <details key={value.category} open={otherCategories.includes(value.category) || undefined} className="group">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between px-2.5 text-xs text-secondary [&::-webkit-details-marker]:hidden">{f.moreCategories}<ChevronDown size={14} aria-hidden="true" className="transition-transform group-open:rotate-180" /></summary>
        {otherCategories.map(categoryChoice)}
      </details>
    </nav>
    <details key={String(advancedActive)} open={advancedActive || undefined} className="group border-t border-border pt-3" data-directory-advanced>
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-xs font-medium text-secondary [&::-webkit-details-marker]:hidden">{f.advanced}<ChevronDown size={14} aria-hidden="true" className="transition-transform group-open:rotate-180" /></summary>
      <div className="grid gap-4 pt-3">
        {advanced.map(filter => <label key={filter.key} className="grid gap-2 text-xs text-secondary">{filter.title}
          <NativeSelect disabled={disabled} value={value[filter.key]} onChange={event => onChange({ [filter.key]: event.target.value })} className="min-h-11 w-full bg-card text-sm">
            <option value="all">{c.any}</option>{filter.options.map(([option, title]) => <option key={option} value={option}>{title}</option>)}
          </NativeSelect>
        </label>)}
        {/* Preserve old pricing links without repeating a second price control. */}
        {value.pricing !== 'all' && <button type="button" onClick={() => onChange({ pricing: 'all' })} disabled={disabled} className="min-h-10 text-left text-xs text-secondary underline">{prices.pricing}: {prices[value.pricing as 'free' | 'paid' | 'freemium' | 'unknown']} · {c.remove}</button>}
      </div>
    </details>
  </div>
}
