'use client'

import { submissionCopy } from '@/lib/i18n/submission-copy'

import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '@/lib/i18n/context'

interface SubmitFormProps {
  onSubmit: (data: SubmitFormData) => Promise<void>
}

export interface SubmitFormData {
  repository: string
  skillPath: string
  sourceRef?: string
  category?: string
  tags: string[]
  makerGithub?: string
  makerX?: string
  submissionSource: 'web'
}

interface SkillCandidate {
  name: string
  description: string
  path: string
  ref: string
  sourceUrl: string
}

interface ValidationResponse {
  valid?: boolean
  code?: string
  error?: string
  stars?: number
  repository?: { owner: string; fullName: string; stars: number }
  skills?: SkillCandidate[]
}

const DRAFT_KEY = 'openagentskill.submitDraft.v2'

const categories = [
  ['data-analysis', 'dataAnalysis'],
  ['code-generation', 'codeGeneration'],
  ['research', 'research'],
  ['automation', 'automation'],
  ['communication', 'communication'],
  ['creative', 'creative'],
  ['business', 'business'],
  ['developer-tools', 'developerTools'],
  ['security', 'security'],
  ['integration', 'integration'],
] as const

export function SkillSubmitForm({ onSubmit }: SubmitFormProps) {
  const { locale, t } = useI18n()
  const [repository, setRepository] = useState('')
  const [category, setCategory] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [makerGithub, setMakerGithub] = useState('')
  const [makerX, setMakerX] = useState('')
  const [candidates, setCandidates] = useState<SkillCandidate[]>([])
  const [selectedPath, setSelectedPath] = useState('')
  const [validating, setValidating] = useState(false)
  const [repoValid, setRepoValid] = useState<boolean | null>(null)
  const [repoStars, setRepoStars] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [draftLoaded, setDraftLoaded] = useState(false)

  const selectedCandidate = useMemo(
    () => candidates.find((candidate) => candidate.path === selectedPath) || null,
    [candidates, selectedPath]
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(DRAFT_KEY)
        if (raw) {
          const draft = JSON.parse(raw) as Partial<SubmitFormData>
          setRepository(draft.repository || '')
          setCategory(draft.category || '')
          setTags(Array.isArray(draft.tags) ? draft.tags.slice(0, 10) : [])
          setMakerGithub(draft.makerGithub || '')
          setMakerX(draft.makerX || '')
        }
      } catch {
        // Local drafts are a convenience and must never block the form.
      } finally {
        setDraftLoaded(true)
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!draftLoaded) return
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
        repository,
        category: category || undefined,
        tags,
        makerGithub: makerGithub || undefined,
        makerX: makerX || undefined,
      }))
    } catch {
      // Private browsing may disable localStorage.
    }
  }, [category, draftLoaded, makerGithub, makerX, repository, tags])

  function validationMessage(data: ValidationResponse) {
    if (data.code === 'MISSING_SKILL_FILE') {
      return submissionCopy(locale, "No valid SKILL.md with name and description was found. You can paste a skill directory or SKILL.md URL.", "没有找到包含 name 和 description 的有效 SKILL.md。也可以直接粘贴 Skill 目录或 SKILL.md 链接。")
    }
    if (data.code === 'INVALID_REPOSITORY') {
      return submissionCopy(locale, "Enter a GitHub repository, skill directory, or SKILL.md URL.", "请输入 GitHub 仓库、Skill 目录或 SKILL.md 链接。")
    }
    return data.error || (submissionCopy(locale, "Validation failed. Please try again.", "验证失败，请稍后重试。"))
  }

  async function validateRepo() {
    if (!repository.trim()) return
    setValidating(true)
    setError('')
    setCandidates([])
    setSelectedPath('')
    try {
      const response = await fetch('/api/skills/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repository }),
      })
      const data = await response.json() as ValidationResponse
      if (!response.ok || !data.valid || !data.skills?.length) {
        setRepoValid(false)
        setRepoStars(data.stars ?? null)
        setError(validationMessage(data))
        return
      }

      setRepoValid(true)
      setRepoStars(data.repository?.stars ?? data.stars ?? null)
      setCandidates(data.skills)
      setSelectedPath(data.skills[0].path)
      if (!makerGithub && data.repository?.owner) setMakerGithub(data.repository.owner)
    } catch {
      setRepoValid(false)
      setError(submissionCopy(locale, "Validation failed. Please try again.", "验证失败，请稍后重试。"))
    } finally {
      setValidating(false)
    }
  }

  function addTag() {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag) && tags.length < 10) setTags([...tags, tag])
    setTagInput('')
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!repoValid || !selectedCandidate) {
      setError(submissionCopy(locale, "Find and select a SKILL.md first.", "请先查找并选择一个 SKILL.md。"))
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await onSubmit({
        repository,
        skillPath: selectedCandidate.path,
        sourceRef: selectedCandidate.ref,
        category: category || undefined,
        tags,
        makerGithub: makerGithub || undefined,
        makerX: makerX || undefined,
        submissionSource: 'web',
      })
      try { window.localStorage.removeItem(DRAFT_KEY) } catch {}
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : (submissionCopy(locale, "Submission failed.", "提交失败。")))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-7">
      <div>
        <label htmlFor="repository" className="mb-2 block text-sm font-semibold">
          {submissionCopy(locale, "GitHub repository or SKILL.md URL", "GitHub 仓库或 SKILL.md 链接")}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="repository"
            type="text"
            value={repository}
            onChange={(event) => {
              setRepository(event.target.value)
              setRepoValid(null)
              setRepoStars(null)
              setCandidates([])
              setSelectedPath('')
              setError('')
            }}
            placeholder="https://github.com/owner/repo/tree/main/skills/my-skill"
            className="min-w-0 flex-1 border border-border bg-background px-4 py-3 text-sm focus:border-foreground focus:outline-none"
            required
          />
          <button
            type="button"
            onClick={validateRepo}
            disabled={validating || !repository.trim()}
            className="h-12 border border-foreground px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {validating ? (submissionCopy(locale, "Finding…", "查找中…")) : (submissionCopy(locale, "Find Skills", "查找 Skill"))}
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-secondary">
          {submissionCopy(locale, "Zero-star skills are welcome. A valid SKILL.md is required; README, category, and tags are not hard gates.", "0 Star 也可以提交。只要求有效的 SKILL.md；README、分类和标签不再是硬性门槛。")}
        </p>
        {repoStars !== null && (
          <p className="mt-2 font-mono text-xs text-secondary">
            {repoStars.toLocaleString(locale)} GitHub stars · {submissionCopy(locale, "ranking signal only", "仅作为排序信号")}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      {candidates.length > 0 && (
        <div>
          <label htmlFor="skill-path" className="mb-2 block text-sm font-semibold">
            {submissionCopy(locale, 'Choose SKILL.md ({count} found)', '选择 SKILL.md（发现 {count} 个）', { count: candidates.length })}
          </label>
          <select
            id="skill-path"
            value={selectedPath}
            onChange={(event) => setSelectedPath(event.target.value)}
            className="w-full border border-border bg-background px-4 py-3 text-sm focus:border-foreground focus:outline-none"
          >
            {candidates.map((candidate) => (
              <option key={`${candidate.ref}:${candidate.path}`} value={candidate.path}>
                {candidate.name} — {candidate.path}
              </option>
            ))}
          </select>
          {selectedCandidate && (
            <div className="mt-3 border border-border bg-card p-4">
              <p className="font-semibold">{selectedCandidate.name}</p>
              <p className="mt-1 text-sm leading-6 text-secondary">{selectedCandidate.description}</p>
              <p className="mt-2 break-all font-mono text-[11px] text-secondary">{selectedCandidate.sourceUrl}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="mb-2 block text-sm font-semibold">
            {submissionCopy(locale, "Category (optional)", "分类（选填）")}
          </label>
          <select id="category" value={category} onChange={(event) => setCategory(event.target.value)} className="w-full border border-border bg-background px-4 py-3 text-sm focus:border-foreground focus:outline-none">
            <option value="">{submissionCopy(locale, "Auto-detect", "自动识别")}</option>
            {categories.map(([value, key]) => <option key={value} value={value}>{t.submitPage.form.categories[key]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="tags" className="mb-2 block text-sm font-semibold">
            {submissionCopy(locale, "Tags (optional)", "标签（选填）")}
          </label>
          <div className="flex gap-2">
            <input
              id="tags"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTag() } }}
              placeholder={submissionCopy(locale, "Auto-filled when empty", "留空则自动补全")}
              className="min-w-0 flex-1 border border-border bg-background px-3 py-3 text-sm focus:border-foreground focus:outline-none"
            />
            <button type="button" onClick={addTag} className="border border-border px-3 text-sm">+</button>
          </div>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button key={tag} type="button" onClick={() => setTags(tags.filter((item) => item !== tag))} className="border border-border px-3 py-1 text-xs">
              {tag} ×
            </button>
          ))}
        </div>
      )}

      <fieldset className="border border-border bg-card p-5">
        <legend className="px-2 font-mono text-xs uppercase tracking-[0.18em] text-secondary">
          {submissionCopy(locale, "Maker identity (optional)", "Maker 身份（选填）")}
        </legend>
        <p className="mb-4 text-xs leading-5 text-secondary">
          {submissionCopy(locale, "Handles create public profile links but do not grant a verified badge. Verification requires OAuth or repository ownership proof.", "填写账号会创建公开资料链接，但不会自动获得“已验证”标记。认证需要 OAuth 或仓库所有权证明。")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="maker-github" className="mb-1.5 block text-xs font-semibold">GitHub</label>
            <div className="flex border border-border bg-background">
              <span className="px-3 py-2.5 text-sm text-secondary">@</span>
              <input id="maker-github" value={makerGithub} onChange={(event) => setMakerGithub(event.target.value.replace(/^@/, ''))} maxLength={39} className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-sm focus:outline-none" placeholder="octocat" />
            </div>
          </div>
          <div>
            <label htmlFor="maker-x" className="mb-1.5 block text-xs font-semibold">X</label>
            <div className="flex border border-border bg-background">
              <span className="px-3 py-2.5 text-sm text-secondary">@</span>
              <input id="maker-x" value={makerX} onChange={(event) => setMakerX(event.target.value.replace(/^@/, ''))} maxLength={15} className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-sm focus:outline-none" placeholder="maker" />
            </div>
          </div>
        </div>
      </fieldset>

      <div className="border border-border p-4 text-xs leading-5 text-secondary">
        {submissionCopy(locale, "Submissions are saved to the community queue first, then reviewed asynchronously. Only Reviewed, Verified, or Agent Proven skills enter default Agent recommendations.", "提交会先保存到社区队列，再异步执行安全与质量审核。只有 Reviewed、Verified 或 Agent Proven Skill 才会进入默认 Agent 推荐。")}
      </div>

      <button type="submit" disabled={!repoValid || !selectedCandidate || submitting} className="w-full bg-foreground px-6 py-3 font-semibold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40">
        {submitting ? (submissionCopy(locale, "Saving…", "正在保存…")) : (submissionCopy(locale, "Submit to community queue", "提交到社区队列"))}
      </button>
    </form>
  )
}
