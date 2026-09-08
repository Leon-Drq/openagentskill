import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  FEATURED_CREATORS,
  buildCreatorDirectory,
  repositoryKey,
  repositoryStarTotal,
  selectCreators,
  creatorHref,
  isMissingFeaturedCreatorPath,
} from '../lib/creator-directory.ts'
import { getCreatorWorks } from '../lib/creator-gallery.ts'
assert.equal(FEATURED_CREATORS.length, 20)
assert.equal(isMissingFeaturedCreatorPath('/creators/github/yanliudesign'), false)
assert.equal(isMissingFeaturedCreatorPath('/creators/github/unknown-author'), true)
assert.equal(isMissingFeaturedCreatorPath('/creators/github/unknown/nested'), true)
assert.equal(isMissingFeaturedCreatorPath('/creators/github/%GG'), true)
assert.equal(isMissingFeaturedCreatorPath('/creators/existing-claimed-account'), false)
assert.equal(
  new Set(FEATURED_CREATORS.map((c) => c.owner.toLowerCase())).size,
  20,
)
for (const c of FEATURED_CREATORS) {
  assert.match(c.owner, /^[a-z\d-]+$/i)
  assert.ok(['Person', 'Organization'].includes(c.kind))
  assert.equal(
    c.githubUrl.toLowerCase(),
    `https://github.com/${c.owner.toLowerCase()}`,
  )
  for (const r of c.repositories) {
    assert.match(r.revision, /^[a-f\d]{40}$/)
    assert.match(r.skillPath, /(^|\/)SKILL\.md$/i)
    assert.ok(r.fullName.toLowerCase().startsWith(c.owner.toLowerCase() + '/'))
    assert.ok(r.stars >= 0)
    assert.ok(Number.isFinite(Date.parse(r.observedAt)))
  }
  assert.equal(
    creatorHref(c.owner),
    `/creators/github/${c.owner.toLowerCase()}`,
  )
}
assert.equal(repositoryKey('https://github.com/OWNER/Repo.git'), 'owner/repo')
assert.equal(repositoryKey('https://evil.example/owner/repo'), '')
assert.equal(
  repositoryStarTotal([
    { fullName: 'A/B', stars: 100, observedAt: '2026-09-01' },
    { fullName: 'a/b', stars: 80, observedAt: '2026-09-02' },
    { fullName: 'A/C', stars: 7, observedAt: '2026-09-01' },
  ]),
  87,
  'Deduplicate and permit real star decreases',
)
const seed = FEATURED_CREATORS[0],
  repo = seed.repositories[0]
const skill = {
  slug: 'fixture',
  name: 'One',
  github_repo: repo.fullName,
  repository: repo.url,
  github_stars: 10,
  last_synced_at: '2026-09-09T00:00:00Z',
  github_last_pushed_at: '2026-09-09T00:00:00Z',
  ai_review_approved: true,
  listing_status: 'reviewed',
}
const profile = {
  id: 'user',
  username: 'claimed-handle',
  github_username: seed.owner,
  github_verified_at: '2026-09-08',
}
const claim = { user_id: 'user', skill_slug: 'fixture', status: 'approved' }
const make = (s = [skill], c = [claim], p = [profile]) =>
  buildCreatorDirectory(s, c, p, [seed])[0]
assert.equal(make().claimedProfile, 'claimed-handle')
assert.equal(
  make([skill], [{ ...claim, status: 'pending' }]).claimedProfile,
  null,
)
assert.equal(
  make([skill], [claim], [{ ...profile, github_verified_at: null }])
    .claimedProfile,
  null,
)
assert.equal(
  make([skill], [claim], [{ ...profile, github_username: 'impostor' }])
    .claimedProfile,
  null,
)
assert.equal(make([{ ...skill, ai_review_approved: false }]).skills.length, 0)
assert.equal(
  make([
    { ...skill, ai_review_approved: false, listing_status: 'owner_published' },
  ]).skills.length,
  1,
  'Owner publication remains distinct from AI approval',
)
assert.equal(
  make([{ ...skill, github_repo: 'unrelated/repo' }]).skills.length,
  0,
)
assert.equal(make([skill, skill]).skills.length, 1)
assert.equal(
  make().repositories[0].stars,
  10,
  'Latest timestamp beats higher stale counts',
)
const entries = buildCreatorDirectory()
assert.ok(
  entries.every((c) => !c.claimedProfile && c.skills.length === 0),
  'No invented claims or live registry data',
)
assert.equal(selectCreators(entries, 'NO_SUCH_CREATOR').length, 0)
assert.equal(
  selectCreators(entries, 'ＭＯＮＯ').length,
  1,
  'Unicode-normalized search',
)
assert.ok(selectCreators(entries, '', 'Video').every((c) => c.area === 'Video'))
const ranked = selectCreators(entries)
assert.ok(ranked.every((c, i) => !i || ranked[i - 1].stars >= c.stars))
assert.deepEqual(
  selectCreators(entries, '', '', 'editorial').map((c) => c.owner),
  entries.map((c) => c.owner),
)
assert.ok(
  getCreatorWorks('yanliudesign').some((w) => w.slug === 'room-to-grow-poster'),
)
assert.equal(
  getCreatorWorks('microsoft').length,
  0,
  'No unrelated work attribution',
)
const server = readFileSync('lib/creator-directory-data.ts', 'utf8')
assert.ok(
  server.includes('PUBLIC_SKILL_FILTER') &&
    server.includes('limit(1000)') &&
    server.includes('Promise.allSettled'),
)
assert.ok(
  !server.includes('createAdminClient'),
  'Public directory does not need privileged credentials',
)
const sitemap = readFileSync('lib/seo/sitemap.ts', 'utf8')
assert.ok(sitemap.includes('creatorHref(creator.owner)'))
const directoryPage = readFileSync('app/creators/page.tsx', 'utf8')
assert.ok(directoryPage.includes('Skill <em className="font-normal text-[#006b4f]">Creators</em>'))
assert.ok(directoryPage.includes("const title = 'Skill Creators'"))
assert.ok(!directoryPage.includes('Find the people behind your next project.'))
assert.ok(directoryPage.includes("const BASE = 'https://www.openagentskill.com/creators'"))
console.log(
  'Creator directory passed: 20 source-backed profiles, star deduplication, conservative ownership, publication gates, ranking, gallery attribution and sitemap integration.',
)
