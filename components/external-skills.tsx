import Link from 'next/link'
import { externalSkillHref, searchExternalSkills } from '@/lib/skills/external-catalog'
import { externalSourceHref, externalSourceRel } from '@/lib/skills/external-outbound'

export const externalOutputLabels = {
  image: { en: 'Images', zh: '图像' },
  presentation: { en: 'Presentations', zh: '演示文稿' },
  html: { en: 'Web & HTML', zh: '网页与 HTML' },
}

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
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {entries.map(entry => <article key={entry.slug} className="flex flex-col rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs text-secondary">{entry.provider === 'skillry' ? 'Skillry' : 'RedSkill'} · v{entry.version}</p>
        {entry.provider === 'skillry' && <span className="rounded-full bg-[#006b4f]/10 px-2.5 py-1 text-xs font-medium text-[#006b4f]">{zh ? '免费' : 'Free'}</span>}
      </div>
      {entry.provider === 'skillry' && <p className="mt-4 text-xs text-secondary">{externalOutputLabels[entry.outputType][lang]}</p>}
      <h3 className="mt-2 text-lg font-semibold"><Link href={`${externalSkillHref(entry.slug)}${suffix}`} className="hover:text-[#006b4f]">{entry.title[lang]} →</Link></h3>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-secondary">{entry.description[lang]}</p>
      <div className="mt-auto pt-5">
        <p className="text-xs leading-6 text-secondary">{entry.provider === 'skillry' ? (zh ? '收录时免费 · 从 Skillry 获取' : 'Free at listing · Get from Skillry') : entry.runtimeDemo ? (zh ? '仅限非商业用途 · 附本地实测录像' : 'Noncommercial use only · Local runtime recording') : (zh ? '仅限非商业用途 · 未运行验证' : 'Noncommercial use only · Not runtime-verified')}</p>
        <a href={externalSourceHref(entry.sourceUrl)} target="_blank" rel={externalSourceRel(entry.sourceUrl)} className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-[#006b4f] underline-offset-4 hover:underline">{entry.provider === 'skillry' ? (zh ? '在 Skillry 获取' : 'Get on Skillry') : (zh ? '打开作者原帖' : 'Open the author’s post')} ↗</a>
      </div>
    </article>)}
    </div>
    {entries.length === 0 && <p className="mt-4 text-sm text-secondary">{zh ? '外部目录没有匹配此关键词的条目。' : 'No external entries match this query.'}</p>}
  </section>
}
