import { DatabaseSync } from 'node:sqlite'
import { readFileSync, openSync, closeSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const tables=['account_identities','commerce_releases','commerce_customers','commerce_orders','commerce_subscriptions','commerce_webhook_events']
const booleans=new Set(['livemode','withdrawn','cancel_at_period_end'])
const integers=new Set(['amount_cents','size_bytes'])
const timestamps=new Set(['released_at','created_at','paid_at','updates_until','current_period_end','updated_at','processed_at'])
const identifier=value=>{
  if(!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('Unexpected column identifier')
  return `"${value}"`
}
// Source exports use UTC PostgreSQL timestamps. Preserve all six fractional
// digits instead of truncating timestamps through JS Date milliseconds.
export function commerceTimestamp(value) {
  const match=/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:Z|\+00(?::00)?)$/.exec(value)
  if(!match) throw new Error('Unsupported source timestamp')
  const seconds=`${match[1]}T${match[2]}`
  const parsed=new Date(`${seconds}Z`)
  if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,19)!==seconds) throw new Error('Invalid source timestamp')
  return `${seconds}.${(match[3]||'').padEnd(6,'0')}Z`
}
export function commerceValue(column,value) {
  if(value===null) return null
  if(typeof value!=='string') throw new Error('Expected lossless source strings')
  if(booleans.has(column)) {
    if(!['true','false'].includes(value)) throw new Error('Invalid source boolean')
    return Number(value==='true')
  }
  if(integers.has(column)) {
    if(!/^[0-9]+$/.test(value)||!Number.isSafeInteger(Number(value))) throw new Error('Unsafe source integer')
    return Number(value)
  }
  return timestamps.has(column)?commerceTimestamp(value):value
}
const digest=rows=>createHash('sha256').update(rows.map(row=>JSON.stringify(row)+'\n').join('')).digest('hex')

/** Local typed rehearsal from the already verified, lossless SQLite archive.
 * No network, login implementation, private auth attributes or production writes.
 */
export function rehearseCommerce(source,destination) {
  if(resolve(source)===resolve(destination)) throw new Error('Source must remain read-only')
  const input=new DatabaseSync(source,{readOnly:true})
  let output
  const report={purpose:'typed commerce rehearsal; archived data, no login authorization',at:new Date().toISOString(),tables:[]}
  try {
    closeSync(openSync(destination,'wx',0o600))
    output=new DatabaseSync(destination)
    output.exec('PRAGMA foreign_keys=ON')
    output.exec(readFileSync(new URL('../cloudflare/migrations/data/0001_commerce.sql',import.meta.url),'utf8'))
    output.exec('BEGIN IMMEDIATE')
    for(const table of tables) {
      const cols=output.prepare(`PRAGMA table_info(${identifier(table)})`).all()
      const names=cols.map(c=>c.name)
      const sourceTable=table==='account_identities'?'auth__users':`public__${table}`
      const sourceColumns=input.prepare(`PRAGMA table_info(${identifier(sourceTable)})`).all().map(c=>c.name)
      if(names.some(name=>!sourceColumns.includes(name)) || (table!=='account_identities'&&sourceColumns.length!==names.length)) throw new Error(`Schema mismatch: ${table}`)
      const select=names.map(name=>`CAST(${identifier(name)} AS BLOB) AS ${identifier(name)}`).join(',')
      const sourceRows=input.prepare(`SELECT ${select} FROM ${identifier(sourceTable)} ORDER BY rowid`).all()
      const decoder=new TextDecoder('utf-8',{fatal:true})
      const rows=sourceRows.map(row=>names.map(name=>commerceValue(name,row[name]===null?null:decoder.decode(row[name]))))
      const insert=output.prepare(`INSERT INTO ${identifier(table)} (${names.map(identifier).join(',')}) VALUES (${names.map(()=>'?').join(',')})`)
      try {for(const row of rows) insert.run(...row)} catch {throw new Error(`Commerce constraint failure: ${table}`)}
      const targetSelect=cols.map(c=>c.type==='TEXT'?`CAST(${identifier(c.name)} AS BLOB) AS ${identifier(c.name)}`:identifier(c.name)).join(',')
      const target=output.prepare(`SELECT ${targetSelect} FROM ${identifier(table)} ORDER BY rowid`).all()
        .map(row=>cols.map(c=>row[c.name]===null?null:c.type==='TEXT'?decoder.decode(row[c.name]):row[c.name]))
      if(rows.length!==target.length||digest(rows)!==digest(target)) throw new Error(`Commerce round-trip mismatch: ${table}`)
      report.tables.push({table,rows:rows.length,semanticSha256:digest(target)})
    }
    if(output.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Commerce ownership mismatch')
    output.exec('COMMIT')
    report.integrity=output.prepare('PRAGMA integrity_check').get().integrity_check
    if(report.integrity!=='ok') throw new Error('Commerce integrity failure')
    report.foreignKeyViolations=0
    report.totalRows=report.tables.reduce((n,t)=>n+t.rows,0)
    return report
  } finally {output?.close();input.close()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const [source,target,reportPath]=process.argv.slice(2)
  if(!source||!target||!reportPath) throw new Error('Usage: SOURCE_ARCHIVE_SQLITE NEW_COMMERCE_SQLITE NEW_REPORT_JSON')
  const report=rehearseCommerce(resolve(source),resolve(target))
  writeFileSync(resolve(reportPath),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600})
  console.log(JSON.stringify({tables:report.tables.length,rows:report.totalRows,integrity:report.integrity,foreignKeyViolations:report.foreignKeyViolations}))
}
