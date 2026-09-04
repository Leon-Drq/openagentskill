import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), 'utf8')
}

const cachedPublicRoutes = [
  'app/rankings/page.tsx',
  'app/rankings/[slug]/page.tsx',
  'app/skills/[slug]/page.tsx',
  'app/skills/[slug]/audit/page.tsx',
  'app/skills/[slug]/evals/page.tsx',
  'app/best/page.tsx',
  'app/trending/page.tsx',
]

for (const route of cachedPublicRoutes) {
  const source = read(route)
  assert.doesNotMatch(source, /force-dynamic/, `${route} must not bypass the public route cache`)
  assert.match(source, /export const revalidate = \d+/, `${route} must declare an ISR window`)
}

const dbSkills = read('lib/db/skills.ts')
assert.match(dbSkills, /rowLimit <= 160[\s\S]+?rowLimit <= 480/, 'directory reads must keep bounded cache tiers')
assert.match(dbSkills, /SKILL_EXACT_SEARCH_TIMEOUT_MS = 2500/, 'interactive exact search must stay bounded')
assert.match(dbSkills, /SKILL_LOOKUP_CACHE_REVALIDATE_SECONDS = 300/, 'detail lookups must share a useful cache window')
assert.match(dbSkills, /if \(sort === 'stars'\)[\s\S]+?order\('github_stars'/, 'star rankings must query the star index directly')

for (const [route, maximumPool] of [
  ['app/evals/resolve/page.tsx', 480],
  ['app/rankings/[slug]/page.tsx', 480],
] as const) {
  const source = read(route)
  const requestedPools = [...source.matchAll(/getAllSkills\([^)]*?,\s*undefined,\s*(\d+)\)/g)]
    .map((match) => Number(match[1]))
  assert.ok(requestedPools.every((size) => size <= maximumPool), `${route} must avoid multi-megabyte skill caches`)
}

const useCasePage = read('app/use-cases/[slug]/page.tsx')
assert.match(useCasePage, /searchSkills\(useCase\.heroPrompt, 240\)/, 'use-case pages must use an indexed task query')
assert.doesNotMatch(useCasePage, /getAllSkills\('quality', undefined, 4000\)/, 'use-case pages must not cache the full registry')

const skillsPage = read('app/skills/page.tsx')
assert.match(skillsPage, /SKILLS_PAGE_EXACT_SEARCH_TIMEOUT_MS = 3000/, 'skills search must not block navigation for many seconds')

const loadingBoundary = read('app/loading.tsx')
assert.match(loadingBoundary, /role="progressbar"/, 'route transitions need immediate visual feedback')
assert.match(loadingBoundary, /aria-live="polite"/, 'route loading feedback must be announced accessibly')

const rootLayout = read('app/layout.tsx')
assert.match(rootLayout, /<SpeedInsights \/>/, 'real-user Core Web Vitals monitoring must stay enabled')

const siteHeader = read('components/site-header.tsx')
assert.match(siteHeader, /onPointerDown=\{\(\) => warmRoute\(href\)\}/, 'touch navigation should warm primary routes before transition')

const homePageData = read('lib/home-page-data.ts')
assert.match(
  homePageData,
  /const getCachedExactApprovedSkillCount = unstable_cache\(\s*fetchExactApprovedSkillCount/,
  'the homepage must cache only exact registry counts'
)
assert.match(
  homePageData,
  /throw new Error\('Exact approved skill count is temporarily unavailable'\)/,
  'timeouts and planner estimates must reject instead of poisoning the homepage cache'
)
assert.match(
  homePageData,
  /async function getStableApprovedSkillCount[\s\S]+?getCachedExactApprovedSkillCount\(\)[\s\S]+?HOME_STATS_SNAPSHOT\.totalSkills/,
  'the cold-cache snapshot fallback must remain outside unstable_cache'
)
assert.doesNotMatch(
  homePageData,
  /unstable_cache\(\s*fetchApprovedSkillCount/,
  'fallback counts must never be stored in the homepage data cache'
)

console.log('Performance regression tests passed.')
