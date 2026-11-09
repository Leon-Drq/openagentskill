import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

// Linux CI runs the real workerd runtime with local R2/D1/DO emulation and no
// production secrets. Only public reads and blocked writes are exercised.
const homeOnly = process.argv[2] === '--home-only'
const remote = homeOnly ? undefined : process.argv[2]
if (remote && !/^https:\/\/openagentskill-migration\.[a-z0-9-]+\.workers\.dev$/.test(remote)) {
  throw new Error('Only the isolated migration workers.dev deployment can be checked remotely')
}
if (!remote && process.platform === 'win32') throw new Error('Run the local smoke check in Linux CI')
mkdirSync('.codex-tmp', { recursive: true })
const log = remote ? null : openSync('.codex-tmp/cloudflare-preview.log', 'w')
const cli = fileURLToPath(new URL('../node_modules/@opennextjs/cloudflare/dist/cli/index.js', import.meta.url))
const previewConfig = resolve('.codex-tmp/cloudflare-preview.jsonc')
if (!remote) {
  const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'))
  assert.equal(config.vars.MIGRATION_READ_ONLY, '1')
  assert.equal(config.vars.WORKERS_AI_ENABLED, '0')
  // Wrangler 4.152 treats AI as remote-only even with ai.remote=false.
  // Public CI must not authenticate or make paid calls. This preview exercises
  // the disabled AI path; the real binding is verified separately on Cloudflare.
  delete config.ai
  // Exercise runtime D1 recovery after a credential-free build. The local
  // database starts empty; migration isolation still blocks all public APIs.
  if (homeOnly) {
    config.vars.SUPABASE_DATA_PAUSED = '0'
    config.vars.CLOUDFLARE_DATA_ENABLED = '1'
  }
  config.main = resolve(config.main)
  config.assets.directory = resolve(config.assets.directory)
  writeFileSync(previewConfig, JSON.stringify(config, null, 2))
}
const child = remote ? null : spawn(process.execPath, [cli, 'preview', '--config', previewConfig, '--port', '8788', '--ip', '127.0.0.1'], {
  env: { ...process.env, BROWSER: 'none', WRANGLER_SEND_METRICS: 'false' },
  stdio: ['ignore', log, log], detached: true,
})
let exited = false
child?.on('exit', () => { exited = true })
child?.on('error', () => { exited = true })
// NextURL canonicalizes loopback addresses to localhost. Using 127.0.0.1 in
// Host makes OpenNext mistake same-origin rewrites for external fetches.
const base = remote || 'http://localhost:8788'
const reportPath = remote ? '.codex-tmp/cloudflare-remote-smoke.json' : '.codex-tmp/cloudflare-smoke.json'
const report = []
try {
  const deadline = Date.now() + 180_000
  while (true) {
    if (exited) throw new Error('Preview process exited; inspect cloudflare-preview.log')
    try {
      const response = await fetch(`${base}/robots.txt`, { signal: AbortSignal.timeout(2000) })
      await response.body?.cancel()
      break
    } catch {
      if (Date.now() >= deadline) throw new Error('Preview startup timed out')
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  for (const [path, status, method = 'GET'] of (homeOnly ? [['/', 200]] : [
    ['/', 200], ['/skills', 200], ['/zh/skills', 200],
    ['/skills?q=video', 503], ['/zh/skills?q=video', 503],
    ['/agentskill', 308], ['/api/cron/skill-submissions', 503],
    ['/auth/callback?code=test-only', 503], ['/', 503, 'POST'],
    ['/zh/profile', 503], ['/ja/auth/callback?code=test-only', 503], ['/de/creator', 503],
    ['/favicon-48x48.png', 200], ['/robots.txt', 200],
  ])) {
    const response = await fetch(base + path, { method, redirect: 'manual', signal: AbortSignal.timeout(30_000) })
    report.push({ path, method, status: response.status, cache: response.headers.get('x-nextjs-cache') })
    writeFileSync(reportPath, JSON.stringify(report, null, 2))
    assert.equal(response.status, status, `${method} ${path}`)
    assert.equal(response.headers.get('Set-Cookie'), null, `No session mutation: ${path}`)
    const text = path.endsWith('.png') ? '' : await response.text()
    if (path === '/robots.txt') assert.match(text, /Disallow: \//)
    if (status === 503) assert.match(response.headers.get('Cache-Control') || '', /no-store/)
    if (status === 308) assert.match(response.headers.get('Location') || '', /\/agent-skill$/)
    if (status === 200 && !path.endsWith('.png') && path !== '/robots.txt') {
      assert.match(text, /OpenAgentSkill/)
      assert.match(response.headers.get('X-Robots-Tag') || '', /noindex/)
    }
    await response.body?.cancel().catch(() => {})
  }
  if (!remote) {
    // Exercise the deployed asset header parser, not only the _headers text.
    // Gallery HTML must continue through Next; only static media gets a week.
    const preview = JSON.parse(readFileSync('lib/skill-previews.json', 'utf8'))[0]
    const gallery = JSON.parse(readFileSync('lib/showcase-auto.json', 'utf8'))[0]
    for (const path of (homeOnly ? [] : [preview.media[0].cardSrc, preview.media[0].previewSrc, gallery.media.src.replace(/\.[^.]+$/, '.card.webp')])) {
      const response = await fetch(base + path, { method: 'HEAD', signal: AbortSignal.timeout(30_000) })
      assert.equal(response.status, 200, path)
      assert.match(response.headers.get('Cache-Control') || '', /(?:^|[,\s])max-age=604800(?:$|[,\s])/, path)
      report.push({ path, method: 'HEAD', status: response.status, mediaCache: response.headers.get('Cache-Control') })
    }
    // Test the actual built interceptor, local R2 and authoritative D1 tags.
    // No test routes, credentials or invalidation API are added to production.
    const readPage = async (path,headers={}) => {
      const response=await fetch(base+path,{headers,redirect:'manual',signal:AbortSignal.timeout(30_000)})
      const body=await response.text()
      assert.equal(response.status,200,path)
      if(headers.cookie) {
        // Next clears invalid preview cookies after the interceptor bypasses.
        // Only those expired preview cookies are allowed, never auth cookies.
        const cookies=response.headers.getSetCookie()
        assert.ok(cookies.length>0)
        assert.ok(cookies.every(cookie=>/^__(?:prerender_bypass|next_preview_data)=;/.test(cookie)&&cookie.includes('Expires=Thu, 01 Jan 1970')),path)
      } else assert.equal(response.headers.get('set-cookie'),null,path)
      return {response,body}
    }
    for (const path of (homeOnly ? [] : ['/agent-skill','/zh/agent-skill'])) {
      // Preview may populate a different local store than the Worker uses.
      // A cold render is valid; its background R2 write must become a hit.
      await readPage(path)
      let html
      for(let attempt=0;attempt<5;attempt++) {
        html=await readPage(path)
        if(html.response.headers.get('x-opennext-cache')==='HIT')break
        await new Promise(resolve=>setTimeout(resolve,200))
      }
      if(html.response.headers.get('x-opennext-cache')!=='HIT')console.log('Cache probe headers',path,Object.fromEntries(html.response.headers))
      assert.equal(html.response.headers.get('x-opennext-cache'),'HIT',`${path}: intercepted HTML`)
      assert.match(html.body,/<html/)
      const flight=await readPage(path+'?_rsc=cache-check',{RSC:'1'})
      assert.equal(flight.response.headers.get('x-opennext-cache'),'HIT',`${path}: intercepted Flight`)
      assert.match(flight.response.headers.get('content-type')||'',/text\/x-component/)
      assert.doesNotMatch(flight.body,/<!DOCTYPE html>/i)
      const head=await fetch(base+path,{method:'HEAD'})
      assert.equal(head.status,200);assert.equal(await head.text(),'')
      const preview=await readPage(path,{cookie:'__prerender_bypass=invalid-fixture'})
      assert.notEqual(preview.response.headers.get('x-opennext-cache'),'HIT','Preview cookies bypass interception')
      report.push({path,interceptedHtml:true,interceptedRsc:true,previewBypass:true})
    }
    const buildId=readFileSync('.next/BUILD_ID','utf8').trim()
    assert.match(buildId,/^[\w-]+$/)
    // The first homepage above rendered without production data. Add a local
    // snapshot now: it must recover immediately, without a purge or a 4h wait,
    // then return HTML and Flight cache hits. No production DB is accessed.
    if (homeOnly) {
    const snapshotSchema = readFileSync('cloudflare/migrations/data/0003_business.sql', 'utf8')
      .match(/CREATE TABLE "ranking_snapshots" \([\s\S]*?\) STRICT;/)?.[0]
    assert.ok(snapshotSchema)
    const generated = new Date().toISOString()
    const fixture = [{ rank: 1, score: 42, badge: '42 stars', reason: 'Local runtime fixture',
      slug: 'home-runtime-fixture', name: 'Homepage runtime fixture', description: 'Local test only',
      category: 'developer-tools', github_stars: 42, github_forks: 0, quality_score: 80,
      repository: 'https://github.com/test/home-runtime-fixture', github_owner: 'test', author_name: 'test',
      updated_at: generated, install: '' }]
    const quote = value => `'${String(value).replaceAll("'", "''")}'`
    const seedPath = resolve('.codex-tmp/home-runtime-snapshot.sql')
    writeFileSync(seedPath, `${snapshotSchema.replace('CREATE TABLE', 'CREATE TABLE IF NOT EXISTS')}
      INSERT INTO ranking_snapshots(ranking_slug,snapshot_date,generated_at,methodology_version,item_count,items,source_counts)
      VALUES ('most-starred-agent-skills',${quote(generated.slice(0,10))},${quote(generated)},'local-runtime-test',1,${quote(JSON.stringify(fixture))},'{}')
      ON CONFLICT(ranking_slug,snapshot_date) DO UPDATE SET items=excluded.items,generated_at=excluded.generated_at;`)
    await promisify(execFile)(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','APP_DB','--local','--config',previewConfig,'--file',seedPath],{env:process.env})
    for (const path of ['/', '/zh', '/ja', '/ko', '/es', '/de', '/fr', '/id']) {
      const recovered = await readPage(path)
      assert.match(recovered.body, /data-oas-home-cache="ready"/, `${path}: runtime data replaces bootstrap`)
      assert.match(recovered.body, /Homepage runtime fixture/)
      assert.doesNotMatch(recovered.body, /data-oas-home-cache="fallback"/)
      let hit
      for (let attempt = 0; attempt < 5; attempt++) {
        hit = await readPage(path)
        if (hit.response.headers.get('x-opennext-cache') === 'HIT') break
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      assert.equal(hit.response.headers.get('x-opennext-cache'), 'HIT', `${path}: healthy ISR remains enabled`)
      const flight = await readPage(path + '?_rsc=home-check', { RSC: '1' })
      assert.equal(flight.response.headers.get('x-opennext-cache'), 'HIT')
      assert.match(flight.body, /home-runtime-fixture/)
      report.push({ path, homeRecovery: true, interceptedHtml: true, interceptedRsc: true })
    }
    } else {
    // Same persisted representation as revalidateTag(tag,{expire:0}).
    const now=Date.now()
    const sql=`INSERT INTO revalidations(tag,revalidatedAt,stale,expire) VALUES ('${buildId}/_N_T_/agent-skill',${now},${now},${now})`
    await promisify(execFile)(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','NEXT_TAG_CACHE_D1','--local','--config',previewConfig,'--command',sql],{env:process.env})
    const invalidated=await readPage('/agent-skill')
    assert.notEqual(invalidated.response.headers.get('x-opennext-cache'),'HIT','Expired tag must reach Next renderer')
    assert.match(invalidated.body,/OpenAgentSkill/)
    report.push({path:'/agent-skill',expiredTagBypass:true})
    }
  }
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`Cloudflare workerd smoke checks passed: ${report.length} public/isolation cases`)
} finally {
  if (child) try { process.kill(-child.pid, 'SIGTERM') } catch { /* process already exited */ }
  if (log !== null) closeSync(log)
}
