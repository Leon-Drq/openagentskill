// Execute the actual routes and byte verification with isolated auth/storage/DB
// doubles. Never download a third-party Skill or write production metrics.
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const { NextRequest } = require('next/server')
const modules = new Map()
const sha = text => createHash('sha256').update(text).digest('hex')
const raw = '---\nname: test-skill\ndescription: Write a plain text summary.\n---\n# Summary\nRead the provided text and summarize it.\n'
let user = { id: 'account-a', is_anonymous: false }, blocked = false, ledgerFailure = false, visible = true, storageFailure = false, entitled = true
let row = { slug: 'test-skill', source_path: 'SKILL.md', source_commit_sha: 'a'.repeat(40), source_sync_status: 'current', source_content_hash: sha(raw), long_description: raw, install_command: 'npx skills add example/repo', listing_status: 'owner_published' }
let bytes = new TextEncoder().encode('paid instructions')
let release = { skill_slug: 'launch-card-studio', version: '1.0.0', object_path: 'fixture', size_bytes: bytes.length, sha256: sha(bytes), delivery_kind: 'skill-instructions' }
const receipts = new Set(), totals = new Map()
let writes = 0, lastFilter = ''
const admin = {
  rpc: async (_name, args) => {
    if (ledgerFailure) return { error: new Error('ledger unavailable') }
    writes++
    const key = args.p_user_id + ':' + args.p_slug
    if (!receipts.has(key)) { receipts.add(key); totals.set(args.p_slug, (totals.get(args.p_slug) || 0) + 1) }
    return { data: totals.get(args.p_slug), error: null }
  },
  storage: { from: () => ({ info: async () => ({ data: { size: release.size_bytes } }), download: async () => storageFailure ? { error: new Error('storage') } : { data: new Blob([bytes]) }, createSignedUrl: async () => ({ data: { signedUrl: 'https://storage.example/file' } }) }) },
}
const publicDb = { from: () => { const q = { select: () => q, eq: () => q, or: filter => { lastFilter = filter; return q }, maybeSingle: async () => ({ data: visible ? row : null, error: null }) }; return q } }
function load(path) {
  const absolute = resolve(path)
  if (modules.has(absolute)) return modules.get(absolute)
  const output = {}; modules.set(absolute, output)
  const source = ts.transpileModule(readFileSync(absolute,'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('exports','require',source)(output, name => {
    if (name === 'server-only') return {}
    if (name === 'next/cache') return { unstable_cache: fn => fn }
    if (name === '@/lib/supabase/admin') return { createAdminClient: () => admin }
    if (name === '@/lib/supabase/public') return { createPublicClient: () => publicDb }
    if (name === '@/lib/supabase/server') return { createClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) } }) }
    if (name === '@/lib/agent-safety') return { getAgentSafetyProfile: () => ({ blocked }) }
    if (name === '@/lib/audits') return { buildSkillAudit: () => ({}) }
    if (name === '@/lib/payments/server') {
      const actual = load('lib/payments/server.ts')
      return { ...actual, downloadableRelease: async () => { if (!entitled) throw new actual.PaymentError('purchase_required',403); return release } }
    }
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? resolve(name.slice(2)) : resolve(dirname(absolute),name)
      if (base.endsWith('.json')) return JSON.parse(readFileSync(base,'utf8'))
      for (const suffix of ['', '.ts', '.tsx']) if (existsSync(base+suffix)) return load(base+suffix)
    }
    return require(name)
  })
  return output
}
const free = load('app/api/skills/[slug]/download/route.ts').POST
const paid = load('app/api/payments/download/route.ts').POST
const request = (body = {}, origin='https://www.openagentskill.com', accept='application/octet-stream') => new NextRequest('https://www.openagentskill.com/api/download', { method:'POST', headers:{ origin, 'content-type':'application/json', accept }, body:JSON.stringify(body) })
const download = (req=request(), slug='test-skill') => free(req,{ params:Promise.resolve({slug}) })
assert.equal((await download(request({},'https://evil.example'))).status,403)
assert.equal((await download(request({ arbitrary:'payload' }))).status,400)
user = null; assert.equal((await download()).status,401)
user = {id:'account-a',is_anonymous:true}; assert.equal((await download()).status,401)
user.is_anonymous=false
visible=false; assert.equal((await download()).status,404); visible=true
blocked=true; assert.equal((await download()).status,409); blocked=false
row.source_sync_status='changed'; assert.equal((await download()).status,409); row.source_sync_status='current'
row.long_description+='corrupt'; assert.equal((await download()).status,409); row.long_description=raw
assert.equal((await download(request(),'launch-card-studio')).status,409,'paid document cannot bypass entitlement route')
assert.equal(writes,0,'invalid, anonymous, withdrawn, changed and blocked downloads never count')
let response = await download()
assert.equal(response.status,200); assert.equal(await response.text(),raw)
assert.match(response.headers.get('content-disposition'),/test-skill-SKILL.md/)
assert.match(response.headers.get('cache-control'),/private, no-store/)
assert.equal(response.headers.get('x-content-type-options'),'nosniff')
assert.equal(lastFilter,load('lib/skills/publication.ts').PUBLIC_SKILL_FILTER)
assert.equal(totals.get('test-skill'),1)
await download(); assert.equal(totals.get('test-skill'),1)
user.id='account-b'; await download(); assert.equal(totals.get('test-skill'),2)
ledgerFailure=true; assert.equal((await download()).status,503); ledgerFailure=false
const before = writes
entitled=false; assert.equal((await paid(request({slug:release.skill_slug}))).status,403); entitled=true
storageFailure=true; assert.equal((await paid(request({slug:release.skill_slug}))).status,503); storageFailure=false
const original = bytes; bytes=new TextEncoder().encode('corrupt'); assert.equal((await paid(request({slug:release.skill_slug}))).status,503); bytes=original
assert.equal(writes,before,'failed paid transfers never count')
response=await paid(request({slug:release.skill_slug})); assert.equal(response.status,200)
assert.equal(await response.text(),'paid instructions'); assert.equal(totals.get(release.skill_slug),1)
await paid(request({slug:release.skill_slug},undefined,'application/json'))
assert.equal(totals.get(release.skill_slug),1,'legacy signed-link creation is not a download')
const { verifiedDownloadBytes } = load('lib/skills/download-policy.ts')
assert.equal(verifiedDownloadBytes(bytes,0,sha(bytes)),false)
assert.equal(verifiedDownloadBytes(bytes,21*1024*1024,sha(bytes)),false)
const { sortDirectoryCandidates } = load('lib/skills/directory.ts')
const records = [{record:{slug:'legacy',downloads:35000,site_downloads:1}},{record:{slug:'real',downloads:0,site_downloads:4}}]
assert.equal(sortDirectoryCandidates(records,'downloads')[0].record.slug,'real','ranking never uses legacy download estimates')
assert.equal(load('lib/skills/catalog-query.ts').catalogSortColumn('downloads'),'site_downloads')
const projection=readFileSync('supabase/migrations/20261013180212_directory_download_projection.sql','utf8')
assert.match(projection,/security_invoker = true/)
assert.match(projection,/taxonomy_version, site_downloads/,'the public view and its slug RPC must expose the new sort column')
assert.match(projection,/and not exists/,'retain source deduplication')
const { paidMotionWindow } = load('lib/motion/directory.ts')
const ranked=paidMotionWindow([{id:'m',n:3}],[{id:'a',n:4},{id:'b',n:1}],0,2,{motion:x=>x.n,registry:x=>x.n})
assert.deepEqual(ranked.motionEntries.map(x=>x.id),['m']); assert.deepEqual(ranked.registryEntries.map(x=>x.id),['a'])
const React = require('react'), {renderToStaticMarkup}=require('react-dom/server')
const { SkillDownloadCount }=load('components/skill-download-count.tsx')
for(const locale of ['en','zh','ja','ko','es','de','fr','id']) {
  const html=renderToStaticMarkup(React.createElement(SkillDownloadCount,{locale,count:26}))
  assert.match(html,/data-site-downloads="26"/)
  const unknown=renderToStaticMarkup(React.createElement(SkillDownloadCount,{locale,count:null}))
  assert.match(unknown,/data-site-downloads="unknown"/); assert.match(unknown,/—/)
}
console.log('Site downloads: actual bytes/hash, authenticated access, visibility, paid entitlement gate, CSRF, failed writes/transfers, duplicate requests, real-count sorting and 8-locale badges passed.')
