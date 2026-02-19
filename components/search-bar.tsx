'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/skills?q=${encodeURIComponent(query)}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills by name, description, or tags..."
          className="w-full border border-border bg-background px-6 py-4 text-lg text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 border border-border bg-foreground px-6 py-2 text-sm text-background transition-opacity hover:opacity-80"
        >
          {'Search'}
        </button>
      </div>
    </form>
  )
}
