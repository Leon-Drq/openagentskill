'use client'

import Link from '@/components/crawl-link'
import { SKILL_CATEGORIES, OUTPUT_RULES, categoryLabel } from '@/lib/skills/taxonomy'
import { ArrowRight, Code2, FileText, Image as ImageIcon, Monitor, Presentation, Search, Terminal, Workflow, ChartNoAxesCombined } from 'lucide-react'
import { Video } from 'lucide-react'
import { DISCOVERY_OUTPUTS, DISCOVERY_AGENTS, discoveryCopy } from '@/lib/discovery'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import { useI18n } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

export const discoveryIcons = { web: Monitor, code: Code2, video: Video, search: Search, workflow: Workflow, document: FileText, slides: Presentation, data: ChartNoAxesCombined, image: ImageIcon, terminal: Terminal }

export function DiscoveryCategories({ onNavigate, variant = 'default' }: { onNavigate?: () => void; variant?: 'default' | 'navigation' }) {
  const { locale } = useI18n()
  const c = discoveryCopy(locale)
  const groups = [
    { title: c.task, note: c.taskNote, items: SKILL_CATEGORIES.slice(0, 15).map(item => ({ id: item[0], href: variant === 'navigation' && item[0] === 'presentation' ? '/best/presentation-generation' : `/skills?category=${item[0]}`, icon: item[3], label: variant === 'navigation' && item[0] === 'presentation' && locale === 'en' ? 'PPT skills & slides' : categoryLabel(item[0], locale) })) },
    { title: c.output, note: c.outputNote, items: OUTPUT_RULES.map(item => ({ id: item[0], href: variant === 'navigation' && item[0] === 'slides' ? '/best/presentation-generation' : `/skills?output=${item[0]}`, icon: item[0] === 'code' ? 'code' as const : item[0] === 'data' ? 'data' as const : DISCOVERY_OUTPUTS.find(output => output.id === item[0])!.icon, label: item[locale === 'zh' ? 2 : 1] })) },
    { title: c.agent, note: c.agentNote, items: DISCOVERY_AGENTS },
  ]
  return <div data-discovery-categories>
    <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_0.9fr]">
      {groups.map((group, index) => <section key={group.title} className={cn('min-w-0', variant === 'navigation' ? 'px-1 py-2' : ['rounded-[12px] border border-border/70 p-4', index === 0 ? 'bg-[#006b4f]/[0.045]' : 'bg-muted/35'])}>
        <h3 className="text-sm font-semibold">{group.title}</h3>
        <p className="mt-1 text-xs leading-5 text-secondary">{group.note}</p>
        <ul className={cn('mt-3 grid gap-1.5', index === 0 && 'sm:grid-cols-2')}>
          {group.items.map(item => {
            const Icon = discoveryIcons[item.icon]
            return <li key={item.id}><Link href={getLocalizedNavigationHref(item.href, locale)} prefetch={false} onClick={onNavigate}
              className="flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm leading-5 transition-colors hover:bg-card hover:text-[#006b4f] focus-visible:outline-2 focus-visible:outline-[#006b4f]">
              <Icon className="h-4 w-4 shrink-0 text-[#006b4f]" aria-hidden="true" /><span>{typeof item.label === 'string' ? item.label : item.label[locale]}</span>
            </Link></li>
          })}
        </ul>
      </section>)}
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3">
      {[[c.browse, '/skills'], [c.withExamples, '/skills?examples=true'], [c.finder, '/resolve']].map(([label, path]) =>
        <Link key={path} href={getLocalizedNavigationHref(path, locale)} prefetch={false} onClick={onNavigate} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#006b4f]">{label}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>)}
    </div>
  </div>
}
