import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { findVideoWorkflowListing, VIDEO_WORKFLOWS, videoSourceUrl } from '../lib/video-workflows.ts'
import { getXTextLength } from '../lib/x/editorial.ts'

const sources = JSON.parse(await readFile(new URL('../lib/video-workflow-sources.json', import.meta.url), 'utf8'))
assert.equal(sources.length, 19)
assert.equal(new Set(sources.map((source) => `${source.repository}/${source.path}`)).size, 19)
for (const workflow of VIDEO_WORKFLOWS) {
  assert.ok(sources.some((source) => source.repository === workflow.repository && source.path === workflow.path))
}
for (const source of sources) {
  assert.match(source.ref, /^[a-f0-9]{40}$/)
  assert.match(source.sha256, /^[a-f0-9]{64}$/)
  assert.ok(videoSourceUrl(source).includes(`/blob/${source.ref}/${source.path}`))
}
const source = sources[0]
const publicRecord = {
  slug: 'canonical-returned-slug', github_repo: source.repository,
  source_path: source.path, source_commit_sha: source.ref, source_content_hash: source.sha256,
  listing_status: 'owner_published', ai_review_approved: false,
}
assert.equal(findVideoWorkflowListing(source, [publicRecord])?.slug, publicRecord.slug)
assert.equal(findVideoWorkflowListing(source, []), undefined, 'No guessed URL when lookup is unavailable')
for (const changed of [
  { github_repo: 'other/repo' }, { source_path: 'other/SKILL.md' },
  { source_commit_sha: '0'.repeat(40) }, { source_content_hash: '0'.repeat(64) },
  { listing_status: 'rejected' }, { source_path: null },
]) {
  assert.equal(findVideoWorkflowListing(source, [{ ...publicRecord, ...changed }]), undefined,
    'Different sources, revisions and unpublished records must not acquire detail links')
}
assert.ok(findVideoWorkflowListing(source, [{ ...publicRecord, github_repo: source.repository.toLowerCase() }]))
assert.ok(findVideoWorkflowListing(source, [{ ...publicRecord, listing_status: null, ai_review_approved: true }]))
console.log('Video workflow source identity checks passed.')

const campaign = JSON.parse(await readFile(new URL('../docs/campaigns/video-workflows-20261006.json', import.meta.url), 'utf8'))
for (const post of campaign.posts) {
  assert.ok(getXTextLength(post) <= 280, 'Each post must fit the standard X limit with weighted links')
  assert.ok(post.includes('https://www.openagentskill.com/use-cases/video-creation?utm_source=x&'), 'Each post should lead to the actual website collection')
}
console.log('Video campaign: all seven posts fit X and link to the collection.')
