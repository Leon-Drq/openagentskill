import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Compile public flags for the production site. Preview isolation is enforced
// by the Worker at request time, never baked into reusable page HTML.
// This config contains public settings only; builds need no production keys.
const config = JSON.parse(readFileSync(new URL('../wrangler.production.jsonc', import.meta.url), 'utf8'))
const root = fileURLToPath(new URL('../', import.meta.url))
const cli = fileURLToPath(new URL('../node_modules/@opennextjs/cloudflare/dist/cli/index.js', import.meta.url))
const child = spawn(process.execPath, [cli, 'build', ...process.argv.slice(2)], {
  cwd: root,
  env: { ...process.env, ...config.vars, NEXT_TELEMETRY_DISABLED: '1' },
  stdio: 'inherit',
})
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
