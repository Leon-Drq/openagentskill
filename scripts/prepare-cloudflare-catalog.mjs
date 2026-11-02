import { DatabaseSync } from 'node:sqlite'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isMcpOnlySkillRecord } from '../lib/skills/registry-scope.ts'

export function prepareCatalog(path) {
  const db = new DatabaseSync(path)
  try {
    if (db.prepare("SELECT 1 FROM sqlite_master WHERE name='directory_skill_ids'").get()) throw new Error('Catalog already prepared; refusing duplicate mutation')
    db.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE')
    db.exec(readFileSync(new URL('../cloudflare/migrations/data/0004_catalog.sql',import.meta.url),'utf8'))
    const insert = db.prepare('INSERT INTO directory_skill_ids(id) VALUES (?)')
    let eligible = 0
    for (const row of db.prepare('SELECT id,name,github_repo,category,tags,frameworks FROM skills').iterate()) {
      const skill = { ...row, tags: row.tags ? JSON.parse(row.tags) : [], frameworks: row.frameworks ? JSON.parse(row.frameworks) : [] }
      if (!isMcpOnlySkillRecord(skill)) { insert.run(row.id); eligible++ }
    }
    db.exec("INSERT INTO skills_fts(skills_fts) VALUES ('rebuild')")
    const source = db.prepare("SELECT id,slug,github_repo,source_path,created_at FROM skills WHERE ai_review_approved = 1 OR listing_status IN ('owner_published','static_checked') ORDER BY created_at,id").all()
    const ids = new Set(db.prepare('SELECT id FROM directory_skill_ids').all().map(r=>r.id))
    const seen = new Set(), expected = []
    for (const row of source) {
      if (!ids.has(row.id)) continue
      const key = row.github_repo !== null && row.source_path !== null ? JSON.stringify([row.github_repo.toLowerCase(),row.source_path]) : null
      if (key !== null && seen.has(key)) continue
      if (key !== null) seen.add(key)
      expected.push(row.slug)
    }
    const actual = db.prepare('SELECT slug FROM skill_directory_entries').all().map(r=>r.slug)
    if (JSON.stringify(expected.sort()) !== JSON.stringify(actual.sort())) throw new Error('Directory deduplication mismatch')
    db.exec('COMMIT')
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Catalog ownership mismatch')
    const search = db.prepare("SELECT count(*) AS n FROM skills_fts WHERE skills_fts MATCH 'video'").get().n
    return { at:new Date().toISOString(), eligible, publishedDirectory:actual.length, fullTextVideoMatches:search, directoryParity:true }
  } finally { db.close() }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [database, reportPath] = process.argv.slice(2)
  if (!database || !reportPath) throw new Error('Usage: TYPED_BUSINESS_DATABASE NEW_REPORT')
  const result = prepareCatalog(resolve(database))
  writeFileSync(resolve(reportPath),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600})
  console.log(JSON.stringify(result))
}
