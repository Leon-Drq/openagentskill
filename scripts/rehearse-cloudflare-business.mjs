import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync, openSync, closeSync, writeFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { commerceTimestamp } from './rehearse-cloudflare-commerce.mjs'
import { sqlName } from './build-cloudflare-business-schema.mjs'

export function businessValue(type, value) {
  if (value === null) return null
  if (typeof value !== 'string') throw new Error('Expected lossless source text')
  if (type === 'bool') {
    if (value !== 'true' && value !== 'false') throw new Error('Invalid boolean')
    return Number(value === 'true')
  }
  if (['int2','int4','int8'].includes(type)) {
    if (!/^-?\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error('Unsafe integer conversion')
    return Number(value)
  }
  if (type === 'numeric') {
    if (!/^-?\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value)) || Math.abs(Number(value)) > Number.MAX_SAFE_INTEGER) throw new Error('Unsafe decimal conversion')
    return Number(value)
  }
  if (type === 'timestamptz') return commerceTimestamp(value)
  if (type === 'jsonb' || type === '_text') {
    const parsed = JSON.parse(value)
    if (type === '_text' && (!Array.isArray(parsed) || parsed.some(v => v !== null && typeof v !== 'string'))) throw new Error('Unsupported text array')
    return value
  }
  if (type === 'bytea') {
    if (!/^\\x(?:[a-f0-9]{2})*$/i.test(value)) throw new Error('Unsupported binary export')
    return Buffer.from(value.slice(2), 'hex')
  }
  if (!['uuid','text','date','tsvector'].includes(type)) throw new Error('Unsupported source type')
  return value
}

const hashRow = (hash, row) => hash.update(JSON.stringify(row.map(v => v instanceof Uint8Array ? { hex: Buffer.from(v).toString('hex') } : v)) + '\n')

/** Private local rehearsal. Source is immutable, destination must not exist.
 * Checks every converted row, all business constraints and cross-table owners.
 * Does not imply that PostgreSQL business triggers or RPCs have been migrated.
 */
export function rehearseBusiness(source, destination, onProgress = () => {}) {
  if (resolve(source) === resolve(destination)) throw new Error('Source must stay read-only')
  const metadata = JSON.parse(readFileSync(new URL('../lib/db/cloudflare-schema.json', import.meta.url), 'utf8'))
  const input = new DatabaseSync(source, { readOnly: true })
  let output
  const decoder = new TextDecoder('utf-8', { fatal: true })
  const report = { purpose: 'typed historical business-data rehearsal; no production cutover', at: new Date().toISOString(), tables: [], totalRows: 0, integrity: null, foreignKeyViolations: null }
  try {
    closeSync(openSync(destination, 'wx', 0o600))
    output = new DatabaseSync(destination)
    output.exec('PRAGMA foreign_keys=OFF; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL')
    for (const file of readdirSync(new URL('../cloudflare/migrations/data/', import.meta.url)).filter(f => /^000[123]_/.test(f)).sort()) {
      output.exec(readFileSync(new URL(`../cloudflare/migrations/data/${file}`, import.meta.url), 'utf8'))
    }
    output.exec('BEGIN IMMEDIATE')
    const anchors = output.prepare('INSERT INTO account_identities(id) VALUES (?)')
    for (const row of input.prepare('SELECT id FROM auth__users').iterate()) anchors.run(row.id)
    for (const [table, types] of Object.entries(metadata)) {
      const names = Object.keys(types)
      const generated = table === 'skill_download_receipts' ? ['actor_key'] : []
      const writable = names.filter(n => !generated.includes(n))
      const tableColumns = input.prepare(`PRAGMA table_info(${sqlName(`public__${table}`)})`).all().map(c => c.name)
      if (tableColumns.length !== names.length || names.some(n => !tableColumns.includes(n))) throw new Error(`Source schema drift: ${table}`)
      const select = names.map(n => `CAST(${sqlName(n)} AS BLOB) AS ${sqlName(n)}`).join(',')
      const insert = output.prepare(`INSERT INTO ${sqlName(table)} (${writable.map(sqlName).join(',')}) VALUES (${writable.map(() => '?').join(',')})`)
      const expected = createHash('sha256')
      let count = 0
      for (const row of input.prepare(`SELECT ${select} FROM ${sqlName(`public__${table}`)} ORDER BY rowid`).iterate()) {
        const values = names.map(n => businessValue(types[n], row[n] === null ? null : decoder.decode(row[n])))
        try { insert.run(...writable.map(n => values[names.indexOf(n)])) }
        catch { throw new Error(`Business constraint failure in ${table} at row ${count + 1}`) }
        hashRow(expected, values); count++
      }
      const expectedHash = expected.digest('hex')
      const actual = createHash('sha256')
      const textTypes = new Set(['uuid','text','date','tsvector','timestamptz','jsonb','_text'])
      const targetSelect = names.map(n => textTypes.has(types[n]) ? `CAST(${sqlName(n)} AS BLOB) AS ${sqlName(n)}` : sqlName(n)).join(',')
      let targetCount = 0
      for (const row of output.prepare(`SELECT ${targetSelect} FROM ${sqlName(table)} ORDER BY rowid`).iterate()) {
        hashRow(actual, names.map(n => row[n] === null ? null : textTypes.has(types[n]) ? decoder.decode(row[n]) : row[n])); targetCount++
      }
      const actualHash = actual.digest('hex')
      if (count !== targetCount || expectedHash !== actualHash) throw new Error(`Business read-back mismatch: ${table}`)
      report.tables.push({ table, rows: count, semanticSha256: actualHash })
      report.totalRows += count
      onProgress({ table, rows: count })
    }
    const foreign = output.prepare('PRAGMA foreign_key_check').all()
    if (foreign.length) throw new Error(`Business foreign-key violations: ${foreign.length}`)
    output.exec('COMMIT; PRAGMA foreign_keys=ON')
    report.integrity = output.prepare('PRAGMA integrity_check').get().integrity_check
    if (report.integrity !== 'ok') throw new Error('Business integrity failure')
    report.foreignKeyViolations = 0
    report.bytes = statSync(destination).size
    return report
  } finally { output?.close(); input.close() }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [source, target, reportPath] = process.argv.slice(2)
  if (!source || !target || !reportPath) throw new Error('Usage: SOURCE_ARCHIVE_SQLITE NEW_DATABASE NEW_REPORT')
  const report = rehearseBusiness(resolve(source), resolve(target), progress => console.log(JSON.stringify(progress)))
  writeFileSync(resolve(reportPath), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  console.log(JSON.stringify({ tables: report.tables.length, rows: report.totalRows, integrity: report.integrity, foreignKeyViolations: report.foreignKeyViolations }))
}
