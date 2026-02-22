'use client'

import { useState } from 'react'
import { parseGitHubUrl } from '@/lib/github/api'
import { useI18n } from '@/lib/i18n/context'

interface SubmitFormProps {
  onSubmit: (data: SubmitFormData) => Promise<void>
}

export interface SubmitFormData {
  repository: string
  category: string
  tags: string[]
  submissionSource: 'web' | 'api' | 'agent'
}

export function SkillSubmitForm({ onSubmit }: SubmitFormProps) {
  const { t } = useI18n()
  const [repository, setRepository] = useState('')
  const [category, setCategory] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [validating, setValidating] = useState(false)
  const [repoValid, setRepoValid] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const categories = [
    { value: 'data-analysis', label: t.submitPage.form.categories.dataAnalysis },
    { value: 'code-generation', label: t.submitPage.form.categories.codeGeneration },
    { value: 'research', label: t.submitPage.form.categories.research },
    { value: 'automation', label: t.submitPage.form.categories.automation },
    { value: 'communication', label: t.submitPage.form.categories.communication },
    { value: 'creative', label: t.submitPage.form.categories.creative },
    { value: 'business', label: t.submitPage.form.categories.business },
    { value: 'developer-tools', label: t.submitPage.form.categories.developerTools },
    { value: 'security', label: t.submitPage.form.categories.security },
    { value: 'integration', label: t.submitPage.form.categories.integration },
  ]

  const validateRepo = async (repoUrl: string) => {
    if (!repoUrl) {
      setRepoValid(null)
      return
    }

    const parsed = parseGitHubUrl(repoUrl)
    if (!parsed) {
      setRepoValid(false)
      setError(t.submitPage.form.repoValidError)
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
        setError(data.error || t.submitPage.form.validationFailed)
      }
    } catch (err) {
      setRepoValid(false)
      setError(t.submitPage.form.retryLater)
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
      setError(t.submitPage.form.pleaseValidate)
      return
    }

    if (!category) {
      setError(t.submitPage.form.pleaseSelectCategory)
      return
    }

    if (tags.length === 0) {
      setError(t.submitPage.form.pleaseAddTags)
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
      setError(err.message || t.submitPage.form.retryLater)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
      {/* GitHub Repository */}
      <div>
        <label htmlFor="repository" className="block text-sm font-semibold mb-2">
          {t.submitPage.form.repository}
        </label>
        <input
          id="repository"
          type="text"
          value={repository}
          onChange={(e) => handleRepoChange(e.target.value)}
          onBlur={handleRepoBlur}
          placeholder={t.submitPage.form.repositoryPlaceholder}
          className="w-full border border-border bg-background px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-serif focus:border-foreground focus:outline-none"
          required
        />
        {validating && (
          <p className="mt-2 text-sm text-secondary">{t.submitPage.form.validating}</p>
        )}
        {repoValid === true && (
          <p className="mt-2 text-sm text-foreground">{t.submitPage.form.repoValidSuccess}</p>
        )}
        {repoValid === false && error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-semibold mb-2">
          {t.submitPage.form.category}
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border border-border bg-background px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-serif focus:border-foreground focus:outline-none"
          required
        >
          <option value="">{t.submitPage.form.categoryPlaceholder}</option>
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
          {t.submitPage.form.tags}
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
            placeholder={t.submitPage.form.tagsPlaceholder}
            className="flex-1 border border-border bg-background px-3 sm:px-4 py-2 text-xs sm:text-sm font-serif focus:border-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-3 sm:px-4 py-2 border border-foreground text-xs sm:text-sm hover:bg-muted transition-colors whitespace-nowrap"
          >
            {t.submitPage.form.addTag}
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-2 px-2 sm:px-3 py-1 border border-border text-xs sm:text-sm"
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
          className="w-full px-4 sm:px-6 py-2 sm:py-3 border-2 border-foreground bg-foreground text-background font-semibold hover:bg-background hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          {submitting ? t.submitPage.form.submitting : t.submitPage.form.submit}
        </button>
      </div>

      {error && !repoValid && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </form>
  )
}
