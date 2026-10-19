'use client'

import { useState } from 'react'
import { creatorCitation } from '@/lib/creator-citation'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function CreatorCitationBuilder({ slug = '', name = '' }: { slug?: string; name?: string }) {
  const [listing, setListing] = useState(slug)
  const [title, setTitle] = useState(name)
  const [format, setFormat] = useState<'markdown' | 'html'>('markdown')
  const [status, setStatus] = useState('')
  const citation = creatorCitation(listing, title)
  const snippet = citation?.[format] || ''
  const invalid = listing.trim().length > 0 && !citation

  async function copy() {
    if (!citation) return
    try {
      await navigator.clipboard.writeText(snippet)
      setStatus('Copied. Paste it where this listing helps your readers.')
      trackAnalyticsEvent('creator_citation_copy', { skill_slug: citation.slug, citation_format: format })
    } catch {
      setStatus('Copy is unavailable. Select and copy the text below.')
    }
  }

  return <div className="min-w-0 space-y-4 rounded-[8px] border border-border bg-card p-5">
    <div>
      <label htmlFor="citation-listing" className="mb-2 block text-sm font-semibold">Published listing URL or slug</label>
      <Input id="citation-listing" value={listing} maxLength={500} autoComplete="off" spellCheck={false}
        aria-invalid={invalid} aria-describedby="citation-listing-help"
        onChange={event => { setListing(event.target.value); setStatus('') }} placeholder="https://www.openagentskill.com/skills/your-skill" />
      <p id="citation-listing-help" className={`mt-2 text-sm ${invalid ? 'text-destructive' : 'text-secondary'}`}>
        {invalid ? 'Enter an OpenAgentSkill /skills/ listing URL or its slug.' : 'Use the published skill page you want readers to visit.'}
      </p>
    </div>
    <div>
      <label htmlFor="citation-name" className="mb-2 block text-sm font-semibold">Skill name</label>
      <Input id="citation-name" value={title} maxLength={120} onChange={event => { setTitle(event.target.value); setStatus('') }} placeholder="Your skill name" />
    </div>
    <fieldset className="flex flex-wrap gap-5 text-sm">
      <legend className="mb-2 font-semibold">Format</legend>
      {(['markdown', 'html'] as const).map(value => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2">
        <input type="radio" name="citation-format" checked={format === value} value={value}
          onChange={() => { setFormat(value); setStatus('') }} />
        {value === 'markdown' ? 'Markdown' : 'HTML'}
      </label>)}
    </fieldset>
    <label htmlFor="citation-snippet" className="block text-sm font-semibold">Citation to copy</label>
    <textarea id="citation-snippet" readOnly value={snippet} rows={4}
      className="w-full min-w-0 resize-y rounded-[8px] border border-border bg-background p-3 font-mono text-xs leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" />
    {citation && <p className="break-words text-sm"><a className="underline underline-offset-4" href={citation.url}>{citation.label}</a></p>}
    <Button type="button" disabled={!citation} onClick={copy} className="min-h-11">Copy citation</Button>
    <p role="status" aria-live="polite" className="min-h-6 text-sm text-secondary">{status}</p>
  </div>
}
