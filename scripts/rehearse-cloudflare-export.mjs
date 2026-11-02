import { DatabaseSync } from 'node:sqlite'
import { createReadStream, readFileSync, readdirSync, openSync, closeSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { inspectExport } from './inspect-cloudflare-export.mjs'

const identifier = value => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error('Invalid export identifier')
  return `"${value}"`
}
const tableName = (schema, name) => `${schema}__${name}`
const digestRow = (hash, row) => hash.update(JSON.stringify(row) + '\n')

// LOCAL rehearsal only. TEXT preserves the archive's exact decimal, UUID,
// timestamp, JSON and password-verifier representations without coercion.
// This is an evidence archive, NOT the application schema or an auth service.
// No network, provider quota bypass, production writes or credential output.
export async function rehearseExport(source, destination) {
  const inspection = await inspectExport(source)
  if (inspection.tables.some(t => t.columns > 100 || t.rowsOverD1Limit)) {
    throw new Error('Archive exceeds D1 column or row limits')
  }
  const read = name => JSON.parse(readFileSync(join(source, name), 'utf8').replace(/^\uFEFF/, ''))
  const tables = read('catalog-tables.json')
  const columns = read('catalog-columns.json')
  const constraints = read('catalog-constraints.json')
  const names = new Set(tables.map(t => tableName(t.schema, t.name)))
  if (names.size !== tables.length) throw new Error('Table-name collision')
  const partial = `${destination}.partial`
  // Refuse to replace any existing database, including an incomplete rehearsal.
  closeSync(openSync(destination, 'wx', 0o600))
  closeSync(openSync(partial, 'wx', 0o600))
  const db = new DatabaseSync(partial)
  const report = {
    exportedAt: inspection.exportedAt, sourceConsistency: inspection.consistency,
    completedAt: null, purpose: 'local lossless SQLite archive rehearsal; not application-ready',
    totalRows: 0, tables: [], constraints: { primary: 0, unique: 0, foreign: 0, untranslatedChecks: 0 },
    foreignKeyViolations: [], integrity: null, bytes: 0,
    outstanding: ['Application type conversion and indexes', 'PostgreSQL CHECK constraints, RPCs, triggers and RLS',
      'Authentication/session migration', 'Current consistent export and final delta reconciliation'],
  }
  let transaction = false
  try {
    db.exec('PRAGMA foreign_keys=OFF; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL;')
    for (const table of tables) {
      const cols = columns.filter(c => c.schema === table.schema && c.name === table.name).sort((a,b)=>a.position-b.position)
      const definitions = cols.map(c => `${identifier(c.column_name)} TEXT${c.not_null ? ' NOT NULL' : ''}`)
      for (const c of constraints.filter(c => c.schema === table.schema && c.table_name === table.name)) {
        if (c.kind === 'c') { report.constraints.untranslatedChecks++; continue }
        if (!['p','u','f'].includes(c.kind)) throw new Error('Unsupported source constraint kind')
        const list = c.columns.map(identifier).join(',')
        if (c.kind === 'p' || c.kind === 'u') {
          if (/NULLS NOT DISTINCT/.test(c.definition)) throw new Error('Unique NULL semantics require explicit conversion')
          definitions.push(`${c.kind === 'p' ? 'PRIMARY KEY' : 'UNIQUE'} (${list})`)
          report.constraints[c.kind === 'p' ? 'primary' : 'unique']++
        } else {
          const ref = tableName(c.ref_schema, c.ref_table)
          if (!names.has(ref)) throw new Error('Foreign key references an unexported table')
          // No mutation semantics are implied by this read-only rehearsal.
          definitions.push(`FOREIGN KEY (${list}) REFERENCES ${identifier(ref)} (${c.ref_columns.map(identifier).join(',')})`)
          report.constraints.foreign++
        }
      }
      db.exec(`CREATE TABLE ${identifier(tableName(table.schema,table.name))} (${definitions.join(',')})`)
    }
    const files = readdirSync(join(source,'raw'))
    for (const table of tables) {
      const key = `${table.schema}.${table.name}`
      const name = tableName(table.schema,table.name)
      const cols = columns.filter(c=>c.schema===table.schema&&c.name===table.name).sort((a,b)=>a.position-b.position)
      const list = cols.map(c=>identifier(c.column_name)).join(',')
      const insert = db.prepare(`INSERT INTO ${identifier(name)} (${list}) VALUES (${cols.map(()=>'?').join(',')})`)
      const sourceHash = createHash('sha256')
      let count = 0
      db.exec('BEGIN IMMEDIATE'); transaction = true
      for (const file of files.filter(f=>f.startsWith(`${key}.`)&&f.endsWith('.jsonl')).sort()) {
        const chunkHash = createHash('sha256')
        const input = createReadStream(join(source,'raw',file))
        input.on('data',bytes=>chunkHash.update(bytes))
        const lines = createInterface({input,crlfDelay:Infinity})
        for await (const line of lines) {
          const row = JSON.parse(line)
          // Re-check shape/types on the import pass, including source changes.
          if (!Array.isArray(row)||row.length!==cols.length||row.some(v=>v!==null&&typeof v!=='string')) throw new Error(`Invalid row representation: ${key}`)
          try { insert.run(...row) } catch { throw new Error(`SQLite import constraint failed: ${key}`) }
          digestRow(sourceHash,row); count++
        }
        if (chunkHash.digest('hex')!==inspection.chunks.find(c=>c.file===file)?.sha256) throw new Error(`Archive changed during import: ${key}`)
      }
      db.exec('COMMIT'); transaction = false
      const targetHash = createHash('sha256')
      let imported = 0
      for (const row of db.prepare(`SELECT ${list} FROM ${identifier(name)} ORDER BY rowid`).iterate()) {
        digestRow(targetHash,cols.map(c=>row[c.column_name])); imported++
      }
      const expected = sourceHash.digest('hex'), actual = targetHash.digest('hex')
      if (count!==inspection.tables.find(t=>t.table===key).rows||imported!==count||expected!==actual) {
        throw new Error(`SQLite round-trip mismatch: ${key}`)
      }
      report.tables.push({table:key,rows:count,semanticSha256:actual})
      report.totalRows+=count
    }
    report.integrity = db.prepare('PRAGMA integrity_check').get().integrity_check
    if (report.integrity!=='ok') throw new Error('SQLite integrity check failed')
    db.exec('PRAGMA foreign_keys=ON')
    // Aggregate only: do not expose row IDs, personal data or credentials.
    report.foreignKeyViolations = db.prepare('SELECT "table" AS sourceTable, fkid AS foreignKey, count(*) AS violations FROM pragma_foreign_key_check GROUP BY "table", fkid').all()
    report.completedAt = new Date().toISOString()
  } finally {
    if (transaction) db.exec('ROLLBACK')
    db.close()
  }
  // The reserved destination is empty; only this invocation owns it.
  renameSync(partial,destination)
  report.bytes = statSync(destination).size
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [source,destination,reportPath] = process.argv.slice(2)
  if (!source||!destination||!reportPath) throw new Error('Usage: node scripts/rehearse-cloudflare-export.mjs SOURCE NEW_SQLITE NEW_REPORT_JSON')
  const report = await rehearseExport(resolve(source),resolve(destination))
  writeFileSync(resolve(reportPath),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600})
  console.log(JSON.stringify({tables:report.tables.length,rows:report.totalRows,bytes:report.bytes,integrity:report.integrity,
    constraints:report.constraints,foreignKeyViolationGroups:report.foreignKeyViolations.length}))
}
