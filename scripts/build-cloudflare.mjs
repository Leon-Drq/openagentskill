import { spawn, execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Compile public flags for the production site. Preview isolation is enforced
// by the Worker at request time, never baked into reusable page HTML.
// This config contains public settings only; builds need no production keys.
const production = JSON.parse(readFileSync(new URL('../wrangler.production.jsonc', import.meta.url), 'utf8'))
const readonly = production.vars.SITE_MODE === 'readonly'
const fullApp = process.argv.includes('--full-app')
if (readonly && !fullApp) {
  const {spawnSync} = await import('node:child_process')
  const result=spawnSync(process.execPath,['scripts/build-readonly.mjs'],{stdio:'inherit'})
  process.exit(result.status??1)
}
// Preserve the full application's build contract for recovery and regression CI.
const config = readonly ? JSON.parse(readFileSync(new URL('../wrangler.active.jsonc', import.meta.url), 'utf8')) : production
const root = fileURLToPath(new URL('../', import.meta.url))
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('Build commit is unavailable')
const cli = fileURLToPath(new URL('../node_modules/@opennextjs/cloudflare/dist/cli/index.js', import.meta.url))
const child = spawn(process.execPath, [cli, 'build', ...process.argv.slice(2).filter(arg=>arg!=='--full-app')], {
  cwd: root,
  env: { ...process.env, ...config.vars, NEXT_PUBLIC_BUILD_COMMIT_SHA: commit, NEXT_TELEMETRY_DISABLED: '1' },
  stdio: 'inherit',
})
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', async code => {
  process.exitCode = code ?? 1
  if (code === 0) {
    const buildId = readFileSync(new URL('../.open-next/assets/BUILD_ID', import.meta.url), 'utf8').trim()
    if (!/^[\w-]+$/.test(buildId)) throw new Error('Invalid cache build ID')
    writeFileSync(new URL('../.open-next/directory-cache-build.mjs', import.meta.url), `export const buildId = ${JSON.stringify(buildId)};\n`)
    if (readonly) {
      const {spawnSync}=await import('node:child_process')
      const result=spawnSync(process.execPath,['scripts/build-readonly.mjs'],{cwd:root,stdio:'inherit'})
      process.exitCode=result.status??1
    }
  }
})
