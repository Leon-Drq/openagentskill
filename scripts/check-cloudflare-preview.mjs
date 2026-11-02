import { spawn } from 'node:child_process'
import { mkdirSync, openSync, closeSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

// Linux CI runs the real workerd runtime with local R2/D1/DO emulation and no
// production secrets. Only public reads and blocked writes are exercised.
const remote = process.argv[2]
if (remote && !/^https:\/\/openagentskill-migration\.[a-z0-9-]+\.workers\.dev$/.test(remote)) {
  throw new Error('Only the isolated migration workers.dev deployment can be checked remotely')
}
if (!remote && process.platform === 'win32') throw new Error('Run the local smoke check in Linux CI')
mkdirSync('.codex-tmp', { recursive: true })
const log = remote ? null : openSync('.codex-tmp/cloudflare-preview.log', 'w')
const cli = fileURLToPath(new URL('../node_modules/@opennextjs/cloudflare/dist/cli/index.js', import.meta.url))
const child = remote ? null : spawn(process.execPath, [cli, 'preview', '--port', '8788', '--ip', '127.0.0.1'], {
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
  for (const [path, status, method = 'GET'] of [
    ['/', 200], ['/skills', 200], ['/zh/skills', 200],
    ['/skills?q=video', 503], ['/zh/skills?q=video', 503],
    ['/agentskill', 308], ['/api/cron/skill-submissions', 503],
    ['/auth/callback?code=test-only', 503], ['/', 503, 'POST'],
    ['/zh/profile', 503], ['/ja/auth/callback?code=test-only', 503], ['/de/creator', 503],
    ['/favicon-48x48.png', 200], ['/robots.txt', 200],
  ]) {
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
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`Cloudflare workerd smoke checks passed: ${report.length} public/isolation cases`)
} finally {
  if (child) try { process.kill(-child.pid, 'SIGTERM') } catch { /* process already exited */ }
  if (log !== null) closeSync(log)
}
