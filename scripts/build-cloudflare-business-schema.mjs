import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const sqlName = value => {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('Invalid schema identifier')
  return `"${value}"`
}

// This is deliberately a closed conversion of this application's schema, not a
// general PostgreSQL transpiler. Unknown types/defaults/expressions fail closed.
export function sqliteExpression(source) {
  let sql = source.replace(/::(?:text|integer|numeric|bigint|boolean)\b/g, '')
    .replace(/= ANY \(ARRAY\[([^\]]+)\]\)/g, 'IN ($1)')
    .replace(/TRIM\(BOTH FROM ([a-z_]+)\)/g, 'trim($1)')
    .replace(/jsonb_typeof\(/g, 'json_type(')
    .replace(/octet_length\((\w+)\)/g, 'length(CAST($1 AS BLOB))')
    .replace(/(\w+) ~~ /g, '$1 LIKE ')
    .replace(/\((\w+) ->> ('[^']+')\)/g, "json_extract($1, '$.' || $2)")
    .replace(/\btrue\b/g, '1').replace(/\bfalse\b/g, '0')
  sql = sql.replace(/(\w+) ~\* '\^\[a-z0-9\]\(\[a-z0-9-\]\{0,37\}\[a-z0-9\]\)\?\$'/g,
    "(length($1) BETWEEN 1 AND 39 AND lower($1) NOT GLOB '*[^a-z0-9-]*' AND substr(lower($1),1,1) GLOB '[a-z0-9]' AND substr(lower($1),-1,1) GLOB '[a-z0-9]')")
    .replace(/(\w+) ~\* '\^\[a-z0-9_\]\{1,15\}\$'/g, "(length($1) BETWEEN 1 AND 15 AND lower($1) NOT GLOB '*[^a-z0-9_]*')")
    .replace(/(\w+) ~ '\^\[a-f0-9\]\{64\}\$'/g, "(length($1) = 64 AND $1 NOT GLOB '*[^a-f0-9]*')")
    .replace(/(\w+) ~ '\^\[a-z0-9\]\[a-z0-9-\]\{0,199\}\$'/g,
      "(length($1) BETWEEN 1 AND 200 AND substr($1,1,1) GLOB '[a-z0-9]' AND $1 NOT GLOB '*[^a-z0-9-]*')")
  if (/::|~|\bARRAY\b|\bANY\b|->>|is_directory_skill|;|--|\/\*/.test(sql)) throw new Error('Unsupported schema expression')
  return sql
}

export function columnType(column) {
  if (['bool', 'int2', 'int4', 'int8'].includes(column.pg_type)) return 'INTEGER'
  if (column.pg_type === 'numeric') return 'REAL'
  if (column.pg_type === 'bytea') return 'BLOB'
  if (['uuid', 'text', 'jsonb', 'timestamptz', 'date', '_text', 'tsvector'].includes(column.pg_type)) return 'TEXT'
  throw new Error(`Unsupported source type: ${column.pg_type}`)
}

function defaultSql(column) {
  const source = column.default_sql
  if (source === null || column.generated) return ''
  if (source === 'gen_random_uuid()') return " DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',1 + abs(random() % 4),1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))"
  if (source === 'now()') return " DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now') || '000Z')"
  if (source === "(now() + '7 days'::interval)") return " DEFAULT (strftime('%Y-%m-%dT%H:%M:%f','now','+7 days') || '000Z')"
  if (/^\(\(now\(\) AT TIME ZONE '(utc|UTC)'::text\)\)::date$/.test(source)) return " DEFAULT (date('now'))"
  if (source === 'substr(md5((random())::text), 0, 9)') return ' DEFAULT (lower(hex(randomblob(4))))'
  if (source === "'{}'::text[]") return " DEFAULT '[]'"
  if (source === "'{}'::jsonb" || source === "'[]'::jsonb") return ` DEFAULT ${source.slice(0, -7)}`
  if (/^(?:'[^']*'::text|-?\d+(?:\.\d+)?|true|false)$/.test(source)) return ` DEFAULT ${sqliteExpression(source)}`
  throw new Error(`Unsupported default: ${column.name}.${column.column_name}`)
}

export function buildBusinessSchema(directory) {
  const read = name => JSON.parse(readFileSync(join(directory, `catalog-${name}.json`), 'utf8').replace(/^\uFEFF/, ''))
  const tables = read('tables').filter(t => t.schema === 'public' && !t.name.startsWith('commerce_'))
  const columns = read('columns').filter(c => c.schema === 'public')
  const constraints = read('constraints').filter(c => c.schema === 'public')
  const indexes = read('indexes').filter(i => i.schema === 'public')
  const metadata = {}
  const statements = ['-- Business data only. No public SQL endpoint or implicit authorization.',
    '-- Application writes remain gated until PostgreSQL RPCs/triggers are ported.',
    '-- skills.search_document is a preserved source vector; D1 search uses FTS5.']
  for (const table of tables) {
    const cols = columns.filter(c => c.name === table.name).sort((a,b) => a.position - b.position)
    metadata[table.name] = Object.fromEntries(cols.map(c => [c.column_name, c.pg_type]))
    const definitions = cols.map(c => {
      let definition = `${sqlName(c.column_name)} ${columnType(c)}${c.not_null ? ' NOT NULL' : ''}${defaultSql(c)}`
      if (c.name === 'skill_download_receipts' && c.column_name === 'actor_key') {
        definition += " GENERATED ALWAYS AS (CASE WHEN user_id IS NOT NULL THEN 'user:' || user_id ELSE 'visitor:' || visitor_key END) STORED"
      } else if (c.generated && c.column_name !== 'search_document') throw new Error('Unsupported generated column')
      if (c.pg_type === 'bool') definition += ` CHECK (${sqlName(c.column_name)} IN (0,1))`
      if (c.pg_type === 'jsonb' || c.pg_type === '_text') definition += ` CHECK (${sqlName(c.column_name)} IS NULL OR json_valid(${sqlName(c.column_name)}))`
      if (c.pg_type === '_text') definition += ` CHECK (${sqlName(c.column_name)} IS NULL OR json_type(${sqlName(c.column_name)}) = 'array')`
      return definition
    })
    for (const c of constraints.filter(c => c.table_name === table.name)) {
      if (c.kind === 'c') { definitions.push(sqliteExpression(c.definition)); continue }
      const names = c.columns.map(sqlName).join(',')
      if (c.kind === 'p' || c.kind === 'u') definitions.push(`${c.kind === 'p' ? 'PRIMARY KEY' : 'UNIQUE'} (${names})`)
      else if (c.kind === 'f') {
        const reference = c.ref_schema === 'auth' && c.ref_table === 'users' ? 'account_identities' : c.ref_table
        if (c.ref_schema !== 'public' && reference !== 'account_identities') throw new Error('Unsupported foreign schema')
        const action = { a: 'NO ACTION', r: 'RESTRICT', c: 'CASCADE', n: 'SET NULL', d: 'SET DEFAULT' }
        if (!action[c.on_delete] || !action[c.on_update]) throw new Error('Unsupported FK action')
        definitions.push(`FOREIGN KEY (${names}) REFERENCES ${sqlName(reference)} (${c.ref_columns.map(sqlName).join(',')}) ON DELETE ${action[c.on_delete]} ON UPDATE ${action[c.on_update]}`)
      } else throw new Error('Unsupported constraint')
    }
    statements.push(`CREATE TABLE ${sqlName(table.name)} (\n  ${definitions.join(',\n  ')}\n) STRICT;`)
    // Unique indexes outside constraints carry source identity and idempotency
    // semantics. Non-unique query indexes are chosen separately for D1 costs.
    const constraintNames = new Set(constraints.filter(c => c.table_name === table.name).map(c => c.name))
    for (const i of indexes.filter(i => i.table_name === table.name && i.unique && !i.primary && !constraintNames.has(i.name))) {
      const list = i.expressions ? sqliteExpression(i.expressions) : i.columns.map(sqlName).join(',')
      statements.push(`CREATE UNIQUE INDEX ${sqlName(i.name)} ON ${sqlName(table.name)} (${list})${i.predicate ? ` WHERE ${sqliteExpression(i.predicate)}` : ''};`)
    }
  }
  // Commerce is already migrated; expose its codecs without recreating tables.
  for (const c of columns.filter(c => c.name.startsWith('commerce_'))) (metadata[c.name] ||= {})[c.column_name] = c.pg_type
  return { sql: statements.join('\n\n') + '\n', metadata }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [source, sqlPath, metadataPath] = process.argv.slice(2)
  if (!source || !sqlPath || !metadataPath) throw new Error('Usage: SOURCE_EXPORT NEW_SQL NEW_METADATA')
  const result = buildBusinessSchema(resolve(source))
  writeFileSync(resolve(sqlPath), result.sql, { flag: 'wx' })
  writeFileSync(resolve(metadataPath), JSON.stringify(result.metadata, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ tables: Object.keys(result.metadata).length }))
}
