/** Text-only editorial drafts. Repository descriptions are data, never prompts. */
export interface XEditorialCandidate {
  slug: string
  name: string
  description: string
  url: string
  githubRepo?: string
}

export interface XEditorialDraft {
  version: 2
  mainText: string
  replyText: string
  picks: XEditorialCandidate[]
}

// Conservative for non-Latin text/emoji; URLs use X's fixed t.co length.
export function editorialTextLength(text: string) {
  return Array.from(text.replace(/https?:\/\/\S+/g, 'x'.repeat(23)))
    .reduce((total, char) => total + (char.codePointAt(0)! > 0x10ff ? 2 : 1), 0)
}

const genericCopy = /reusable operating path|repeatable research surface|workflow\s*->|game.changer|10x|you installed .+ and stopped there|comment .+ (unlock|get)|ignore (all |previous )?instructions/i
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim()

// Source-checked editorial angles (2026-09-29). Exact repository AND skill
// identity prevent a similarly named submission inheriting another author's claims.
// These describe instructions, not results from an execution or benchmark.
function sourceCheckedAngle(candidate: XEditorialCandidate) {
  const repo = (candidate.githubRepo || '').replace(/^https:\/\/github.com\//, '').replace(/\/$/, '').toLowerCase()
  const name = candidate.name.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (repo === 'blader/humanizer' && name === 'humanizer') return {
    hook: 'Your AI draft still sounds like a landing page.',
    detail: 'targets inflated claims, forced contrasts and filler while preserving the original meaning.',
    action: 'Try it on one paragraph. Check that every fact survives the edit.',
  }
  if (repo === 'humanlayer/skills' && name === 'showme') return {
    hook: 'A wall of text is a rough way to explain a code change.',
    detail: 'uses call trees, focused diffs and diagrams to explain code visually.',
    action: 'Try it on one changed flow before writing the PR description.',
  }
  return null
}

function detailFromDescription(description: string) {
  const text = normalize(description)
  if (genericCopy.test(text) || /https?:\/\/|[<>]/i.test(text)) return null
  // Keep a complete source sentence; never cut a name or sentence to fit X.
  const firstSentence = text.match(/^.*?[.!?](?=\s|$)/)?.[0] || text
  if (firstSentence.length < 30 || editorialTextLength(firstSentence) > 165) return null
  if (/\.{3}|…/.test(firstSentence)) return null
  return firstSentence
}

export function buildXEditorialDraft(candidates: XEditorialCandidate[]): XEditorialDraft | null {
  // One concrete capability beats several unrelated names. Preserve candidate
  // order (already ranked/deduplicated upstream), but skip unusable source copy.
  for (const candidate of candidates) {
    const angle = sourceCheckedAngle(candidate)
    const detail = angle?.detail || detailFromDescription(candidate.description)
    if (!detail) continue
    const pick = { ...candidate, name: normalize(candidate.name), description: detail }
    const draft: XEditorialDraft = {
      version: 2,
      mainText: angle
        ? `${angle.hook}\n\n${pick.name} ${detail}\n\n${angle.action}`
        : `${pick.name}\n\n${detail}\n\nSource and install instructions in the reply.`,
      replyText: `${pick.name}: source, install instructions and review details.\n${pick.url}`,
      picks: [pick],
    }
    if (validateXEditorialDraft(draft).length === 0) return draft
  }
  return null
}

export function validateXEditorialDraft(draft: XEditorialDraft): string[] {
  const errors: string[] = []
  if (draft.version !== 2 || draft.picks.length !== 1) errors.push('invalid-editorial-snapshot')
  if (!draft.mainText.trim() || editorialTextLength(draft.mainText) > 280) errors.push('invalid-main-length')
  if (!draft.replyText.trim() || editorialTextLength(draft.replyText) > 280) errors.push('invalid-reply-length')
  if (/https?:\/\/|\bwww\./i.test(draft.mainText)) errors.push('main-link-must-move-to-reply')
  if (genericCopy.test(draft.mainText) || /\.{3}|…/.test(draft.mainText)) errors.push('generic-or-truncated-copy')
  for (const pick of draft.picks) {
    if (!pick.name || !pick.slug || !detailFromDescription(pick.description)
      || !draft.mainText.includes(pick.name) || !draft.mainText.includes(pick.description)) {
      errors.push('content-snapshot-mismatch')
    }
    try {
      const url = new URL(pick.url)
      if (url.origin !== 'https://www.openagentskill.com'
        || url.pathname !== `/skills/${encodeURIComponent(pick.slug)}`
        || !draft.replyText.includes(pick.url)) errors.push('source-link-mismatch')
    } catch { errors.push('invalid-source-link') }
  }
  return errors
}

/** Fail closed on old list drafts; preserve their text in the queue audit. */
export function queuedEditorialSkipReason(item: {
  post_text: string
  reply_text: string | null
  metadata: Record<string, unknown>
}) {
  if (item.metadata.digest_type !== 'task_shortlist') return null
  const raw = item.metadata.editorial_snapshot
  if (!raw || typeof raw !== 'object') return 'editorial-rewrite-required'
  const snapshot = raw as Partial<XEditorialDraft>
  if (snapshot.version !== 2 || !Array.isArray(snapshot.picks)
    || !snapshot.picks.every((pick) => pick && ['slug', 'name', 'description', 'url']
      .every((key) => typeof (pick as unknown as Record<string, unknown>)[key] === 'string'))) {
    return 'invalid-editorial-snapshot'
  }
  if (item.metadata.auto_thread_reply !== true) return 'editorial-source-reply-required'
  const errors = validateXEditorialDraft({
    version: 2, picks: snapshot.picks,
    mainText: item.post_text, replyText: item.reply_text || '',
  })
  return errors[0] || null
}
