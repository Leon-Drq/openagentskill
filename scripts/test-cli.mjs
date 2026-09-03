import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const cli = fileURLToPath(new URL('../packages/cli/openagentskill.mjs', import.meta.url))

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' })
}

const help = run(['--help'])
assert.equal(help.status, 0)
assert.match(help.stdout, /search\|find/)
assert.match(help.stdout, /install\|add/)

const version = run(['--version'])
assert.equal(version.status, 0)
assert.equal(version.stdout.trim(), '0.3.0')

const missingTask = run(['find'])
assert.equal(missingTask.status, 1)
assert.match(missingTask.stderr, /Missing task/)

const missingSlug = run(['add'])
assert.equal(missingSlug.status, 1)
assert.match(missingSlug.stderr, /Missing skill slug/)

console.log('CLI contract tests passed.')
