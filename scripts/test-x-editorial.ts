import assert from 'node:assert/strict'
// @ts-expect-error Node's standalone type-stripping runner requires .ts.
import { buildXEditorialDraft, editorialTextLength, queuedEditorialSkipReason, validateXEditorialDraft } from '../lib/x/editorial.ts'

const candidate = {
  slug: 'humanizer', name: 'Humanizer', githubRepo: 'blader/humanizer',
  description: 'Rewrite AI-sounding text while keeping the original meaning intact.',
  url: 'https://www.openagentskill.com/skills/humanizer?ref=x',
}
const draft = buildXEditorialDraft([candidate])!
assert.ok(draft)
assert.deepEqual(validateXEditorialDraft(draft), [])
assert.match(draft.mainText, /landing page/)
assert.doesNotMatch(draft.mainText, /https?:|5 skills|Workflow/)
assert.ok(editorialTextLength(draft.mainText) <= 280)
assert.equal(draft.picks.length, 1)
assert.ok(draft.replyText.includes(candidate.url))

const otherAuthor = buildXEditorialDraft([{ ...candidate, githubRepo: 'someone/humanizer' }])!
assert.doesNotMatch(otherAuthor.mainText, /landing page/)
assert.ok(otherAuthor.mainText.includes(candidate.description))
assert.equal(buildXEditorialDraft([{ ...candidate, githubRepo: '', description: 'gives coding agents a reusable operating path' }]), null)
assert.equal(buildXEditorialDraft([{ ...candidate, githubRepo: '', description: 'Long '.repeat(80) }]), null)
assert.equal(buildXEditorialDraft([{ ...candidate, githubRepo: '', name: 'Name'.repeat(100) }]), null)
assert.equal(buildXEditorialDraft([{ ...candidate, url: 'https://example.com/skills/humanizer' }]), null)
assert.equal(buildXEditorialDraft([{ ...candidate, url: 'https://www.openagentskill.com/skills/other' }]), null)

const sentence = 'Extract tables from PDF files into structured CSV rows.'
const fallback = buildXEditorialDraft([
  { ...candidate, githubRepo: '', description: 'Useful workflow' },
  { ...candidate, githubRepo: '', description: `${sentence} ${'Another sentence '.repeat(60)}` },
])!
assert.ok(fallback.mainText.includes(sentence))
assert.doesNotMatch(fallback.mainText, /Another sentence|\.\.\./)
assert.equal(editorialTextLength('中文'), 4)
assert.equal(editorialTextLength('https://www.openagentskill.com/skills/humanizer?long=tracking'), 23)

const queued = {
  post_text: draft.mainText, reply_text: draft.replyText,
  metadata: { digest_type: 'task_shortlist', auto_thread_reply: true, editorial_snapshot: draft },
}
assert.equal(queuedEditorialSkipReason(queued), null)
assert.equal(queuedEditorialSkipReason({ ...queued, metadata: { digest_type: 'task_shortlist' } }), 'editorial-rewrite-required')
assert.equal(queuedEditorialSkipReason({ ...queued, post_text: '5 skills you need today' }), 'content-snapshot-mismatch')
assert.equal(queuedEditorialSkipReason({ ...queued, reply_text: null }), 'invalid-reply-length')
assert.equal(queuedEditorialSkipReason({ ...queued, metadata: { ...queued.metadata, auto_thread_reply: false } }), 'editorial-source-reply-required')
assert.equal(queuedEditorialSkipReason({ ...queued, metadata: { ...queued.metadata, editorial_snapshot: { version: 2, picks: [null] } } }), 'invalid-editorial-snapshot')
assert.equal(queuedEditorialSkipReason({ ...queued, metadata: { digest_type: 'other' } }), null)

const showMe = buildXEditorialDraft([{
  slug: 'show-me', name: 'show-me', githubRepo: 'humanlayer/skills',
  description: '', url: 'https://www.openagentskill.com/skills/show-me',
}])!
assert.ok(showMe)
assert.match(showMe.mainText, /call trees/)
assert.deepEqual(validateXEditorialDraft(showMe), [])
console.log('X editorial checks passed: source identity, length, links, snapshots, legacy queue, and complete sentences.')
console.log('\nHumanizer preview:\n' + draft.mainText)
console.log('\nshow-me preview:\n' + showMe.mainText)
