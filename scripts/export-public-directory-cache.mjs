// Explicit, offline recovery from this project's successful public Data Cache.
// No database requests, privileged credentials or fabricated publication data.
import { readFile, readdir, stat, mkdir, writeFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { publicSavedRow } from '../lib/skills/saved-directory-format.ts'
import { isMcpOnlySkillRecord } from '../lib/skills/registry-scope.ts'

const since = process.argv.find(arg => arg.startsWith('--since='))?.slice(8)
if (!since || !Number.isFinite(Date.parse(since))) throw new Error('Pass --since=<ISO date> to select a known successful cache window')
const root = path.resolve('.next/cache/fetch-cache')
const records = new Map()
for (const file of await readdir(root)) {
  if (!/^[a-f0-9]{64}$/.test(file)) continue
  const entry = path.join(root, file), info = await stat(entry)
  if (info.mtimeMs < Date.parse(since) || info.size > 20_000_000) continue
  try {
    const cache = JSON.parse(await readFile(entry, 'utf8'))
    if (cache.kind !== 'FETCH' || cache.data?.status !== 200 || cache.data?.url !== '' || !cache.tags?.includes('public-skill-directory')) continue
    let data = JSON.parse(cache.data.body)
    if (typeof data === 'string') data = JSON.parse(gunzipSync(Buffer.from(data, 'base64'), { maxOutputLength: 16_000_000 }))
    const rows = Array.isArray(data) ? data : data?.records
    if (!Array.isArray(rows) || data.degraded === true) continue
    for (const raw of rows) {
      const row = publicSavedRow(raw)
      if (!row || isMcpOnlySkillRecord(row)) continue
      const previous = records.get(row.slug)
      if (!previous || previous.at < info.mtimeMs) records.set(row.slug, { row, at: info.mtimeMs })
    }
  } catch { /* An unrelated or incomplete cache item is never a data source. */ }
}
const selected = new Map()
for (const column of ['created_at', 'github_stars', 'github_last_pushed_at', 'quality_score']) {
  const metric = row => column.endsWith('_at') ? Date.parse(row[column]) || 0 : Number(row[column]) || 0
  for (const item of [...records.values()].sort((a, b) => metric(b.row) - metric(a.row) || a.row.slug.localeCompare(b.row.slug)).slice(0, 480)) selected.set(item.row.slug, item)
}
if (!selected.size) throw new Error('No eligible public cache rows; existing snapshot was not changed')
const items = [...selected.values()]
const data = { version: 1, coverage: 'partial', source: 'local-public-cache',
  savedFrom: new Date(Math.min(...items.map(item => item.at))).toISOString(),
  savedThrough: new Date(Math.max(...items.map(item => item.at))).toISOString(),
  rows: items.map(item => item.row).sort((a, b) => a.slug.localeCompare(b.slug)) }
const destination = path.resolve('data/public-directory-saved.json')
await mkdir(path.dirname(destination), { recursive: true })
await writeFile(`${destination}.tmp`, `${JSON.stringify(data)}\n`)
await rename(`${destination}.tmp`, destination)
console.log(JSON.stringify({ rows: data.rows.length, coverage: data.coverage, savedFrom: data.savedFrom, savedThrough: data.savedThrough }))
