import Link from 'next/link'
import { externalSkillHref, searchExternalSkills } from '@/lib/skills/external-catalog'

export function ExternalSkillResults({ query = '', locale = 'en' }: { query?: string; locale?: string }) {
  const zh = locale === 'zh'
  const lang = zh ? 'zh' : 'en'
  const entries = searchExternalSkills(query)
  const suffix = zh ? '?lang=zh' : ''
  return <section className="my-10 border-y border-border py-7" aria-labelledby="external-skills-heading" data-external-skills lang={lang}>
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h2 id="external-skills-heading" className="font-display text-2xl">{zh ? '外部平台技能' : 'External platform skills'}</h2>
      <Link href={`/skills/external${suffix}`} className="text-sm text-[#006b4f] underline underline-offset-4">{zh ? '浏览外部目录' : 'Browse external directory'} →</Link>
    </div>
    <p className="mt-2 text-xs leading-6 text-secondary">{zh ? '站长精选的外部来源；不使用上方评分或兼容性筛选，不计入 GitHub 排行和自动安装结果。' : 'Owner-curated external sources. Not filtered by the scores or compatibility controls above; excluded from GitHub rankings and automatic installation.'}</p>
    {entries.map(entry => <article key={entry.slug} className="mt-5 border-t border-border pt-5">
      <p className="font-mono text-xs text-secondary">RedSkill · {entry.author.name} · {entry.version}</p>
      <h3 className="mt-2 text-lg font-semibold"><Link href={`${externalSkillHref(entry.slug)}${suffix}`} className="hover:text-[#006b4f]">{entry.title[lang]} →</Link></h3>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-secondary">{entry.description[lang]}</p>
      <p className="mt-3 text-xs font-medium">{zh ? '仅限非商业用途 · 未运行验证 · 前往原平台使用' : 'Noncommercial use only · Not runtime-verified · Use on the source platform'}</p>
    </article>)}
    {entries.length === 0 && <p className="mt-4 text-sm text-secondary">{zh ? '外部目录没有匹配此关键词的条目。' : 'No external entries match this query.'}</p>}
  </section>
}
