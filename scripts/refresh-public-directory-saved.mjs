// Run only after the normal public API has recovered. Four bounded requests;
// any error aborts without replacing the last good file. No paid API/model.
import { mkdir, writeFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { PUBLIC_SKILL_FILTER } from '../lib/skills/publication.ts'
import { publicSavedRow, SAVED_DIRECTORY_STRING_FIELDS } from '../lib/skills/saved-directory-format.ts'
import { isMcpOnlySkillRecord } from '../lib/skills/registry-scope.ts'

if (process.env.SUPABASE_DATA_PAUSED === '1') throw new Error('Data access is paused; snapshot unchanged')
const base = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
if (!base || !key) throw new Error('Set the public Supabase URL and anon/publishable key only')
const origin = new URL(base)
if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.supabase.co') || origin.username || origin.password || origin.search) throw new Error('Expected an HTTPS Supabase project origin')
if (!key.startsWith('sb_publishable_')) {
  let payload
  try { payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')) } catch { throw new Error('Expected a public anon/publishable key') }
  if (payload.role !== 'anon') throw new Error('Privileged credentials are not accepted by this exporter')
}
const savedFrom = new Date().toISOString()
const rows = new Map()
const columns = [...SAVED_DIRECTORY_STRING_FIELDS, 'github_stars', 'github_forks', 'quality_score', 'downloads', 'site_downloads', 'used_by', 'rating', 'review_count', 'verified', 'publisher_verified', 'ai_review_approved', 'tags', 'frameworks', 'ai_review_issues'].join(',')
for (const column of ['created_at', 'github_stars', 'github_last_pushed_at', 'quality_score']) {
  const url = new URL('/rest/v1/skill_directory_entries', origin)
  url.searchParams.set('select', columns)
  url.searchParams.set('or', `(${PUBLIC_SKILL_FILTER})`)
  url.searchParams.set('order', `${column}.desc.nullslast,slug.asc`)
  url.searchParams.set('limit', '480')
  const response = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000), redirect: 'error' })
  if (!response.ok) throw new Error(`Public directory HTTP ${response.status}; existing snapshot kept, no retry`)
  const text = await response.text()
  if (Buffer.byteLength(text) > 8_000_000) throw new Error('Snapshot response exceeds payload budget')
  const batch = JSON.parse(text)
  if (!Array.isArray(batch) || !batch.length || batch.length > 480) throw new Error('Invalid/empty directory batch; snapshot unchanged')
  for (const raw of batch) {
    const row = publicSavedRow(raw)
    if (row && !isMcpOnlySkillRecord(row)) rows.set(row.slug, row)
  }
}
if (!rows.size) throw new Error('No eligible public records; snapshot unchanged')
const data = { version: 1, coverage: 'partial', source: 'public-data-api', savedFrom, savedThrough: new Date().toISOString(), rows: [...rows.values()].sort((a, b) => a.slug.localeCompare(b.slug)) }
const destination = path.resolve('data/public-directory-saved.json')
await mkdir(path.dirname(destination), { recursive: true })
await writeFile(`${destination}.tmp`, `${JSON.stringify(data)}\n`)
await rename(`${destination}.tmp`, destination)
console.log(JSON.stringify({ rows: rows.size, coverage: 'partial', savedThrough: data.savedThrough }))
