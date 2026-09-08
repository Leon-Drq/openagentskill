import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { editorialWeek, EDITORIAL_WEEKLY_TARGET, validateEditorialDraft, type EditorialDraft } from './editorial-policy'

const TOPICS = [
  ['coding', 'Coding agent workflows'], ['research', 'Research and evidence'],
  ['design', 'Frontend and interface design'], ['presentation', 'Presentations and slide decks'],
  ['video', 'Video production'], ['data', 'Data analysis and reporting'],
  ['marketing', 'Content and marketing'], ['security', 'Security review'],
  ['web', 'Browser and web extraction'], ['productivity', 'Everyday workflow automation'],
]

export async function prepareEditorialWeek() {
  const db = createAdminClient({ requestTimeoutMs: 12_000 })
  const week = editorialWeek()
  // Fixed briefs, not articles. A Codex editor must research and fact-check each one.
  const rows = TOPICS.flatMap(([category, topic], index) => ['comparison', 'workflow'].map((format, variant) => ({
    week_start: week, slot: index * 2 + variant + 1, topic_key: `${week}:${category}:${format}`,
    brief: { category, topic, format, target: 'English-language original editorial',
      researchRequired: true,
      instructions: 'Choose a distinct user problem not already covered. Research primary sources, cite 3+ sources, explain methodology and limitations. Compare concrete inputs, outputs, costs and constraints. Never invent tests, install success, trend growth or verification. Reject near-duplicates. Keep a draft until fact-checked. Preserve old URLs.' },
  })))
  const { error } = await db.from('seo_editorial_queue').upsert(rows, { onConflict: 'week_start,slot', ignoreDuplicates: true })
  if (error) throw new Error('Unable to prepare editorial queue')
  const { data, error: readError } = await db.from('seo_editorial_queue').select('id,slot,brief,status').eq('week_start', week).order('slot')
  if (readError) throw new Error('Unable to read editorial queue')
  return { week, target: EDITORIAL_WEEKLY_TARGET, modelCalls: 0, items: data }
}

export async function submitEditorialDraft(id: string, draft: EditorialDraft) {
  const result = validateEditorialDraft(draft)
  const db = createAdminClient({ requestTimeoutMs: 12_000 })
  const { error } = await db.from('seo_editorial_queue').update({ draft,
    status: result.passed ? 'draft' : 'needs_revision', review_notes: result,
  }).eq('id', id).neq('status', 'published')
  if (error) throw new Error('Unable to save editorial draft')
  return result
}

export async function publishEditorialDraft(id: string) {
  const db = createAdminClient({ requestTimeoutMs: 12_000 })
  const { data: row, error } = await db.from('seo_editorial_queue').select('draft').eq('id', id).single()
  if (error || !row?.draft) throw new Error('Draft not found')
  const result = validateEditorialDraft(row.draft)
  if (!result.passed) return { published: false, ...result }
  const { data, error: publishError } = await db.rpc('publish_seo_editorial', { p_id: id })
  if (publishError) throw new Error('Editorial publication rejected: ' + publishError.message)
  return data
}
