import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
// @ts-expect-error TS5097 is expected for this standalone test entrypoint.
import { getSkillGitHubOwner, getSkillSocialProvenance } from '../lib/seo/social-card.ts'
import type { SkillRecord } from '../lib/db/skills.ts'

function record(overrides: Partial<SkillRecord> = {}): SkillRecord {
  return {
    id: 'skill-1',
    slug: 'owner-useful-skill',
    name: 'Useful Skill',
    description: 'Does useful work.',
    long_description: null,
    tagline: null,
    author_name: 'owner',
    author_email: null,
    author_url: null,
    repository: 'https://github.com/owner/useful-skill',
    github_repo: 'owner/useful-skill',
    github_stars: 120,
    github_forks: 10,
    category: 'developer-tools',
    tags: [],
    frameworks: [],
    version: '1.0.0',
    license: 'MIT',
    install_command: 'npx skills add owner/useful-skill',
    npm_package: null,
    verified: false,
    publisher_verified: false,
    submission_source: 'github-star-discovery',
    submitted_by_agent: null,
    ai_review_score: null,
    ai_review_approved: true,
    ai_review_issues: [],
    ai_review_suggestions: [],
    downloads: 0,
    used_by: 0,
    rating: 0,
    review_count: 0,
    quality_score: 80,
    quality_signals: null,
    github_language: null,
    github_last_pushed_at: null,
    created_at: '2026-09-04T00:00:00.000Z',
    updated_at: '2026-09-04T00:00:00.000Z',
    ...overrides,
  }
}

assert.deepEqual(getSkillSocialProvenance(record()), {
  label: 'COMMUNITY INDEXED',
  detail: 'Public source · claimable',
  tone: 'community',
})

assert.equal(
  getSkillSocialProvenance(record({ source_sync_status: 'current', source_content_hash: 'abc' })).label,
  'SOURCE CURRENT'
)
assert.equal(getSkillSocialProvenance(record({ verified: true })).label, 'REGISTRY VERIFIED')
assert.equal(getSkillSocialProvenance(record({ publisher_verified: true })).label, 'CREATOR VERIFIED')
assert.equal(getSkillGitHubOwner(record()), 'owner')

const card = readFileSync(new URL('../components/skill-social-card.tsx', import.meta.url), 'utf8')
const skillImage = readFileSync(new URL('../app/skills/[slug]/opengraph-image.tsx', import.meta.url), 'utf8')
const metadata = readFileSync(new URL('../app/skills/[slug]/page.tsx', import.meta.url), 'utf8')

assert.doesNotMatch(card, /VERIFIED SKILL MANIFEST/, 'unverified skills must not receive a verified label')
assert.match(card, /statusLabel/, 'card must render evidence-driven provenance')
assert.match(card, /avatarUrl/, 'card must support creator identity')
assert.match(card, /View skill &amp; install/, 'card must include a clear discovery CTA')
assert.match(skillImage, /getSkillSocialProvenance/, 'dynamic image must derive provenance from stored evidence')
assert.match(skillImage, /buildSkillSearchMetadata/, 'dynamic image must use the canonical English SEO summary')
assert.match(skillImage, /npx skills add \$\{record\.github_repo\}/, 'GitHub installs must use the concise owner/repository form')
assert.match(metadata, /imageVersion = '8'/, 'metadata must bust stale social platform caches')

console.log('OG social card regression tests passed.')
