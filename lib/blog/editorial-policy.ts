export const EDITORIAL_WEEKLY_TARGET = 20

export function editorialWeek(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7)
  return start.toISOString().slice(0, 10)
}

export interface EditorialDraft {
  slug: string; title: string; summary: string; content: string;
  sources: string[]; uniqueValue: string; factCheckedBy: string;
}

export function validateEditorialDraft(draft: EditorialDraft) {
  const issues: string[] = []
  if (!draft || typeof draft !== 'object' || typeof draft.content !== 'string') return { passed: false, issues: ['Invalid draft'], words: 0 }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug || '') || draft.slug.length > 160) issues.push('Invalid stable slug')
  if (!draft.title || draft.title.length < 20 || draft.title.length > 100) issues.push('Title must be specific')
  if (!draft.summary || draft.summary.length < 50 || draft.summary.length > 200) issues.push('Missing useful summary')
  const words = (draft.content || '').match(/\S+/g)?.length || 0
  if (words < 600 || words > 3000) issues.push('Expected 600–3000 words of substantive editorial content')
  if ((draft.content?.match(/^## /gm)?.length || 0) < 4) issues.push('Missing article structure')
  if (!/limitations|trade-offs|tradeoffs|caveats/i.test(draft.content)) issues.push('Explain limitations and trade-offs')
  if (!/methodology|selection criteria/i.test(draft.content)) issues.push('Explain selection methodology')
  if (/<script|<iframe|javascript:|\bTODO\b|\bPLACEHOLDER\b/i.test(draft.content)) issues.push('Unsafe markup or unfinished placeholders')
  const sources = Array.isArray(draft.sources) ? [...new Set(draft.sources)] : []
  if (sources.length < 3 || sources.some((url) => !/^https:\/\//.test(url) || !draft.content.includes(url))) issues.push('Cite at least three distinct primary sources in the article')
  if (!draft.uniqueValue || draft.uniqueValue.length < 100) issues.push('Explain original value beyond rewriting source READMEs')
  if (!draft.factCheckedBy?.trim()) issues.push('Record the fact-checking editor; automated structure checks do not prove accuracy')
  return { passed: issues.length === 0, issues, words }
}
