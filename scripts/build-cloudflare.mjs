import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Build-time pages must use the same outage/read-only flags as the Worker.
// No production credentials are read from the original Vercel checkout.
const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'))
const root = fileURLToPath(new URL('../', import.meta.url))
const cli = fileURLToPath(new URL('../node_modules/@opennextjs/cloudflare/dist/cli/index.js', import.meta.url))
const child = spawn(process.execPath, [cli, 'build', ...process.argv.slice(2)], {
  cwd: root,
  env: { ...process.env, ...config.vars, NEXT_TELEMETRY_DISABLED: '1' },
  stdio: 'inherit',
})
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
