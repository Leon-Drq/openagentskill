import assert from 'node:assert/strict'
import { auditBacklinks, extractLinks, isPublicAddress, matchesTarget, normalizeRows, parseCsv, reportCsv, robotsAllows, safeGet, summarize, validatePublicUrl } from './audit-backlinks.mjs'

const resolve = async () => [{ address: '93.184.216.34', family: 4 }]
const response = (body = '', status = 200, headers = {}) => new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', ...headers } })
const html = `<base href="https://www.openagentskill.com/docs/"><p>OpenAgentSkill</p>
<a href="/creator-kit" rel="UGC   NoFollow sponsored">Read <b>the kit</b></a>
<a href="https://openagentskill.com/reports?a=1&amp;b=2" rel="noopener">Report</a>
<a href="https://openagentskill.com.evil.org/">not ours</a>
<a href="https://openagentskill.com@evil.org/">not ours</a>
<a href="javascript:openagentskill.com">not a web link</a>`
const extracted = extractLinks(html, 'https://publisher.org/post')
assert.equal(extracted.links.length, 2)
assert.deepEqual(extracted.links[0].rel, ['nofollow', 'sponsored', 'ugc'])
assert.equal(extracted.links[0].anchorText, 'Read the kit')
assert.equal(extracted.links[0].targetUrl, 'https://www.openagentskill.com/creator-kit')
assert.equal(extracted.links[0].qualification, 'qualified')
assert.equal(extracted.links[1].targetUrl, 'https://openagentskill.com/reports?a=1&b=2')
assert.equal(extracted.links[1].qualification, 'unqualified')
assert.ok(extracted.links[0].evidence.html.startsWith('<a '))
assert.equal(extractLinks('<meta name="robots" content="noindex, nofollow"><a href="https://openagentskill.com">link</a>', 'https://publisher.org').links[0].pageNofollow, true)
assert.equal(extractLinks('<a href="https://openagentskill.com">link</a>', 'https://publisher.org', 'openagentskill.com', 'googlebot: nofollow').links[0].pageNofollow, true)
assert.equal(extractLinks('<code>https://openagentskill.com</code>', 'https://publisher.org').links.length, 0)
for (const url of ['https://openagentskill.com.evil.org', 'https://openagentskill.com@evil.org', 'ftp://openagentskill.com', 'https://user@openagentskill.com']) assert.equal(matchesTarget(url), false, url)
assert.equal(matchesTarget('https://www.openagentskill.com'), true)

for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '172.16.1.1', '192.168.1.1', '100.64.0.1', '198.18.0.1', '192.0.2.1', '203.0.113.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '2001:db8::1', '2002:7f00:1::1', '2001:20::1', '3fff::1']) assert.equal(isPublicAddress(address), false, address)
for (const address of ['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111', '2001:4860:4860::8888']) assert.equal(isPublicAddress(address), true, address)
for (const url of ['file:///etc/passwd', 'http://localhost', 'http://127.1', 'http://2130706433', 'http://[::1]', 'http://server.local', 'http://user:pass@publisher.org', 'https://publisher.org:444']) await assert.rejects(validatePublicUrl(url, resolve))
await assert.rejects(validatePublicUrl('https://mixed.org', async () => [{ address: '1.1.1.1', family: 4 }, { address: '10.0.0.1', family: 4 }]))

assert.equal(robotsAllows('User-agent: *\nDisallow: /private\nAllow: /private/public$', 'https://publisher.org/private/page'), false)
assert.equal(robotsAllows('User-agent: *\nDisallow: /private\nAllow: /private/public$', 'https://publisher.org/private/public'), true)
assert.equal(robotsAllows('User-agent: *\nDisallow: /\nUser-agent: OpenAgentSkillBacklinkAudit\nAllow: /', 'https://publisher.org/page'), true)
assert.equal(robotsAllows('User-agent: *\nDisallow: /*?secret=', 'https://publisher.org/page?secret=1'), false)
assert.equal(robotsAllows('User-agent: OpenAgentSkill\nAllow: /\nUser-agent: OpenAgentSkillBacklinkAudit\nDisallow: /', 'https://publisher.org/page'), false, 'shorter product token cannot override an exact-product disallow')
assert.equal(robotsAllows('User-agent: *\nAllow: /\nUser-agent: OpenAgentSkill\nAllow: /\nUser-agent: OPENAGENTSKILLBACKLINKAUDIT\nDisallow: /private\nUser-agent: OpenAgentSkillBacklinkAudit\nAllow: /private/public', 'https://publisher.org/private/page'), false)
assert.equal(robotsAllows('User-agent: *\nAllow: /\nUser-agent: OpenAgentSkill\nAllow: /\nUser-agent: OPENAGENTSKILLBACKLINKAUDIT\nDisallow: /private\nUser-agent: OpenAgentSkillBacklinkAudit\nAllow: /private/public', 'https://publisher.org/private/public/article'), true, 'equally specific product groups are merged case-insensitively')
assert.equal(robotsAllows('User-agent: \nAllow: /\nUser-agent: *\nDisallow: /', 'https://publisher.org/page'), false, 'empty user-agent token does not hide the wildcard group')

const calls = []
const redirected = await safeGet('https://publisher.org/start', { resolve, fetcher: async (url, options) => {
  calls.push({ url, address: options.address.address })
  return url.endsWith('/start') ? response('', 301, { location: '/end' }) : response('done')
} })
assert.deepEqual(redirected.chain.map((hop) => hop.status), [301, 200])
assert.equal(calls[1].address, '93.184.216.34')
let redirectRequests = 0
await assert.rejects(safeGet('https://publisher.org/', { resolve, fetcher: async () => { redirectRequests += 1; return response('', 302, { location: 'http://127.0.0.1/admin' }) } }), { code: 'unsafe_address' })
assert.equal(redirectRequests, 1)
await assert.rejects(safeGet('https://publisher.org/', { resolve, fetcher: async () => response('', 302, { location: '/' }) }), { code: 'redirect_loop' })
await assert.rejects(safeGet('https://publisher.org/', { resolve, maxBytes: 4, fetcher: async () => response('too large') }), { code: 'body_limit' })
await assert.rejects(safeGet('https://publisher.org/', { resolve: () => new Promise(() => {}), timeoutMs: 10 }), { code: 'timeout' })

const csv = '\uFEFF"Referring page URL","Target URL","note"\r\n"https://publisher.org/a","https://openagentskill.com/","A, B"\r\n"https://publisher.org/a#section","https://openagentskill.com/docs","second"'
const rows = normalizeRows(parseCsv(csv))
assert.equal(rows.length, 1)
assert.equal(rows[0].expectedTargets.length, 2)
assert.equal(rows[0].note, 'A, B')

const requestLog = []
const fixtures = {
  'https://publisher.org/robots.txt': response('User-agent: *\nDisallow: /private'),
  'https://publisher.org/a': response('<a href="https://openagentskill.com/old">Link</a><a href="https://openagentskill.com/missing" rel="nofollow">Missing</a>'),
  'https://publisher.org/b': response('<a href="https://openagentskill.com/old">Second page</a>'),
  'https://publisher.org/text': response('<p>OpenAgentSkill https://openagentskill.com</p>'),
  'https://publisher.org/error': response('denied', 403),
  'https://publisher.org/json': response('{}', 200, { 'content-type': 'application/json' }),
  'https://blocked.org/robots.txt': response('denied', 403),
  'https://openagentskill.com/robots.txt': response('', 404),
  'https://openagentskill.com/old': response('', 308, { location: '/new' }),
  'https://openagentskill.com/new': response('ok'),
  'https://openagentskill.com/missing': response('missing', 404),
}
const report = await auditBacklinks([
  ...['a', 'b', 'text', 'error', 'json', 'private'].map((name) => ({ source_url: `https://publisher.org/${name}` })),
  { source_url: 'https://blocked.org/page' }, { source_url: 'https://unavailable.org/page' },
], { resolve, checkedAt: '2026-10-18T00:00:00.000Z', previous: { sources: [{ sourceUrl: 'https://publisher.org/a', firstCheckedAt: '2026-10-01T00:00:00.000Z' }] }, fetcher: async (url) => {
  requestLog.push(url)
  const fixture = fixtures[url]
  if (!fixture) throw new Error('Offline test network error')
  return fixture.clone()
} })
assert.equal(report.sources[0].firstCheckedAt, '2026-10-01T00:00:00.000Z')
assert.equal(report.sources[0].links[0].targetCheck.status, 200)
assert.deepEqual(report.sources[0].links[0].targetCheck.redirectChain.map((hop) => hop.status), [308, 200])
assert.equal(report.sources[0].links[1].targetCheck.state, 'broken')
assert.equal(report.sources[2].state, 'no_anchor_in_fetched_html')
assert.equal(report.sources[2].brandMention, true)
assert.equal(report.sources[3].state, 'unknown')
assert.equal(report.sources[3].reason, 'source_http_403')
assert.equal(report.sources[4].reason, 'non_html_response')
assert.equal(report.sources[5].reason, 'robots_disallowed')
assert.equal(report.sources[6].reason, 'robots_unknown')
assert.equal(report.sources[7].state, 'unknown')
assert.equal(report.summary.uniqueExternalSourceHostsWithAnchors, 1)
assert.equal(report.summary.observedAnchors, 3)
assert.equal(report.summary.unknownSourcePages, 5)
const requestedUrls = new Set(requestLog)
assert.equal(requestedUrls.has('https://publisher.org/private'), false)
assert.equal(requestedUrls.has('https://blocked.org/page'), false)
assert.equal(requestLog.filter((url) => url === 'https://openagentskill.com/old').length, 1, 'target checks are reused')
const deduped = summarize([{ ...report.sources[0], finalUrl: 'https://www.publisher.org/a' }, report.sources[1]])
assert.equal(deduped.uniqueExternalSourceHostsWithAnchors, 1)
const csvOutput = reportCsv(report)
assert.ok(csvOutput.includes('"source_url"'))
assert.ok(csvOutput.includes('"source_http_403"'))
const manyAnchors = Array.from({ length: 101 }, (_, index) => `<a href="https://openagentskill.com/item/${index}">Item ${index}</a>`).join('')
const capped = await auditBacklinks([{ source_url: 'https://publisher.org/many', target_url: 'https://openagentskill.com/item/100' }], { resolve, fetcher: async (url) => url.endsWith('/robots.txt') ? response('', 404) : response(url.includes('/many') ? manyAnchors : 'ok') })
assert.equal(capped.sources[0].observedAnchorCount, 101)
assert.equal(capped.sources[0].links.length, 100)
assert.equal(capped.sources[0].linksTruncated, true)
assert.equal(capped.sources[0].expectedTargetsObserved[0].exactAnchorObserved, true, 'expected targets are checked against all observed anchors before evidence truncation')
assert.equal(capped.sources[0].links[20].targetCheck.reason, 'per_source_target_budget')
console.log('Backlink audit: HTML/rel evidence, domain confusion, public-address pinning, redirects, robots, byte/deadline limits, CSV import, unknown states, deduplication, and first-check preservation passed.')
