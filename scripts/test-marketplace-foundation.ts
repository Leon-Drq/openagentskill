import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
// @ts-expect-error TS5097 is expected for this standalone test entrypoint.
import { getSearchEvidenceProfile, isSearchIndexEligible } from '../lib/seo/search-indexability.ts'

const legacyEligible = {
  ai_review_approved: true,
  quality_score: 60,
  github_stars: 3,
  publisher_verified: false,
}
assert.equal(isSearchIndexEligible(legacyEligible), true, 'existing SEO eligibility must remain backward compatible')
assert.equal(getSearchEvidenceProfile(legacyEligible).tier, 'repository-backed')
assert.equal(getSearchEvidenceProfile({ ...legacyEligible, publisher_verified: true }).tier, 'verified-owner')
assert.equal(getSearchEvidenceProfile(legacyEligible, { totalOutcomes: 2 }).tier, 'outcome-backed')

const rankings = readFileSync(new URL('../lib/rankings.ts', import.meta.url), 'utf8')
assert.match(rankings, /entityScope: 'project'/, 'GitHub popularity must use project scope')
assert.match(rankings, /dedupeRankedProjects\(scored\)/, 'project rankings must collapse repeated nested skills')
assert.match(rankings, /Math\.min\(100/, 'public evidence and ranking scores must remain bounded')

const search = readFileSync(new URL('../app/api/skills/search/route.ts', import.meta.url), 'utf8')
assert.match(search, /hybrid-v2-task-fit-quality-outcomes/, 'search must disclose its hybrid ranking model')
assert.match(search, /one best match plus up to four distinct alternatives/, 'search must expose the shortlist policy')

const detailPage = readFileSync(new URL('../app/skills/[slug]/page.tsx', import.meta.url), 'utf8')
assert.match(detailPage, /'@type': 'BreadcrumbList'/, 'skill detail pages must publish breadcrumb structured data')
assert.match(detailPage, /Project-level GitHub stars/, 'skill pages must label repository popularity accurately')
assert.doesNotMatch(detailPage, /'@type': 'AggregateRating'/, 'unverified legacy ratings must not be emitted as rich-result evidence')
assert.match(detailPage, /permanentRedirect\(`\/skills\/\$\{skill\.slug\}`\)/, 'legacy skill aliases must retain permanent redirects')

console.log('Marketplace foundation regression tests passed.')
