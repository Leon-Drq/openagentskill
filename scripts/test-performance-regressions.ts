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

const skillsPage = read('app/skills/page.tsx')
assert.match(skillsPage, /SKILLS_PAGE_EXACT_SEARCH_TIMEOUT_MS = 3000/, 'skills search must not block navigation for many seconds')

const loadingBoundary = read('app/loading.tsx')
assert.match(loadingBoundary, /role="progressbar"/, 'route transitions need immediate visual feedback')
assert.match(loadingBoundary, /aria-live="polite"/, 'route loading feedback must be announced accessibly')

const rootLayout = read('app/layout.tsx')
assert.match(rootLayout, /<SpeedInsights \/>/, 'real-user Core Web Vitals monitoring must stay enabled')

const siteHeader = read('components/site-header.tsx')
assert.match(siteHeader, /onPointerDown=\{\(\) => warmRoute\(href\)\}/, 'touch navigation should warm primary routes before transition')

console.log('Performance regression tests passed.')
