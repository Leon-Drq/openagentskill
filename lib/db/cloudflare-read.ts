import 'server-only'
import schema from './cloudflare-schema.json'

export interface ReadDatabase {
  prepare(sql: string): { bind(...values: unknown[]): { all(): Promise<{ results: Record<string, unknown>[] }> } }
  batch(statements: unknown[]): Promise<{ results: Record<string, unknown>[] }[]>
}
// service is set only by the private server factory, never from request data.
export type ReadPrincipal = { userId: string | null; service?: boolean }
type Codecs = Record<string, string>
const tables: Record<string, Codecs> = { ...schema, skill_directory_entries: schema.skills, user_points: { user_id: 'uuid', total_points: 'int4' } }
const publicTables = new Set(['activity_feed','blog_posts','skill_relations','skill_stats','ranking_snapshots','profiles',
  'skill_event_stats','skill_audits','skill_events_daily','agent_outcome_stats','registry_stats','registry_coverage_stats','showcase_entries'])
const ownTables = new Set(['bookmarks','point_events','user_points','showcase_votes','skill_votes','provider_skill_engagement','commerce_orders','commerce_subscriptions'])
const publication = `(t.ai_review_approved = 1 OR t.listing_status IN ('owner_published','static_checked'))`
const identifier = (value: string) => {
  if (!/^[a-z_][a-zA-Z0-9_]*$/.test(value)) throw new QueryError('Invalid identifier')
  return `"${value}"`
}
class QueryError extends Error {
  constructor(message: string, readonly status = 400, readonly code = 'D1_QUERY_REJECTED') { super(message) }
}

// Parse only the filter grammar emitted by the existing query builder. SQL is
// never accepted from callers; values and JSON paths are always bound separately.
function split(source: string, separator = ','): string[] {
  const result: string[] = []
  let depth = 0, quote = false, escape = false, start = 0
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    if (escape) { escape = false; continue }
    if (c === '\\' && quote) { escape = true; continue }
    if (c === '"') { quote = !quote; continue }
    if (quote) continue
    if (c === '(' || c === '{' || c === '[') depth++
    if (c === ')' || c === '}' || c === ']') depth--
    if (depth < 0 || depth > 16) throw new QueryError('Invalid filter nesting')
    if (!depth && c === separator) { result.push(source.slice(start, i)); start = i + 1 }
  }
  if (depth || quote || escape) throw new QueryError('Unclosed filter')
  result.push(source.slice(start))
  return result
}
const unquote = (text: string) => text.startsWith('"') ? JSON.parse(text) as string : text
function readPolicy(table: string, user: ReadPrincipal, bind: (value: unknown) => string) {
  if (user.service) return '1'
  if (table === 'skills' || table === 'skill_directory_entries') return publication
  if (publicTables.has(table)) return '1'
  if (ownTables.has(table)) return user.userId ? `t.user_id = ${bind(user.userId)}` : '0'
  if (table === 'provider_skill_catalog') return user.userId ? '1' : '0'
  if (table === 'skill_claims') return `(t.status = 'approved'${user.userId ? ` OR t.user_id = ${bind(user.userId)}` : ''})`
  if (table === 'skill_versions') return `EXISTS (SELECT 1 FROM skills visible WHERE visible.slug = t.skill_slug AND visible.ai_review_approved = 1)`
  throw new QueryError('This table is private', 403, '42501')
}

function fullText(source: unknown) {
  if (typeof source !== 'string' || source.length > 512) throw new QueryError('Invalid search query')
  // The caller expands synonyms as OR terms. Quote each token, so FTS syntax,
  // column selectors and negations from user input cannot change query scope.
  const terms = source.split(/\s+OR\s+/i).map(s => s.trim()).filter(Boolean)
  return terms.map(term => `"${term.replaceAll('"', '""')}"`).join(' OR ')
}

export function compileRead(input: { url: URL; method: string; headers: Headers; body?: unknown }, principal: ReadPrincipal = { userId: null }) {
  const { url, method, headers } = input
  const match = /^\/rest\/v1\/(?:rpc\/)?([a-z_]+)$/.exec(url.pathname)
  if (!match) throw new QueryError('Unsupported database path', 404)
  const rpc = url.pathname.includes('/rpc/')
  if ((!rpc && !['GET','HEAD'].includes(method)) || (rpc && !['GET','HEAD','POST'].includes(method))) throw new QueryError('Read-only database adapter', 405)
  const params: unknown[] = []
  const bind = (value: unknown) => { params.push(value); if (params.length > 95) throw new QueryError('Query parameter budget exceeded'); return '?' }
  let table = match[1], defaultLimit = 1000, defaultOrder = ''
  const clauses: string[] = []
  const query = new URLSearchParams(url.search)
  if (rpc) {
    const args: Record<string, unknown> = method === 'POST' ? (input.body || {}) as Record<string, unknown> : Object.fromEntries(query)
    if (table === 'search_public_skills') {
      const search = fullText(args.p_query)
      defaultLimit = Math.min(200, Math.max(1, Math.floor(Number(args.p_limit) || 120)))
      clauses.push(search ? `t.rowid IN (SELECT rowid FROM skills_fts WHERE skills_fts MATCH ${bind(search)})` : '0')
      defaultOrder = 't.quality_score DESC NULLS FIRST,t.slug ASC'
      clauses.push(publication)
      table = 'skills'
    } else if (table === 'lookup_public_skill_name') {
      if (typeof args.p_name !== 'string') throw new QueryError('Invalid lookup name')
      const name = args.p_name.trim().slice(0,180)
      clauses.push(name ? `lower(t.name) = lower(${bind(name)})` : '0')
      clauses.push(publication)
      defaultLimit = 8; defaultOrder = 't.slug ASC'; table = 'skills'
    } else if (table === 'skill_directory_by_slugs') {
      const slugs = typeof args.p_slugs === 'string' ? JSON.parse(args.p_slugs) : args.p_slugs
      if (!Array.isArray(slugs) || slugs.length > 50_000 || slugs.some(s => typeof s !== 'string' || s.length > 200)) throw new QueryError('Invalid directory selection')
      clauses.push(`t.slug IN (SELECT value FROM json_each(${bind(JSON.stringify(slugs))}))`)
      table = 'skill_directory_entries'
    } else throw new QueryError('This operation has not been migrated', 503, 'D1_RPC_NOT_MIGRATED')
    for (const key of [...query.keys()]) if (key.startsWith('p_')) query.delete(key)
  }
  const codecs = tables[table]
  if (!codecs) throw new QueryError('Unknown table', 403, '42501')
  clauses.push(readPolicy(table, principal, bind))
  const column = (name: string) => {
    const parts = name.split(/->>?/)
    const key = parts.shift()!
    if (!Object.hasOwn(codecs, key)) throw new QueryError('Unknown column')
    if (!parts.length) return { sql: `t.${identifier(key)}`, type: codecs[key] }
    if (codecs[key] !== 'jsonb' || parts.some(p => !/^[a-zA-Z0-9_]+$/.test(p))) throw new QueryError('Invalid JSON column')
    return { sql: `json_extract(t.${identifier(key)}, ${bind(`$.${parts.join('.')}`)})`, type: 'text' }
  }
  let terms = 0
  const filter = (key: string, expression: string): string => {
    if (++terms > 256) throw new QueryError('Filter budget exceeded')
    if (['or','and','not.or','not.and'].includes(key)) {
      if (!expression.startsWith('(') || !expression.endsWith(')')) throw new QueryError('Invalid group')
      const children = split(expression.slice(1,-1)).map(part => {
        const group = /^(not\.)?(and|or)\(/.exec(part)
        if (group) return filter(`${group[1] || ''}${group[2]}`, part.slice(group[0].length - 1))
        const dot = part.indexOf('.')
        if (dot < 1) throw new QueryError('Invalid filter')
        return filter(part.slice(0,dot), part.slice(dot + 1))
      })
      return `${key.startsWith('not.') ? 'NOT ' : ''}(${children.join(key.endsWith('or') ? ' OR ' : ' AND ')})`
    }
    const field = column(key)
    const negate = expression.startsWith('not.')
    const value = negate ? expression.slice(4) : expression
    const dot = value.indexOf('.')
    if (dot < 1) throw new QueryError('Invalid operator')
    const op = value.slice(0,dot), raw = value.slice(dot + 1)
    const scalar = (text: string): unknown => {
      text = unquote(text)
      if (field.type === 'bool') {
        if (!['true','false','0','1'].includes(text)) throw new QueryError('Invalid boolean filter')
        return Number(text === 'true' || text === '1')
      }
      if (['int2','int4','int8','numeric'].includes(field.type)) {
        if (!/^-?\d+(?:\.\d+)?$/.test(text) || !Number.isFinite(Number(text))) throw new QueryError('Invalid numeric filter')
        return Number(text)
      }
      return text
    }
    const comparison: Record<string,string> = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' }
    let clause: string
    if (Object.hasOwn(comparison,op)) clause = `${field.sql} ${comparison[op]} ${bind(scalar(raw))}`
    else if (op === 'is') {
      if (!['null','true','false'].includes(raw)) throw new QueryError('Invalid IS filter')
      clause = `${field.sql} IS ${raw === 'null' ? 'NULL' : raw === 'true' ? '1' : '0'}`
    } else if (op === 'in') {
      if (!raw.startsWith('(') || !raw.endsWith(')')) throw new QueryError('Invalid IN filter')
      const values = raw === '()' ? [] : split(raw.slice(1,-1)).map(scalar)
      clause = `${field.sql} IN (SELECT value FROM json_each(${bind(JSON.stringify(values))}))`
    } else if (op === 'like' || op === 'ilike') {
      const pattern = unquote(raw).replaceAll('*','%')
      // SQLite LIKE is ASCII case-insensitive. Case-sensitive LIKE is not used
      // by this application's public queries; reject it rather than widening it.
      if (op === 'like') throw new QueryError('Case-sensitive LIKE is not supported')
      if (new TextEncoder().encode(pattern).length <= 50) clause = `${field.sql} LIKE ${bind(pattern)} ESCAPE '\\'`
      else {
        // D1 limits LIKE patterns to 50 bytes. Long repository identities and
        // literal prefix/suffix searches retain their meaning without LIKE.
        const prefix = pattern.startsWith('%'), suffix = pattern.endsWith('%')
        const middle = pattern.slice(prefix ? 1 : 0, suffix ? -1 : undefined)
        if (/(^|[^\\])[%_]|\\$/.test(middle)) throw new QueryError('Complex search pattern exceeds D1 budget')
        const literal = middle.replace(/\\(.)/g,'$1')
        if (prefix && suffix) clause = `instr(lower(${field.sql}),lower(${bind(literal)})) > 0`
        else if (prefix) clause = `substr(lower(${field.sql}),-${[...literal].length}) = lower(${bind(literal)})`
        else if (suffix) clause = `substr(lower(${field.sql}),1,${[...literal].length}) = lower(${bind(literal)})`
        else clause = `lower(${field.sql}) = lower(${bind(literal)})`
      }
    } else if (op === 'cs' && field.type === '_text') {
      if (!raw.startsWith('{') || !raw.endsWith('}')) throw new QueryError('Invalid array containment')
      const values = raw === '{}' ? [] : split(raw.slice(1,-1)).map(unquote)
      clause = `NOT EXISTS (SELECT 1 FROM json_each(${bind(JSON.stringify(values))}) requested WHERE NOT EXISTS (SELECT 1 FROM json_each(${field.sql}) stored WHERE stored.value = requested.value))`
    } else throw new QueryError('Unsupported filter operator')
    return negate ? `NOT (${clause})` : clause
  }
  for (const [key, value] of query) {
    if (['select','order','limit','offset'].includes(key)) continue
    clauses.push(filter(key,value))
  }
  // JSON projection paths are identifier-only literals, so SELECT adds no
  // parameters ahead of the already compiled WHERE/count parameters.
  const selected = query.get('select') || '*'
  const projection: Record<string,string> = {}
  const selection = selected === '*' ? 't.*' : split(selected).map(part => {
    const pieces = part.split(':')
    if (pieces.length > 2) throw new QueryError('Invalid projection')
    const [alias,key] = pieces.length === 2 ? pieces : [pieces[0],pieces[0]]
    const json=/^([a-z_][a-zA-Z0-9_]*)->>([a-zA-Z0-9_]+)$/.exec(key)
    if (Object.hasOwn(projection,alias)) throw new QueryError('Invalid projection column')
    if(json){
      if(codecs[json[1]]!=='jsonb')throw new QueryError('Invalid JSON projection')
      projection[alias]='text'
      const field=`t.${identifier(json[1])}`,path=`'$.${json[2]}'`
      return `CASE json_type(${field},${path}) WHEN 'true' THEN 'true' WHEN 'false' THEN 'false' ELSE cast(json_extract(${field},${path}) AS TEXT) END AS ${identifier(alias)}`
    }
    if (!Object.hasOwn(codecs,key)) throw new QueryError('Invalid projection column')
    projection[alias] = codecs[key]
    return `t.${identifier(key)} AS ${identifier(alias)}`
  }).join(',')
  const ordering = query.get('order') ? split(query.get('order')!).map(part => {
    const [name, direction = 'asc', nulls] = part.split('.')
    if (!['asc','desc'].includes(direction) || (nulls && !['nullsfirst','nullslast'].includes(nulls))) throw new QueryError('Invalid ordering')
    if (!Object.hasOwn(codecs,name)) throw new QueryError('Unknown order column')
    return `t.${identifier(name)} ${direction.toUpperCase()} NULLS ${nulls ? nulls === 'nullsfirst' ? 'FIRST' : 'LAST' : direction === 'desc' ? 'FIRST' : 'LAST'}`
  }).join(',') : defaultOrder
  const integer = (raw: string | null, fallback: number, maximum: number) => {
    if (raw === null) return fallback
    if (!/^\d+$/.test(raw) || Number(raw) > maximum) throw new QueryError('Query range exceeds budget')
    return Number(raw)
  }
  const limit = Math.min(defaultLimit,integer(query.get('limit'),defaultLimit,4000))
  const offset = integer(query.get('offset'),0,1_600_000)
  const from = `FROM ${identifier(table)} t WHERE ${clauses.map(c => `(${c})`).join(' AND ')}`
  return {
    where: clauses.map(c => `(${c})`).join(' AND '), table,
    sql: `SELECT ${selection} ${from}${ordering ? ` ORDER BY ${ordering}` : ''} LIMIT ${limit} OFFSET ${offset}`,
    countSql: `SELECT count(*) AS count ${from}`, params, offset,
    codecs: selected === '*' ? codecs : projection,
    count: /(?:^|,)count=(?:exact|planned|estimated)(?:,|$)/.test(headers.get('prefer') || ''),
    head: method === 'HEAD', singular: (headers.get('accept') || '').includes('application/vnd.pgrst.object+json'),
  }
}

export function createD1ReadFetch(database: ReadDatabase, principal: ReadPrincipal = { userId: null }): typeof fetch {
  return async (input, init) => {
    try {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
      const method = init?.method || (input instanceof Request ? input.method : 'GET')
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined))
      const signal = init?.signal || (input instanceof Request ? input.signal : undefined)
      signal?.throwIfAborted()
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
      const plan = compileRead({ url, method, headers, body }, principal)
      const sql = plan.head ? [plan.countSql] : plan.count ? [plan.sql,plan.countSql] : [plan.sql]
      const statements = sql.map(s => database.prepare(s).bind(...plan.params))
      // Batch makes count + page observe the same D1 snapshot.
      const result = statements.length > 1 ? await database.batch(statements) : [await statements[0].all()]
      signal?.throwIfAborted()
      const rows = plan.head ? [] : result[0].results.map(row => Object.fromEntries(Object.entries(row).map(([key,value]) => [key,
        value === null ? null : plan.codecs[key] === 'bool' ? value === 1 : ['jsonb','_text'].includes(plan.codecs[key]) ? JSON.parse(String(value)) : value])))
      if (plan.singular && rows.length !== 1) return Response.json({ code: 'PGRST116', message: 'Cannot coerce the result to a single JSON object', details: `The result contains ${rows.length} rows`, hint: null }, { status: 406 })
      const responseHeaders = new Headers({ 'Content-Type':'application/json', 'Cache-Control':'private, no-store' })
      if (plan.count) responseHeaders.set('Content-Range', `${rows.length ? `${plan.offset}-${plan.offset + rows.length - 1}` : '*'}/${result.at(-1)!.results[0].count}`)
      return new Response(plan.head ? null : JSON.stringify(plan.singular ? rows[0] : rows), { headers: responseHeaders })
    } catch (error) {
      if (error instanceof Error && ['AbortError','TimeoutError'].includes(error.name)) throw error
      // SQL errors can embed private values. Return a fixed message only.
      return Response.json({ code: error instanceof QueryError ? error.code : 'D1_READ_FAILED', message: error instanceof QueryError ? error.message : 'Database read unavailable', details: null, hint: null },
        { status: error instanceof QueryError ? error.status : 503, headers: { 'Cache-Control':'private, no-store' } })
    }
  }
}
