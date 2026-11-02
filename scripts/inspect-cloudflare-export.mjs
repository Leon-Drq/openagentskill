import { createReadStream, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createInterface } from 'node:readline'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Inspect a previously authorized local export. This script never connects to
// Supabase and never prints row values, user identifiers or password verifiers.
export async function inspectExport(directory) {
  const read = name => JSON.parse(readFileSync(join(directory, name), 'utf8').replace(/^\uFEFF/, ''))
  const manifest = read('export-manifest.json')
  if (manifest.project !== 'rtuodkczrlkxwwtaxwrr') throw new Error('Unexpected source project')
  const columns = read('catalog-columns.json')
  const tables = read('catalog-tables.json')
  if (manifest.tables.length !== tables.length || manifest.tables.some(table => !table.done)) {
    throw new Error('Incomplete source export')
  }
  const files = readdirSync(join(directory, 'raw'))
  const report = {
    project: manifest.project, exportedAt: manifest.exportedAt,
    consistency: manifest.consistency,
    inspectedAt: new Date().toISOString(),
    mode: 'local inspection; no cloud writes',
    limits: { d1Columns: 100, d1Parameters: 100, d1RowBytes: 2_000_000, d1StatementBytes: 100_000 },
    tables: [], totalRows: 0, verifiedChunks: 0, rawBytes: 0,
    cautions: [
      'This archive is not a current globally consistent production snapshot.',
      'Storage metadata does not include file contents.',
      'PostgreSQL authorization, functions, triggers and auth services require separate implementation.',
      'Estimated row bytes do not include SQLite record overhead; database size must be measured after conversion.',
    ],
  }
  for (const table of tables) {
    if (![table.schema, table.name].every(value => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value))) {
      throw new Error('Invalid source table identifier')
    }
    const key = `${table.schema}.${table.name}`
    const expected = manifest.tables.find(t => t.schema === table.schema && t.name === table.name)
    if (!expected) throw new Error(`Missing manifest entry: ${key}`)
    const cols = columns.filter(c => c.schema === table.schema && c.name === table.name).sort((a, b) => a.position - b.position)
    const chunks = files.filter(file => file.startsWith(`${key}.`) && file.endsWith('.jsonl')).sort()
    if (chunks.length !== expected.chunk) throw new Error(`Missing export chunk: ${key}`)
    const stats = { table: key, columns: cols.length, rows: 0, rawBytes: 0, maxRowValueBytes: 0,
      rowsOverD1Limit: 0, rowsRequiringBoundImport: 0, chunks: chunks.length }
    let tableHash = 0n
    for (const file of chunks) {
      const meta = read(`raw/${file}.meta.json`)
      const checksum = createHash('sha256')
      let chunkRows = 0, chunkBytes = 0, chunkHash = 0n
      const input = createReadStream(join(directory, 'raw', file))
      input.on('data', bytes => { checksum.update(bytes); chunkBytes += bytes.length })
      const lines = createInterface({ input, crlfDelay: Infinity })
      for await (const line of lines) {
        if (!line) throw new Error(`Blank source row: ${key}`)
        const row = JSON.parse(line)
        if (!Array.isArray(row) || row.length !== cols.length) throw new Error(`Column mismatch: ${key}`)
        let rowBytes = 0, escapedSqlBytes = 100 + cols.length * 4
        row.forEach((value, index) => {
          if (value === null) {
            if (cols[index].not_null) throw new Error(`Unexpected NULL: ${key}.${cols[index].column_name}`)
            return
          }
          if (typeof value !== 'string') throw new Error(`Lossy source representation: ${key}`)
          rowBytes += Buffer.byteLength(value)
          escapedSqlBytes += Buffer.byteLength(value.replaceAll("'", "''")) + 2
        })
        stats.maxRowValueBytes = Math.max(stats.maxRowValueBytes, rowBytes)
        if (rowBytes > report.limits.d1RowBytes) stats.rowsOverD1Limit++
        if (escapedSqlBytes > report.limits.d1StatementBytes) stats.rowsRequiringBoundImport++
        chunkHash += BigInt.asIntN(64, BigInt(`0x${createHash('md5').update(line).digest('hex').slice(0, 16)}`))
        chunkRows++
      }
      if (checksum.digest('hex') !== meta.sha256 || chunkRows !== Number(meta.row_count)
        || chunkBytes !== Number(meta.raw_bytes) || chunkHash.toString() !== meta.row_hash_sum) {
        throw new Error(`Source chunk integrity mismatch: ${key}`)
      }
      tableHash += chunkHash
      stats.rows += chunkRows
      stats.rawBytes += chunkBytes
      report.verifiedChunks++
    }
    const verification = manifest.verification.find(t => t.schema === table.schema && t.name === table.name)
    if (stats.rows !== expected.rows || !verification || stats.rows !== Number(verification.row_count)
      || tableHash.toString() !== verification.row_hash_sum) throw new Error(`Source table integrity mismatch: ${key}`)
    report.tables.push(stats)
    report.totalRows += stats.rows
    report.rawBytes += stats.rawBytes
  }
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [source, destination] = process.argv.slice(2)
  if (!source || !destination) throw new Error('Usage: node scripts/inspect-cloudflare-export.mjs SOURCE_DIRECTORY REPORT_JSON')
  const report = await inspectExport(resolve(source))
  writeFileSync(resolve(destination), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ tables: report.tables.length, rows: report.totalRows, verifiedChunks: report.verifiedChunks,
    rawBytes: report.rawBytes, rowsOverD1Limit: report.tables.reduce((n, t) => n + t.rowsOverD1Limit, 0),
    rowsRequiringBoundImport: report.tables.reduce((n, t) => n + t.rowsRequiringBoundImport, 0) }))
}
