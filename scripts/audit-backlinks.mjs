#!/usr/bin/env node
/** Public HTTP evidence only. Does not log in, execute page scripts, or estimate DR. */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { parse } from 'parse5'

const USER_AGENT = 'OpenAgentSkillBacklinkAudit/1.0 (+https://www.openagentskill.com)'
const DEFAULTS = { timeoutMs: 15000, maxBytes: 1_500_000, maxRedirects: 5, concurrency: 2, maxTargetChecks: 20 }
const REDIRECTS = new Set([301, 302, 303, 307, 308])
const HEADER_ALIASES = {
  sourceUrl: ['sourceurl', 'source', 'referringpageurl', 'referringpage', 'sourcepageurl'],
  expectedTargetUrl: ['targeturl', 'expectedtargeturl', 'target', 'linkurl'],
  firstCheckedAt: ['firstcheckedat'],
  note: ['note', 'notes'],
}

function failure(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

// Conservative public-address allowlist. IPv6 transition/tunnel addresses are rejected.
export function isPublicAddress(address) {
  const ip = address.replace(/^\[|\]$/g, '').toLowerCase()
  if (isIP(ip) === 4) {
    const [a, b, c] = ip.split('.').map(Number)
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 192 && b === 0 && c === 2) || (a === 198 && [18, 19, 51].includes(b)) ||
      (a === 203 && b === 0 && c === 113))
  }
  if (isIP(ip) === 6) {
    const prefix = Number.parseInt(ip.split(':')[0], 16)
    return prefix >= 0x2000 && prefix < 0x3fff && !(prefix === 0x2001 && Number.parseInt(ip.split(':')[1] || '0', 16) < 0x200) && !/^2001:0?db8:/.test(ip) && !ip.startsWith('2002:')
  }
  return false
}

export async function validatePublicUrl(value, resolve = lookup) {
  let url
  try { url = new URL(value) } catch { throw failure('unsafe_url', 'Invalid absolute URL') }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) {
    throw failure('unsafe_url', 'Only HTTP(S), default ports, and URLs without credentials are allowed')
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase()
  if (!hostname.includes('.') && !isIP(hostname) || /(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid|example)$/.test(hostname) || hostname.endsWith('.home.arpa')) {
    throw failure('unsafe_url', 'Local or reserved hostname rejected')
  }
  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await resolve(hostname, { all: true, verbatim: true })
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw failure('unsafe_address', 'DNS returned a non-public or reserved address')
  }
  url.hash = ''
  return { url: url.href, address: addresses.find((entry) => entry.family === 4) || addresses[0] }
}

// Pins the validated DNS address at connection time, preventing a second DNS lookup/rebinding.
function pinnedFetch(value, { address, signal, maxBytes }) {
  return new Promise((resolve, reject) => {
    const url = new URL(value)
    const transport = url.protocol === 'https:' ? https : http
    const request = transport.request(url, {
      method: 'GET', signal, headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,text/plain;q=0.9,*/*;q=0.1', 'Accept-Encoding': 'identity' },
      lookup: (_host, options, callback) => options.all ? callback(null, [address]) : callback(null, address.address, address.family),
    }, (response) => {
      const headers = new Headers()
      for (const [name, values] of Object.entries(response.headers)) {
        for (const value of Array.isArray(values) ? values : [values]) if (value !== undefined) headers.append(name, value)
      }
      const status = response.statusCode || 0
      if (REDIRECTS.has(status) || status >= 400) {
        response.resume()
        resolve({ status, headers, body: null })
        request.destroy()
        return
      }
      const length = Number(headers.get('content-length'))
      if (length > maxBytes || !['', 'identity'].includes(headers.get('content-encoding') || '')) {
        request.destroy(failure('body_limit', 'Oversized or unexpectedly encoded response'))
        return
      }
      const chunks = []
      let bytes = 0
      response.on('data', (chunk) => {
        bytes += chunk.length
        if (bytes > maxBytes) request.destroy(failure('body_limit', 'Response exceeded byte limit'))
        else chunks.push(chunk)
      })
      response.on('error', reject)
      response.on('end', () => resolve({ status, headers, body: Buffer.concat(chunks).toString('utf8') }))
    })
    request.on('error', reject)
    request.end()
  })
}

export async function safeGet(value, options = {}) {
  const settings = { ...DEFAULTS, ...options }
  const fetcher = settings.fetcher || pinnedFetch
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), settings.timeoutMs)
  const chain = []
  const seen = new Set()
  let current = value
  const bounded = (promise) => new Promise((resolve, reject) => {
    const abort = () => reject(failure('timeout', 'Request deadline exceeded'))
    if (controller.signal.aborted) { abort(); return }
    controller.signal.addEventListener('abort', abort, { once: true })
    promise.then(resolve, reject).finally(() => controller.signal.removeEventListener('abort', abort))
  })
  try {
    for (let hop = 0; hop <= settings.maxRedirects; hop += 1) {
      const validated = await bounded(validatePublicUrl(current, settings.resolve))
      if (seen.has(validated.url)) throw failure('redirect_loop', 'Redirect loop')
      seen.add(validated.url)
      if (settings.beforeRequest) await bounded(settings.beforeRequest(validated.url))
      controller.signal.throwIfAborted()
      const response = await bounded(fetcher(validated.url, { address: validated.address, signal: controller.signal, maxBytes: settings.maxBytes }))
      chain.push({ url: validated.url, status: response.status, location: response.headers.get('location') })
      if (REDIRECTS.has(response.status)) {
        if (!response.headers.get('location')) throw failure('invalid_redirect', 'Redirect without Location')
        if (hop === settings.maxRedirects) throw failure('redirect_limit', 'Redirect limit exceeded')
        current = new URL(response.headers.get('location'), validated.url).href
        continue
      }
      let body = response.body
      // Injected fetches can return ordinary Response objects for offline tests.
      if (body !== null && typeof body !== 'string') {
        if (Number(response.headers.get('content-length')) > settings.maxBytes) throw failure('body_limit', 'Response exceeded byte limit')
        const reader = body.getReader()
        const chunks = []
        let total = 0
        while (true) {
          const { done, value: chunk } = await bounded(reader.read())
          if (done) break
          total += chunk.byteLength
          if (total > settings.maxBytes) { await reader.cancel(); throw failure('body_limit', 'Response exceeded byte limit') }
          chunks.push(Buffer.from(chunk))
        }
        body = Buffer.concat(chunks).toString('utf8')
      }
      return { status: response.status, headers: response.headers, body: body || '', finalUrl: validated.url, chain }
    }
  } catch (error) {
    error.chain = chain
    if (controller.signal.aborted) error.code = 'timeout'
    throw error
  } finally { clearTimeout(timeout) }
}

export function robotsAllows(text, url, agent = 'openagentskillbacklinkaudit') {
  const groups = []
  let group = null
  let hasRules = false
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim()
    const match = /^([^:]+):\s*(.*)$/.exec(line)
    if (!match) continue
    const key = match[1].trim().toLowerCase(), value = match[2].trim()
    if (key === 'user-agent') {
      if (!group || hasRules) { group = { agents: [], rules: [] }; groups.push(group); hasRules = false }
      if (value) group.agents.push(value.toLowerCase())
    } else if (group && ['allow', 'disallow'].includes(key)) { hasRules = true; if (value) group.rules.push({ allow: key === 'allow', path: value }) }
  }
  const product = agent.toLowerCase()
  const ranked = groups.map((group) => ({ group, specificity: Math.max(0, ...group.agents.filter((name) => name !== '*' && product.includes(name)).map((name) => name.length)) }))
  const mostSpecific = Math.max(0, ...ranked.map(({ specificity }) => specificity))
  // Merge only equally specific matching groups. A shorter token or wildcard
  // must not override the publisher's rule for this exact crawler product.
  const selected = mostSpecific > 0 ? ranked.filter(({ specificity }) => specificity === mostSpecific).map(({ group }) => group) : groups.filter((group) => group.agents.includes('*'))
  const requestPath = new URL(url).pathname + new URL(url).search
  const matched = selected.flatMap((g) => g.rules).filter((rule) => {
    const end = rule.path.endsWith('$')
    const pattern = (end ? rule.path.slice(0, -1) : rule.path).split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')
    return new RegExp(`^${pattern}${end ? '$' : ''}`).test(requestPath)
  }).sort((a, b) => b.path.replace(/[*$]/g, '').length - a.path.replace(/[*$]/g, '').length || Number(b.allow) - Number(a.allow))
  return matched[0]?.allow ?? true
}

function attributes(node) { return Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value])) }
function textContent(node) {
  if (['script', 'style', 'template'].includes(node.tagName)) return ''
  return node.nodeName === '#text' ? node.value : (node.childNodes || []).map(textContent).join(' ')
}
function walk(node, visit) { visit(node); for (const child of node.childNodes || []) walk(child, visit) }
export function matchesTarget(url, targetDomain = 'openagentskill.com') {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password &&
      (parsed.hostname.toLowerCase() === targetDomain || parsed.hostname.toLowerCase().endsWith(`.${targetDomain}`))
  } catch { return false }
}

export function extractLinks(html, pageUrl, targetDomain = 'openagentskill.com', headerRobots = '') {
  const document = parse(html, { sourceCodeLocationInfo: true })
  let baseUrl = pageUrl, baseFound = false
  let pageNofollow = /(?:^|[,\s])(?:nofollow|none)(?:$|[,\s])/i.test(headerRobots)
  walk(document, (node) => {
    const attrs = attributes(node)
    if (node.tagName === 'base' && attrs.href && !baseFound) {
      baseFound = true
      try { baseUrl = new URL(attrs.href, pageUrl).href } catch { /* invalid base: use document URL */ }
    }
    if (node.tagName === 'meta' && ['robots', 'googlebot'].includes((attrs.name || '').toLowerCase()) && /(?:^|[,\s])(?:nofollow|none)(?:$|[,\s])/i.test(attrs.content || '')) pageNofollow = true
  })
  const links = []
  walk(document, (node) => {
    if (node.tagName !== 'a') return
    const attrs = attributes(node)
    if (!attrs.href) return
    let href
    try { href = new URL(attrs.href, baseUrl).href } catch { return }
    if (!matchesTarget(href, targetDomain)) return
    const rel = [...new Set((attrs.rel || '').toLowerCase().split(/\s+/).filter(Boolean))].sort()
    links.push({ targetUrl: href, rawHref: attrs.href, anchorText: textContent(node).replace(/\s+/g, ' ').trim().slice(0, 300), rel,
      nofollow: rel.includes('nofollow'), ugc: rel.includes('ugc'), sponsored: rel.includes('sponsored'), pageNofollow,
      qualification: rel.some((value) => ['nofollow', 'ugc', 'sponsored'].includes(value)) || pageNofollow ? 'qualified' : 'unqualified',
      evidence: { line: node.sourceCodeLocation?.startLine ?? null, html: html.slice(node.sourceCodeLocation?.startOffset || 0, Math.min(node.sourceCodeLocation?.endOffset || 0, (node.sourceCodeLocation?.startOffset || 0) + 700)) },
    })
  })
  return { links, pageNofollow, brandMention: /openagentskill/i.test(textContent(document)), bodySha256: createHash('sha256').update(html).digest('hex') }
}

export function parseCsv(text) {
  const rows = [], row = []
  let field = '', quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1 } else quoted = !quoted
    } else if (char === ',' && !quoted) { row.push(field); field = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field); if (row.some((cell) => cell.trim())) rows.push([...row]); row.length = 0; field = ''
    } else field += char
  }
  if (quoted) throw new Error('Unclosed CSV quoted field')
  row.push(field); if (row.some((cell) => cell.trim())) rows.push(row)
  const headers = rows.shift() || []
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header.replace(/^\uFEFF/, ''), cells[index] || ''])))
}

export function normalizeRows(input) {
  const rows = Array.isArray(input) ? input : input.sources
  if (!Array.isArray(rows)) throw new Error('Input must be an array, { sources: [...] }, or a CSV with source_url')
  if (rows.length > 10000) throw new Error('Split exports into batches of at most 10,000 rows')
  const sources = new Map()
  rows.forEach((row, index) => {
    const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ''), value]))
    const result = Object.fromEntries(Object.entries(HEADER_ALIASES).map(([key, aliases]) => [key, String(aliases.map((alias) => normalized[alias]).find((value) => value !== undefined && value !== '') || '').trim()]))
    if (!result.sourceUrl) throw new Error(`Row ${index + 1}: source_url / Referring page URL is required`)
    let key = result.sourceUrl
    try { const url = new URL(key); url.hash = ''; key = url.href } catch { /* report unsafe input as unknown */ }
    const existing = sources.get(key)
    if (existing) {
      if (result.expectedTargetUrl && !existing.expectedTargets.includes(result.expectedTargetUrl)) existing.expectedTargets.push(result.expectedTargetUrl)
    } else sources.set(key, { sourceUrl: key, expectedTargets: result.expectedTargetUrl ? [result.expectedTargetUrl] : [], note: result.note,
      firstCheckedAt: result.firstCheckedAt && Number.isFinite(Date.parse(result.firstCheckedAt)) ? new Date(result.firstCheckedAt).toISOString() : null })
  })
  return [...sources.values()]
}

export async function auditBacklinks(input, options = {}) {
  const settings = { ...DEFAULTS, ...options }
  settings.concurrency = Math.max(1, Math.min(4, Number(settings.concurrency) || 2))
  const checkedAt = options.checkedAt || new Date().toISOString()
  const rows = normalizeRows(input)
  const robotCache = new Map(), targetCache = new Map()
  const previous = new Map((options.previous?.sources || []).map((row) => [row.sourceUrl, row.firstCheckedAt]))
  async function checkRobots(value) {
    const origin = new URL(value).origin
    if (!robotCache.has(origin)) robotCache.set(origin, (async () => {
      try {
        const response = await safeGet(`${origin}/robots.txt`, { ...settings, beforeRequest: undefined, maxBytes: 256000 })
        if ([404, 410].includes(response.status)) return { allowed: true, text: '', status: response.status }
        if (response.status < 200 || response.status >= 300) return { allowed: false, reason: `robots_http_${response.status}` }
        return { allowed: true, text: response.body, status: response.status }
      } catch (error) { return { allowed: false, reason: `robots_${error.code || 'network_error'}` } }
    })())
    const robots = await robotCache.get(origin)
    if (!robots.allowed) throw failure('robots_unknown', robots.reason)
    if (!robotsAllows(robots.text, value)) throw failure('robots_disallowed', 'robots.txt disallows this URL')
  }
  const request = (url) => safeGet(url, { ...settings, beforeRequest: checkRobots })
  async function inspectTarget(url) {
    const normalized = new URL(url); normalized.hash = ''
    const key = normalized.href
    if (!targetCache.has(key)) targetCache.set(key, (async () => {
      try {
        const result = await request(key)
        return { state: [404, 410].includes(result.status) ? 'broken' : result.status >= 200 && result.status < 300 ? (matchesTarget(result.finalUrl) ? 'reachable' : 'external_redirect') : 'unknown',
          status: result.status, finalUrl: result.finalUrl, redirectChain: result.chain }
      } catch (error) { return { state: 'unknown', reason: error.code || 'network_error', detail: error.message, redirectChain: error.chain || [] } }
    })())
    return targetCache.get(key)
  }
  const sources = new Array(rows.length)
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(settings.concurrency, rows.length) }, async () => {
    while (cursor < rows.length) {
      const index = cursor++, row = rows[index]
      const record = { ...row, firstCheckedAt: previous.get(row.sourceUrl) || row.firstCheckedAt || checkedAt, checkedAt, state: 'unknown', links: [] }
      sources[index] = record
      try {
        const result = await request(row.sourceUrl)
        Object.assign(record, { sourceStatus: result.status, finalUrl: result.finalUrl, redirectChain: result.chain })
        if (result.status < 200 || result.status >= 300) { record.reason = `source_http_${result.status}`; continue }
        if (!/^(?:text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(result.headers.get('content-type') || '')) { record.reason = 'non_html_response'; continue }
        const extracted = extractLinks(result.body, result.finalUrl, 'openagentskill.com', result.headers.get('x-robots-tag') || '')
        Object.assign(record, extracted, { state: extracted.links.length ? 'links_observed' : 'no_anchor_in_fetched_html', observedAnchorCount: extracted.links.length })
        record.expectedTargetsObserved = row.expectedTargets.map((target) => ({ targetUrl: target, exactAnchorObserved: extracted.links.some((link) => link.targetUrl === target) }))
        if (record.links.length > 100) { record.links = record.links.slice(0, 100); record.linksTruncated = true }
        let targetChecks = 0
        for (const link of record.links) {
          link.targetCheck = targetChecks++ < settings.maxTargetChecks ? await inspectTarget(link.targetUrl) : { state: 'unknown', reason: 'per_source_target_budget' }
        }
      } catch (error) { record.reason = error.code || 'network_error'; record.detail = error.message; record.redirectChain = error.chain || [] }
    }
  }))
  return { schemaVersion: 1, checkedAt, scope: 'User-supplied public source URLs only; fetched HTML is not rendered. This is not a complete backlink index or a DR estimate.',
    settings: { ...DEFAULTS, concurrency: settings.concurrency, robotsPolicy: 'Respect disallow; unavailable/blocked robots stops page fetch; no automatic retries', transport: 'HTTP(S) GET; public DNS checked and pinned on every hop' },
    summary: summarize(sources), sources }
}

export function summarize(sources) {
  const observed = sources.filter((source) => source.state === 'links_observed')
  const hosts = new Set(observed.map((source) => new URL(source.finalUrl || source.sourceUrl).hostname.replace(/^www\./, '')).filter((host) => !matchesTarget(`https://${host}`)))
  return { sourcePagesChecked: sources.length, sourcePagesWithAnchors: observed.length,
    sourcePagesWithoutAnchorsInFetchedHtml: sources.filter((source) => source.state === 'no_anchor_in_fetched_html').length,
    unknownSourcePages: sources.filter((source) => source.state === 'unknown').length,
    uniqueExternalSourceHostsWithAnchors: hosts.size,
    observedAnchors: observed.reduce((total, source) => total + source.observedAnchorCount, 0),
    note: 'Unique hosts collapse www only; this is not provider referring-domain (registrable-domain) counting. Repeated links/pages on one host are counted once. Unqualified rel is an observation, not a guarantee of indexing or ranking credit.' }
}

function csvCell(value) {
  let text = value == null ? '' : String(value)
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}
export function reportCsv(report) {
  const columns = ['source_url', 'first_checked_at', 'checked_at', 'source_state', 'source_status', 'target_url', 'anchor_text', 'rel', 'page_nofollow', 'target_state', 'target_status', 'reason']
  const rows = report.sources.flatMap((source) => (source.links.length ? source.links : [null]).map((link) => [source.sourceUrl, source.firstCheckedAt, source.checkedAt, source.state, source.sourceStatus, link?.targetUrl, link?.anchorText, link?.rel.join(' '), link?.pageNofollow, link?.targetCheck.state, link?.targetCheck.status, source.reason || link?.targetCheck.reason]))
  return [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\n') + '\n'
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help') || !args.length) {
    console.log('Usage: node scripts/audit-backlinks.mjs --input sources.csv|json --output report.json [--csv report.csv] [--previous old-report.json] [--concurrency 1..4]\nInput: source_url (required), target_url (optional expected link), note, first_checked_at. Common Ahrefs/Semrush source/target URL headings are accepted. Public HTTP only, robots respected, no retries. No credentials required.')
    return
  }
  const allowed = new Set(['--input', '--output', '--csv', '--previous', '--concurrency'])
  const flags = {}
  for (let i = 0; i < args.length; i += 2) {
    if (!allowed.has(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Invalid argument: ${args[i]}`)
    flags[args[i]] = args[i + 1]
  }
  if (!flags['--input'] || !flags['--output']) throw new Error('--input and --output are required')
  const content = await readFile(flags['--input'], 'utf8')
  const input = flags['--input'].toLowerCase().endsWith('.csv') ? parseCsv(content) : JSON.parse(content.replace(/^\uFEFF/, ''))
  const previous = flags['--previous'] ? JSON.parse(await readFile(flags['--previous'], 'utf8')) : undefined
  const report = await auditBacklinks(input, { previous, concurrency: flags['--concurrency'] })
  await mkdir(path.dirname(path.resolve(flags['--output'])), { recursive: true })
  await writeFile(flags['--output'], JSON.stringify(report, null, 2) + '\n')
  if (flags['--csv']) { await mkdir(path.dirname(path.resolve(flags['--csv'])), { recursive: true }); await writeFile(flags['--csv'], reportCsv(report)) }
  console.log(JSON.stringify(report.summary, null, 2))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1 })
