import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { parseArgs } from 'node:util'

const { values } = parseArgs({ options: { publish: { type: 'boolean', default: false } } })
const sources = JSON.parse(await readFile(new URL('../lib/video-workflow-sources.json', import.meta.url), 'utf8'))
const reason = 'Owner requested the video workflow collection from the jedeeai roundup on 2026-10-06.'
if (!values.publish) {
  console.log(JSON.stringify({ mode: 'plan', reason, sources }, null, 2))
  console.log('Run with --publish to invoke the documented owner CLI once per pinned Skill path.')
  process.exit(0)
}

const root = new URL('../', import.meta.url)
const cli = new URL('./owner-publish-skill.mjs', import.meta.url)
const run = (args) => spawnSync(process.execPath, [cli.pathname, ...args], { cwd: root, encoding: 'utf8', timeout: 80000 })
const check = run(['--check'])
if (check.status !== 0) {
  console.error(check.stdout, check.stderr)
  process.exit(1)
}
const checkpointPath = new URL('../artifacts/video-workflows-publication.json', import.meta.url)
await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true })
let checkpoint = []
try { checkpoint = JSON.parse(await readFile(checkpointPath, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
const save = () => writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2) + '\n', { mode: 0o600 })

for (const source of sources) {
  let entry = checkpoint.find((item) => item.repository === source.repository && item.path === source.path && item.ref === source.ref)
  if (entry?.status === 'complete') continue
  if (!entry) {
    entry = { ...source, reason, requestId: randomUUID(), status: 'pending' }
    checkpoint.push(entry)
  }
  // Persist identity before the call so an unknown outcome reuses the same request.
  await save()
  console.log(`Publishing ${source.repository} / ${source.path} (${entry.requestId})`)
  const result = run(['--repository', source.repository, '--path', source.path, '--ref', source.ref,
    '--reason', entry.reason, '--request-id', entry.requestId])
  entry.output = result.stdout
  entry.error = result.stderr || result.error?.message || null
  entry.status = result.status === 0 ? 'complete' : 'retry_required'
  await save()
  console.log(result.stdout)
  if (entry.status !== 'complete') {
    console.error(entry.error || 'Publication failed. Resolve the cause, then rerun with the saved request ID.')
    process.exit(1)
  }
}
console.log(`Completed ${sources.length} explicit owner publication requests. Results: ${checkpointPath.pathname}`)
