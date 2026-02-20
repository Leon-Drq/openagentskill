'use client'

import { useState } from 'react'
import { parseGitHubUrl } from '@/lib/github/api'

interface SubmitFormProps {
  onSubmit: (data: SubmitFormData) => Promise<void>
}

export interface SubmitFormData {
  repository: string
  category: string
  tags: string[]
  submissionSource: 'web' | 'api' | 'agent'
}

const categories = [
  { value: 'data-analysis', label: '数据分析' },
  { value: 'code-generation', label: '代码生成' },
  { value: 'research', label: '研究助手' },
  { value: 'automation', label: '自动化' },
  { value: 'communication', label: '沟通协作' },
  { value: 'creative', label: '创意工具' },
  { value: 'business', label: '商业工具' },
  { value: 'developer-tools', label: '开发工具' },
  { value: 'security', label: '安全' },
  { value: 'integration', label: '集成' },
]

export function SkillSubmitForm({ onSubmit }: SubmitFormProps) {
  const [repository, setRepository] = useState('')
  const [category, setCategory] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [validating, setValidating] = useState(false)
  const [repoValid, setRepoValid] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const validateRepo = async (repoUrl: string) => {
    if (!repoUrl) {
      setRepoValid(null)
      return
    }

    const parsed = parseGitHubUrl(repoUrl)
    if (!parsed) {
      setRepoValid(false)
      setError('请输入有效的 GitHub 仓库 URL 或 owner/repo 格式')
      return
    }

    setValidating(true)
    setError('')

    try {
      const response = await fetch('/api/skills/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repository: repoUrl }),
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        setRepoValid(true)
        setError('')
      } else {
        setRepoValid(false)
        setError(data.error || '仓库验证失败')
      }
    } catch (err) {
      setRepoValid(false)
      setError('验证失败，请稍后重试')
    } finally {
      setValidating(false)
    }
  }

  const handleRepoChange = (value: string) => {
    setRepository(value)
    setRepoValid(null)
    setError('')
  }

  const handleRepoBlur = () => {
    validateRepo(repository)
  }

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!repoValid) {
      setError('请先验证 GitHub 仓库')
      return
    }

    if (!category) {
      setError('请选择分类')
      return
    }

    if (tags.length === 0) {
      setError('请至少添加一个标签')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await onSubmit({
        repository,
        category,
        tags,
        submissionSource: 'web',
      })
    } catch (err: any) {
      setError(err.message || '提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8">
      {/* GitHub Repository */}
      <div>
        <label htmlFor="repository" className="block text-sm font-semibold mb-2">
          GitHub 仓库
        </label>
        <input
          id="repository"
          type="text"
          value={repository}
          onChange={(e) => handleRepoChange(e.target.value)}
          onBlur={handleRepoBlur}
          placeholder="https://github.com/owner/repo 或 owner/repo"
          className="w-full border border-border bg-background px-4 py-3 text-base font-serif focus:border-foreground focus:outline-none"
          required
        />
        {validating && (
          <p className="mt-2 text-sm text-secondary">验证中...</p>
        )}
        {repoValid === true && (
          <p className="mt-2 text-sm text-foreground">✓ 仓库验证成功</p>
        )}
        {repoValid === false && error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-semibold mb-2">
          分类
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border border-border bg-background px-4 py-3 text-base font-serif focus:border-foreground focus:outline-none"
          required
        >
          <option value="">选择分类</option>
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="block text-sm font-semibold mb-2">
          标签（最多 10 个）
        </label>
        <div className="flex gap-2 mb-2">
          <input
            id="tags"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
            placeholder="输入标签后按回车"
            className="flex-1 border border-border bg-background px-4 py-2 text-sm font-serif focus:border-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2 border border-foreground text-sm hover:bg-muted transition-colors"
          >
            添加
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-2 px-3 py-1 border border-border text-sm"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-destructive"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={!repoValid || submitting}
          className="w-full px-6 py-3 border-2 border-foreground bg-foreground text-background font-semibold hover:bg-background hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '提交中...' : '提交技能'}
        </button>
      </div>

      {error && !repoValid && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </form>
  )
}
