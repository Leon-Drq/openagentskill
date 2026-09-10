'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Search, Copy, Check, SlidersHorizontal } from 'lucide-react'
import { NativeSelect } from '@/components/ui/native-select'
import { GitHubOwnerAvatar } from '@/components/github-owner-avatar'
import { useI18n } from '@/lib/i18n/context'
import { getLocalizedNavigationHref } from '@/lib/i18n/market-routing'
import type { Locale } from '@/lib/i18n/config'
import type { ResolveWebResponse } from '@/lib/resolve-web-response'

type Result = ResolveWebResponse
type Candidate = NonNullable<Result['selected']>
const labels = {
  en: ['Find your next skill.', 'Describe a task or skill name', 'Find Skills', 'All agents', 'Advanced filters', 'Recommended match', 'Other matches', 'View details', 'Copy for AI', 'Copied', 'Copy failed — try again', 'Review before install', 'Source recorded', 'Why this matches', 'Searching for matching skills…', 'No eligible match yet', 'Try a specific outcome, such as “design a brand logo”.', 'Search is temporarily unavailable.', 'Try again', 'Candidates to investigate', 'These are not installation recommendations.', 'Browse skills', 'Use public task descriptions only. Do not include secrets or customer data.', 'Choose your agent', 'Source & review', 'Related use cases', 'Minimum GitHub stars', 'Maximum risk', 'Low', 'Medium', 'Find a skill, review the source, then bring it to your AI.'],
  zh: ['找到合适的技能。', '描述需求或输入技能名称', '找技能', '全部 Agent', '高级筛选', '推荐匹配', '其他匹配', '查看详情', '复制给 AI', '已复制', '复制失败，请重试', '安装前需审核', '已记录来源', '匹配原因', '正在查找匹配的技能…', '暂未找到符合条件的技能', '试着描述具体目标，例如“设计一个品牌 Logo”。', '搜索服务暂时不可用。', '重试', '待核查候选', '以下仅供进一步研究，不是安装推荐。', '浏览技能', '只输入公开需求，请勿包含密钥或客户隐私信息。', '选择你的 Agent', '来源与审核', '相关用途', '最低 GitHub Star 数', '最高风险等级', '低', '中', '找到技能，查看来源，再交给你的 AI 使用。'],
} as const
const controlLabels: Partial<Record<Locale, string[]>> = {
  ja: ['次のスキルを見つける。', 'タスクまたはスキル名', 'スキルを検索', 'すべての Agent', '詳細フィルター', 'おすすめ', 'その他の候補', '詳細を見る', 'AI 用にコピー'],
  ko: ['필요한 스킬을 찾으세요.', '작업 또는 스킬 이름', '스킬 찾기', '모든 Agent', '상세 필터', '추천 결과', '다른 결과', '상세 보기', 'AI용 복사'],
  es: ['Encuentra tu próximo skill.', 'Describe una tarea o un skill', 'Buscar skills', 'Todos los agentes', 'Filtros avanzados', 'Recomendado', 'Otras coincidencias', 'Ver detalles', 'Copiar para IA'],
  de: ['Finde deinen nächsten Skill.', 'Aufgabe oder Skill beschreiben', 'Skills suchen', 'Alle Agents', 'Weitere Filter', 'Empfehlung', 'Weitere Treffer', 'Details ansehen', 'Für KI kopieren'],
  fr: ['Trouvez votre prochain skill.', 'Décrivez une tâche ou un skill', 'Chercher', 'Tous les agents', 'Filtres avancés', 'Recommandation', 'Autres résultats', 'Voir les détails', 'Copier pour l’IA'],
  id: ['Temukan skill berikutnya.', 'Deskripsikan tugas atau nama skill', 'Cari skill', 'Semua agent', 'Filter lanjutan', 'Rekomendasi', 'Hasil lainnya', 'Lihat detail', 'Salin untuk AI'],
}
const field = 'min-h-11 rounded-md border border-[#d8d2c6] bg-[#fffdf8] px-3 text-sm'
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#d8d2c6] px-4 text-sm font-medium transition-colors hover:border-[#006b4f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006b4f]'

export function ResolveResults({ task, agent: initialAgent = 'auto', risk = 'medium', minStars = 0, initialLocale, initialResult, initialError = false }: { task: string; agent?: string; risk?: string; minStars?: number; initialLocale?: Locale; initialResult?: Result | null; initialError?: boolean }) {
  const { locale: contextLocale } = useI18n()
  const locale = initialLocale || contextLocale
  const c = (i: number) => controlLabels[locale]?.[i] || (locale === 'zh' ? labels.zh : labels.en)[i]
  const href = (path: string) => getLocalizedNavigationHref(path, locale)
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState(task)
  const [agent, setAgent] = useState(initialAgent)
  const [maxRisk, setMaxRisk] = useState(risk)
  const [stars, setStars] = useState(minStars)
  const [attempt, setAttempt] = useState(0)
  const [loading, setLoading] = useState(Boolean(task) && initialResult === undefined && !initialError)
  const [result, setResult] = useState<Result | null>(initialResult || null)
  const [error, setError] = useState(initialError)
  const [copyTarget, setCopyTarget] = useState<string | null>(null)
  const [copyAgent, setCopyAgent] = useState(initialAgent === 'auto' ? 'codex' : initialAgent)
  const [copyState, setCopyState] = useState('')

  useEffect(() => {
    if (!task || (attempt === 0 && (initialResult !== undefined || initialError))) return
    const controller = new AbortController()
    let ignore = false
    const timeout = setTimeout(() => controller.abort(), 15000)
    fetch('/api/agent/resolve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ task, agent: initialAgent, limit: 5, format: 'web', constraints: { max_risk: risk, min_stars: minStars, needs_install_command: true } }),
    }).then(async response => {
      if (!response.ok) throw new Error('Search unavailable')
      const data = await response.json()
      if (!data.policy_decision || !Array.isArray(data.alternatives)) throw new Error('Invalid search response')
      if (!data.selected && data.meta?.registry_status === 'snapshot_only') throw new Error('Registry unavailable')
      if (!ignore) setResult(data)
    }).catch(() => { if (!ignore) setError(true) }).finally(() => { clearTimeout(timeout); if (!ignore) setLoading(false) })
    return () => { ignore = true; clearTimeout(timeout); controller.abort() }
  }, [task, initialAgent, risk, minStars, attempt, initialResult, initialError])

  function retry() { setError(false); setResult(null); setLoading(true); setAttempt(value => value + 1) }
  function search() {
    if (!query.trim()) return
    if (query.trim() === task && agent === initialAgent && maxRisk === risk && stars === minStars) { retry(); return }
    const params = new URLSearchParams({ task: query.trim() })
    if (agent !== 'auto') params.set('agent', agent)
    if (maxRisk !== 'medium') params.set('max_risk', maxRisk)
    if (stars > 0) params.set('min_stars', String(stars))
    startTransition(() => router.push(href(`/resolve?${params}`), { scroll: false }))
  }
  async function copy(candidate: Candidate) {
    try {
      await navigator.clipboard.writeText(`Help me evaluate ${candidate.skill.name} for ${copyAgent}. Read https://www.openagentskill.com/skills/${candidate.skill.slug} and its source and audit first. Explain requirements and risks, then ask before installing or changing files. Do not treat listing or source metadata as proof of safety or successful execution.`)
      setCopyState(c(9))
    } catch { setCopyState(c(10)) }
  }
  function card(candidate: Candidate, featured = false) {
    const repo = candidate.skill.repository || candidate.skill.github_repo || ''
    const owner = repo.replace(/^https?:\/\/github.com\//, '').split('/')[0]
    return <article key={candidate.skill.slug} className={featured ? 'rounded-xl border border-[#d8d2c6] border-t-2 border-t-[#006b4f] bg-[#fffdf8] p-6 sm:p-8' : 'border-b border-[#e4e0d8] py-7'}>
      <div className="flex min-w-0 items-start gap-4">
        <GitHubOwnerAvatar owner={owner} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="mb-1 font-mono text-xs text-[#6d675e]">{owner ? `@${owner}` : 'GitHub'}</p>
          <h2 className={`${featured ? 'text-3xl sm:text-4xl' : 'text-2xl'} break-words font-display font-normal`}><Link href={href(`/skills/${candidate.skill.slug}`)} className="hover:text-[#006b4f]">{candidate.skill.name}</Link></h2>
        </div>
        {featured && <span className="hidden rounded-full bg-[#e8f1ed] px-3 py-1.5 text-xs text-[#006b4f] sm:block">{c(5)}</span>}
      </div>
      <p className={`mt-5 max-w-3xl text-base leading-7 text-[#5f5a52] ${featured ? 'line-clamp-3' : 'line-clamp-2'}`}>{candidate.skill.description}</p>
      {featured && candidate.recommendation_reasons.length > 0 && <div className="mt-5 border-l-2 border-[#bfd6c9] pl-4"><p className="text-xs font-medium text-[#006b4f]">{c(13)}</p><p className="mt-1 text-sm leading-6 text-[#5f5a52]">{candidate.recommendation_reasons[0]}</p></div>}
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#6d675e]">
        <span>★ {candidate.skill.github_stars.toLocaleString()} GitHub</span><span>{c(12)}</span><span>{c(11)}</span>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={href(`/skills/${candidate.skill.slug}`)} className={`${button} ${featured ? 'border-[#006b4f] bg-[#006b4f] text-white hover:bg-[#005640]' : ''}`}>{c(7)}<ArrowRight size={15} /></Link>
        <button type="button" className={button} onClick={() => { setCopyTarget(copyTarget === candidate.skill.slug ? null : candidate.skill.slug); setCopyState('') }} aria-expanded={copyTarget === candidate.skill.slug}><Copy size={14} />{c(8)}</button>
      </div>
      {copyTarget === candidate.skill.slug && <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-[#f3f1eb] p-4">
        <label className="text-sm">{c(23)}<NativeSelect className={`${field} ml-3`} value={copyAgent} onChange={event => { setCopyAgent(event.target.value); setCopyState('') }}><option value="codex">Codex</option><option value="claude-code">Claude Code</option><option value="cursor">Cursor</option><option value="other">Other</option></NativeSelect></label>
        <button type="button" className={button} onClick={() => void copy(candidate)}>{copyState === c(9) ? <Check size={14} /> : <Copy size={14} />}{c(8)}</button><span role="status" className="text-xs">{copyState}</span>
      </div>}
      <details className="mt-5 text-xs text-[#6d675e]"><summary className="w-fit cursor-pointer py-2">{c(24)}</summary><p className="mt-2 max-w-3xl leading-6">{candidate.source_evidence.notice}</p><Link href={href(`/skills/${candidate.skill.slug}/audit`)} className="mt-2 inline-block underline underline-offset-4">{c(24)} ↗</Link></details>
    </article>
  }

  return <div className="mx-auto max-w-5xl px-6 pb-20 pt-10 sm:pt-14">
    <Link href={href('/skills')} className="text-xs text-[#6d675e] hover:text-[#006b4f]">← {c(21)}</Link>
    <h1 className={`${task ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-6xl'} mt-6 font-display font-normal`}>{task ? c(2) : c(0)}</h1>
    {!task && <p className="mt-4 text-[#5f5a52]">{c(30)}</p>}
    <form role="search" aria-label={c(2)} onSubmit={event => { event.preventDefault(); search() }} className="mt-7">
      <div className="flex gap-2 rounded-lg border border-[#d8d2c6] bg-[#fffdf8] p-2 focus-within:ring-2 focus-within:ring-[#006b4f]/20">
        <Search size={20} className="my-auto ml-3 hidden shrink-0 text-[#6d675e] sm:block" />
        <input aria-label={c(1)} type="search" maxLength={2000} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }} placeholder={c(1)} className="min-w-0 flex-1 bg-transparent px-2 py-3 text-base outline-none" />
        <button disabled={!query.trim() || pending} className="min-h-12 shrink-0 rounded-md bg-[#006b4f] px-4 text-sm font-semibold text-white disabled:opacity-50 sm:px-6">{c(2)}</button>
      </div>
      <p className="mt-2 text-xs text-[#6d675e]">{c(22)}</p>
      <div className="mt-4 flex flex-wrap items-start gap-3">
        <NativeSelect aria-label={c(23)} className={field} value={agent} onChange={event => setAgent(event.target.value)}><option value="auto">{c(3)}</option><option value="codex">Codex</option><option value="claude-code">Claude Code</option><option value="cursor">Cursor</option></NativeSelect>
        <details className="max-w-full"><summary className={`${button} cursor-pointer list-none`}><SlidersHorizontal size={14} />{c(4)}</summary><div className="mt-3 flex flex-wrap gap-4 rounded-lg border border-[#e4e0d8] p-4">
          <label className="flex flex-col gap-2 text-xs">{c(26)}<input type="number" min={0} max={1000000} value={stars} onChange={event => setStars(Math.max(0, Math.min(1000000, Number(event.target.value) || 0)))} className={`${field} w-36`} /></label>
          <label className="flex flex-col gap-2 text-xs">{c(27)}<NativeSelect value={maxRisk} onChange={event => setMaxRisk(event.target.value)} className={field}><option value="low">{c(28)}</option><option value="medium">{c(29)}</option></NativeSelect></label>
        </div></details>
      </div>
    </form>
    <div aria-live="polite" aria-busy={loading || pending} className="mt-9">
      {(loading || pending) ? <div role="status"><p className="mb-5 text-sm text-[#6d675e]">{c(14)}</p><div aria-hidden="true" className="rounded-xl border border-[#e4e0d8] p-8 motion-safe:animate-pulse"><div className="h-8 w-2/3 rounded bg-[#e4e0d8]" /><div className="mt-6 h-4 w-full rounded bg-[#e4e0d8]" /><div className="mt-3 h-4 w-4/5 rounded bg-[#e4e0d8]" /><div className="mt-8 h-11 w-36 rounded bg-[#e4e0d8]" /></div></div>
      : error ? <div role="alert" className="rounded-xl border border-[#e4e0d8] p-8"><h2 className="text-xl">{c(17)}</h2><button type="button" onClick={retry} className={`${button} mt-5`}>{c(18)}</button></div>
      : result ? <>
        {result.selected ? card(result.selected, true) : <div className="rounded-xl border border-dashed border-[#d8d2c6] p-8"><h2 className="font-display text-2xl">{c(15)}</h2><p className="mt-3 text-sm text-[#5f5a52]">{c(16)}</p></div>}
        {result.alternatives.length > 0 && <section className="mt-10"><h2 className="text-xs uppercase tracking-widest text-[#6d675e]">{c(6)}</h2>{result.alternatives.map(item => card(item))}</section>}
        {result.review_candidates.length > 0 && <details className="mt-9 border-t border-[#e4e0d8] pt-5"><summary className="cursor-pointer text-sm">{c(19)} · {result.review_candidates.length}</summary><p className="mt-3 text-xs text-[#6d675e]">{c(20)}</p><ul className="mt-3 space-y-3">{result.review_candidates.map(item => <li key={item.skill.slug}><Link href={href(`/skills/${item.skill.slug}`)} className="text-sm text-[#006b4f] hover:underline">{item.skill.name} ↗</Link></li>)}</ul></details>}
        {result.selected?.use_cases.length ? <div className="mt-8 flex flex-wrap gap-3 text-xs"><span className="text-[#6d675e]">{c(25)}</span>{result.selected.use_cases.map(item => <Link className="text-[#006b4f] hover:underline" key={item.slug} href={href(`/use-cases/${item.slug}`)}>{item.title} ↗</Link>)}</div> : null}
      </> : <div className="flex flex-wrap gap-3">{['logo', 'web scraping', 'presentation'].map(example => <Link key={example} href={href(`/resolve?task=${encodeURIComponent(example)}`)} className={button}>{example}<ArrowRight size={14} /></Link>)}</div>}
    </div>
    <div className="mt-14 flex flex-wrap gap-6 border-t border-[#e4e0d8] pt-6 text-xs text-[#6d675e]"><Link href={href('/use-cases')}>{c(25)} ↗</Link><Link href={href('/agent/integration-kit')}>Connect my AI ↗</Link><Link href={href('/api-docs')}>Registry API ↗</Link></div>
  </div>
}
