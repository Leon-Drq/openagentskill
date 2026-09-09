'use client'

import { useEffect, useRef, useState } from 'react'
import { NativeSelect } from '@/components/ui/native-select'
import { submissionCopy } from '@/lib/i18n/submission-copy'
import { submissionFlowCopy } from '@/lib/i18n/submission-flow-copy'
import { useI18n } from '@/lib/i18n/context'
import { normalizeSocialHandle, validSocialHandle, SUBMISSION_BATCH_LIMIT } from '@/lib/skills/submission-contract'

export interface SubmitFormData {
  repository: string; skillPath: string; sourceRef?: string; category?: string; tags: string[]
  makerGithub?: string; makerX?: string; submissionSource: 'web'
}
interface SkillCandidate { name: string; description: string; path: string; ref: string; sourceUrl: string }
const DRAFT_KEY = 'openagentskill.submitDraft.v2'
const categories = [['data-analysis', 'dataAnalysis'], ['code-generation', 'codeGeneration'], ['research', 'research'], ['automation', 'automation'], ['communication', 'communication'], ['creative', 'creative'], ['business', 'business'], ['developer-tools', 'developerTools'], ['security', 'security'], ['integration', 'integration']] as const

export function SkillSubmitForm({ onSubmit }: { onSubmit: (data: SubmitFormData[]) => Promise<void> }) {
  const { locale, t } = useI18n()
  const c = (key: Parameters<typeof submissionFlowCopy>[1]) => submissionFlowCopy(locale, key)
  const [repository, setRepository] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [makerGithub, setMakerGithub] = useState('')
  const [makerX, setMakerX] = useState('')
  const [candidates, setCandidates] = useState<SkillCandidate[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [pagination, setPagination] = useState({ hasMore: false, nextOffset: 0, truncated: false, total: 0 })
  const [validating, setValidating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [draftLoaded, setDraftLoaded] = useState(false)
  const request = useRef<AbortController | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const generation = useRef(0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}')
        if (typeof draft.repository === 'string') setRepository(draft.repository)
        if (typeof draft.category === 'string') setCategory(draft.category)
        if (Array.isArray(draft.tags)) setTags(draft.tags.filter((tag: unknown) => typeof tag === 'string').slice(0, 10))
        if (typeof draft.makerGithub === 'string') setMakerGithub(draft.makerGithub)
        if (typeof draft.makerX === 'string') setMakerX(draft.makerX)
      } catch { /* Storage is optional. */ }
      setDraftLoaded(true)
    }, 0)
    return () => { clearTimeout(timer); request.current?.abort() }
  }, [])
  useEffect(() => {
    if (!draftLoaded) return
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ repository, category, tags, makerGithub, makerX })) } catch { /* Private browsing. */ }
  }, [draftLoaded, repository, category, tags, makerGithub, makerX])

  function resetSource(value: string) {
    generation.current++
    request.current?.abort()
    setRepository(value); setCandidates([]); setSelected([]); setError(''); setValidating(false)
    setQuery(''); setAppliedQuery('')
    setPagination({ hasMore: false, nextOffset: 0, truncated: false, total: 0 })
  }

  async function validateRepo(loadMore = false) {
    if (!repository.trim()) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    const version = ++generation.current
    const timeout = setTimeout(() => controller.abort(), 45_000)
    setValidating(true); setError('')
    if (!loadMore) { setCandidates([]); setSelected([]) }
    try {
      const response = await fetch('/api/skills/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repository, query: loadMore ? appliedQuery : query, offset: loadMore ? pagination.nextOffset : 0 }), signal: controller.signal })
      const data = await response.json()
      if (version !== generation.current) return
      if (!response.ok || !data.valid) {
        setError(response.status === 429 ? c('rate') : data.code === 'MISSING_SKILL_FILE'
          ? submissionCopy(locale, 'No valid SKILL.md with name and description was found. You can paste a skill directory or SKILL.md URL.', '没有找到包含 name 和 description 的有效 SKILL.md。也可以直接粘贴 Skill 目录或 SKILL.md 链接。')
          : data.code === 'INVALID_REPOSITORY' ? submissionCopy(locale, 'Enter a GitHub repository, skill directory, or SKILL.md URL.', '请输入 GitHub 仓库、Skill 目录或 SKILL.md 链接。')
          : submissionCopy(locale, 'Validation failed. Please try again.', '验证失败，请稍后重试。'))
        return
      }
      const found = (data.skills || []) as SkillCandidate[]
      if (!loadMore) setAppliedQuery(query)
      setCandidates(previous => loadMore ? [...previous, ...found.filter(item => !previous.some(old => old.path === item.path))] : found)
      if (!loadMore && found.length) setSelected([found[0].path])
      setPagination({ hasMore: Boolean(data.hasMore), nextOffset: data.nextOffset || 0, truncated: Boolean(data.treeTruncated), total: data.totalPaths || found.length })
    } catch {
      if (version === generation.current) setError(submissionCopy(locale, 'Validation failed. Please try again.', '验证失败，请稍后重试。'))
    } finally {
      clearTimeout(timeout)
      if (version === generation.current) setValidating(false)
    }
  }

  function addTag() {
    const tag = tagInput.trim()
    if (!tag) return
    if (tag.length > 40 || tags.length >= 10) { setFields(previous => ({ ...previous, tags: c('tagsError') })); return }
    setTags(previous => previous.includes(tag) ? previous : [...previous, tag]); setTagInput('')
    setFields(previous => ({ ...previous, tags: '' }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    const github = normalizeSocialHandle(makerGithub, 'github')
    const x = normalizeSocialHandle(makerX, 'x')
    const allTags = [...new Set([...tags, ...(tagInput.trim() ? [tagInput.trim()] : [])])]
    const errors: Record<string, string> = {}
    if (!validSocialHandle(github, 'github')) errors.makerGithub = c('githubError')
    if (!validSocialHandle(x, 'x')) errors.makerX = c('xError')
    if (allTags.length > 10 || allTags.some(tag => tag.length > 40)) errors.tags = c('tagsError')
    setFields(errors)
    if (Object.keys(errors).length) {
      const details = formRef.current?.querySelector('details')
      if (details) details.open = true
      setTimeout(() => formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus(), 0)
      return
    }
    const chosen = candidates.filter(item => selected.includes(item.path)).slice(0, SUBMISSION_BATCH_LIMIT)
    if (!chosen.length) return
    setSubmitting(true); setError('')
    try {
      await onSubmit(chosen.map(candidate => ({ repository, skillPath: candidate.path, sourceRef: candidate.ref,
        category: category || undefined, tags: allTags, makerGithub: github || undefined, makerX: x || undefined, submissionSource: 'web' })))
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* Storage is optional. */ }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : c('failed'))
    } finally { setSubmitting(false) }
  }
  const inputClass = 'min-w-0 w-full border border-border bg-background px-4 py-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

  return <form ref={formRef} onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
    <div>
      <label htmlFor="repository" className="mb-2 block text-sm font-semibold">{submissionCopy(locale, 'GitHub repository or SKILL.md URL', 'GitHub 仓库或 SKILL.md 链接')}</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id="repository" value={repository} onChange={e => resetSource(e.target.value)} disabled={submitting} required className={inputClass} placeholder="https://github.com/owner/repo" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void validateRepo() } }} />
        <button type="button" disabled={validating || submitting || !repository.trim()} onClick={() => validateRepo()} className="shrink-0 border border-foreground px-5 py-3 text-sm font-semibold disabled:opacity-40">{validating ? submissionCopy(locale, 'Finding…', '查找中…') : submissionCopy(locale, 'Find Skills', '查找 Skill')}</button>
      </div>
      <p className="mt-2 text-xs leading-5 text-secondary">{submissionCopy(locale, 'Zero-star skills are welcome. A valid SKILL.md is required; README, category, and tags are not hard gates.', '0 Star 也可以提交。只要求有效的 SKILL.md；README、分类和标签不再是硬性门槛。')}</p>
    </div>
    {(candidates.length > 0 || pagination.hasMore) && <section className="space-y-3" aria-label={submissionCopy(locale, 'Choose SKILL.md ({count} found)', '选择 SKILL.md（发现 {count} 个）', { count: candidates.length })}>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 text-xs" htmlFor="path-filter">{c('pathSearch')}<input id="path-filter" className={`${inputClass} mt-2`} value={query} disabled={submitting} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void validateRepo() } }} /></label>
        <button type="button" onClick={() => validateRepo()} disabled={submitting || validating} className="border px-4 py-3 text-sm">{submissionCopy(locale, 'Find Skills', '查找 Skill')}</button>
      </div>
      <p className="font-mono text-xs text-secondary">{c('selection')} {selected.length}/{SUBMISSION_BATCH_LIMIT} · {candidates.length}/{pagination.total}</p>
      <div className="max-h-96 overflow-y-auto border border-border divide-y divide-border">
        {candidates.map(candidate => <label key={candidate.path} className="flex cursor-pointer items-start gap-3 p-4 has-checked:bg-primary/5">
          <input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" checked={selected.includes(candidate.path)} disabled={submitting || (!selected.includes(candidate.path) && selected.length >= SUBMISSION_BATCH_LIMIT)} onChange={e => setSelected(previous => e.target.checked ? [...previous, candidate.path] : previous.filter(path => path !== candidate.path))} />
          <span className="min-w-0"><strong className="block text-sm">{candidate.name}</strong><span className="mt-1 block break-words text-xs leading-5 text-secondary">{candidate.description}</span><span className="mt-2 block break-all font-mono text-[11px] text-secondary">{candidate.path}</span></span>
        </label>)}
      </div>
      {pagination.hasMore && <button type="button" onClick={() => validateRepo(true)} disabled={validating || submitting} className="border px-4 py-2.5 text-sm">{c('more')}</button>}
      {(pagination.hasMore || pagination.truncated) && <p className="text-xs leading-5 text-secondary">{c('capped')}</p>}
    </section>}
    <details className="border-y border-border py-4">
      <summary className="cursor-pointer text-sm font-semibold">{c('optional')}</summary>
      <fieldset disabled={submitting} className="mt-5 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor="category" className="text-sm">{submissionCopy(locale, 'Category (optional)', '分类（选填）')}<NativeSelect id="category" value={category} onChange={e => setCategory(e.target.value)} className="mt-2 w-full"><option value="">{submissionCopy(locale, 'Auto-detect', '自动识别')}</option>{categories.map(([value, key]) => <option key={value} value={value}>{t.submitPage.form.categories[key]}</option>)}</NativeSelect></label>
          <div><label htmlFor="tags" className="text-sm">{submissionCopy(locale, 'Tags (optional)', '标签（选填）')}</label><div className="mt-2 flex gap-2"><input id="tags" className={inputClass} value={tagInput} onChange={e => setTagInput(e.target.value)} aria-invalid={Boolean(fields.tags)} aria-describedby={fields.tags ? 'tags-error' : undefined} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} /><button type="button" onClick={addTag} className="border px-3" aria-label={submissionCopy(locale, 'Tags (optional)', '标签（选填）')}>+</button></div>{fields.tags && <p id="tags-error" role="alert" className="mt-2 text-xs text-destructive">{fields.tags}</p>}</div>
        </div>
        {tags.length > 0 && <div className="flex flex-wrap gap-2">{tags.map(tag => <button type="button" key={tag} onClick={() => setTags(tags.filter(item => item !== tag))} className="border px-3 py-1 text-xs">{tag} ×</button>)}</div>}
        <div className="border-t pt-4"><p className="text-sm font-semibold">{c('yourIdentity')}</p><p className="mt-2 text-xs leading-5 text-secondary">{c('identityHint')}</p></div>
        <div className="grid gap-4 sm:grid-cols-2">{(['github', 'x'] as const).map(provider => {
          const key = provider === 'github' ? 'makerGithub' : 'makerX'
          return <div key={provider}><label htmlFor={key} className="mb-2 block text-xs font-semibold">{provider === 'github' ? 'GitHub' : 'X'}</label><input id={key} className={inputClass} value={provider === 'github' ? makerGithub : makerX} onChange={e => provider === 'github' ? setMakerGithub(e.target.value) : setMakerX(e.target.value)} maxLength={200} placeholder={provider === 'github' ? '@octocat / https://github.com/octocat' : '@maker / https://x.com/maker'} aria-invalid={Boolean(fields[key])} aria-describedby={fields[key] ? `${key}-error` : undefined} />{fields[key] && <p id={`${key}-error`} role="alert" className="mt-2 text-xs text-destructive">{fields[key]}</p>}</div>
        })}</div>
      </fieldset>
    </details>
    <p className="text-xs leading-5 text-secondary">{c('limits')}</p>
    {error && <p role="alert" className="border-l-2 border-destructive pl-3 text-sm text-destructive">{error}</p>}
    <button type="submit" disabled={!selected.length || validating || submitting} className="w-full bg-primary px-6 py-3.5 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">{submitting ? submissionCopy(locale, 'Saving…', '正在保存…') : submissionCopy(locale, 'Submit to community queue', '提交到社区队列')}</button>
  </form>
}
