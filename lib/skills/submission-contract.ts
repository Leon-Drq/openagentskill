/** Shared, browser-safe submission rules. No credentials or server imports. */
export const SUBMISSION_BATCH_LIMIT = 5
export const RECEIPT_STORAGE_KEY = 'openagentskill.submissionReceipts.v1'
export const PENDING_STORAGE_KEY = 'openagentskill.pendingSubmissions.v1'
export const ACTIVE_RECEIPT_KEY = 'openagentskill.activeReceipt.v1'
export const SUBMISSION_LEASE_MS = 10 * 60 * 1000
export const SUBMISSION_MAX_ATTEMPTS = 3

export type SubmissionStatus = 'submitted' | 'processing' | 'listed' | 'reviewed' | 'duplicate' | 'quarantined' | 'approved' | 'rejected' | 'approved_manual'
export interface SubmissionReceipt {
  id: string
  token: string
  status: SubmissionStatus
  statusUrl: string
  skill: { name: string; description?: string; path: string; sourceUrl: string }
}
export interface SubmissionState {
  id: string
  status: SubmissionStatus
  skill: { name: string; path?: string; slug?: string | null; sourceUrl?: string }
  review?: { method?: string; approved?: boolean; issues?: string[]; suggestions?: string[] }
  queue?: { attempts: number; stalled: boolean }
}

export function isSubmissionPending(status: string) {
  return status === 'submitted' || status === 'processing'
}

export function normalizeSocialHandle(value: unknown, provider: 'github' | 'x'): string {
  if (typeof value !== 'string') return ''
  const text = value.trim().replace(/^@/, '')
  if (!text) return ''
  if (/^(?:https?:\/\/)?(?:www\.)?(?:github\.com|x\.com|twitter\.com)\//i.test(text)) {
    try {
      const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
      const host = url.hostname.toLowerCase().replace(/^www\./, '')
      const expected = provider === 'github' ? ['github.com'] : ['x.com', 'twitter.com']
      const parts = url.pathname.split('/').filter(Boolean)
      if (expected.includes(host) && parts.length === 1) return parts[0]
    } catch { /* Report the invalid value next to its field. */ }
  }
  return text
}

export function validSocialHandle(value: string, provider: 'github' | 'x') {
  return !value || (provider === 'github'
    ? /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(value)
    : /^[A-Za-z0-9_]{1,15}$/.test(value))
}

export function validReceipt(value: unknown): value is SubmissionReceipt {
  if (!value || typeof value !== 'object') return false
  const item = value as SubmissionReceipt
  return typeof item.id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(item.id)
    && typeof item.token === 'string' && /^[a-f0-9]{48}$/.test(item.token)
    && ['submitted', 'processing', 'listed', 'reviewed', 'duplicate', 'quarantined', 'approved', 'rejected', 'approved_manual'].includes(item.status)
    && Boolean(item.skill && typeof item.skill.name === 'string' && typeof item.skill.path === 'string' && typeof item.skill.sourceUrl === 'string')
}

export function receiptStatusUrl(receipt: Pick<SubmissionReceipt, 'id' | 'token'>) {
  return `/api/skills/submissions/${receipt.id}`
}

// The shared head captures and strips this fragment before analytics loads.
export function receiptPageUrl(receipt: Pick<SubmissionReceipt, 'id' | 'token'>) {
  return `/submit#receipt=${receipt.id}.${receipt.token}`
}

export function receiptFromFragment(fragment: string) {
  const match = /^#receipt=([a-f0-9-]{36})\.([a-f0-9]{48})$/i.exec(fragment)
  return match ? { id: match[1], token: match[2] } : null
}

export function submissionShare(state: SubmissionState) {
  if (['quarantined', 'rejected'].includes(state.status)) return null
  // Only a server-confirmed public slug is ever presented as published.
  const published = Boolean(['reviewed', 'duplicate', 'approved', 'approved_manual'].includes(state.status) && state.skill.slug && /^[a-z0-9][a-z0-9-]*$/.test(state.skill.slug))
  const name = state.skill.name.replace(/[\r\n]+/g, ' ').slice(0, 90)
  const text = published
    ? `Discover ${name} on @openagentskill — an open-source skill for AI agents.`
    : `I submitted ${name} to @openagentskill for review. Discover and share reusable skills for AI agents.`
  const url = published ? `https://www.openagentskill.com/skills/${state.skill.slug}` : 'https://www.openagentskill.com/submit'
  const intent = new URL('https://x.com/intent/post')
  intent.searchParams.set('text', text)
  intent.searchParams.set('url', url)
  return { text, url, intent: intent.toString(), published }
}

export function submissionJobEligible(row: { status: string; review_started_at?: string | null; updated_at?: string | null }, now = Date.now()) {
  if (row.status === 'submitted') return true
  if (row.status !== 'processing') return false
  const timestamp = Date.parse(row.review_started_at || row.updated_at || '')
  return !Number.isFinite(timestamp) || now - timestamp > SUBMISSION_LEASE_MS
}
