'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const categories = [
  { value: 'all', label: 'All Skills' },
  { value: 'data-analysis', label: 'Data Analysis' },
  { value: 'code-generation', label: 'Code Generation' },
  { value: 'research', label: 'Research' },
  { value: 'automation', label: 'Automation' },
  { value: 'business', label: 'Business' },
  { value: 'integration', label: 'Integration' },
]

const platforms = [
  { value: 'all', label: 'All Platforms' },
  { value: 'langchain', label: 'LangChain' },
  { value: 'autogpt', label: 'AutoGPT' },
  { value: 'crewai', label: 'CrewAI' },
  { value: 'llamaindex', label: 'LlamaIndex' },
  { value: 'semantic-kernel', label: 'Semantic Kernel' },
]

const pricingOptions = [
  { value: 'all', label: 'All Pricing' },
  { value: 'free', label: 'Free' },
  { value: 'freemium', label: 'Freemium' },
  { value: 'paid', label: 'Paid' },
]

export function SkillFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const category = searchParams.get('category') || 'all'
  const platform = searchParams.get('platform') || 'all'
  const pricing = searchParams.get('pricing') || 'all'

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/skills?${params.toString()}`)
  }

  return (
    <div className="border-b border-border bg-background py-6">
      <div className="container mx-auto px-6">
        <div className="flex flex-wrap gap-6">
          <FilterGroup
            label="Category"
            options={categories}
            value={category}
            onChange={(value) => updateFilter('category', value)}
          />
          <FilterGroup
            label="Platform"
            options={platforms}
            value={platform}
            onChange={(value) => updateFilter('platform', value)}
          />
          <FilterGroup
            label="Pricing"
            options={pricingOptions}
            value={pricing}
            onChange={(value) => updateFilter('pricing', value)}
          />
        </div>
      </div>
    </div>
  )
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-secondary">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`border px-3 py-1 text-sm transition-colors ${
              value === option.value
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-foreground hover:border-foreground'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
