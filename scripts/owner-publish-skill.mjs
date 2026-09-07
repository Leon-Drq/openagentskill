import { randomUUID } from 'node:crypto'
import { loadEnvFile } from 'node:process'
import { parseArgs } from 'node:util'

try { loadEnvFile(new URL('../.env.owner.local', import.meta.url)) } catch (error) {
  if (error.code !== 'ENOENT') throw error
}

const { values } = parseArgs({ options: {
  repository: { type: 'string' }, path: { type: 'string' }, ref: { type: 'string' },
  reason: { type: 'string' }, 'request-id': { type: 'string' },
  'dry-run': { type: 'boolean', default: false }, help: { type: 'boolean', default: false },
} })

if (values.help) {
  console.log('pnpm owner:publish --repository owner/repo --path SKILL.md --reason "Site owner publication" [--ref COMMIT] [--dry-run] [--request-id UUID]')
  process.exit(0)
}
if (!values.repository || !values.reason || values.reason.trim().length < 10) {
  throw new Error('--repository and --reason (at least 10 characters) are required.')
}
if (!process.env.OWNER_PUBLISH_TOKEN || process.env.OWNER_PUBLISH_TOKEN.length < 32) {
  throw new Error('Configure OWNER_PUBLISH_TOKEN in .env.owner.local or the process environment.')
}
const origin = new URL(process.env.OWNER_PUBLISH_ORIGIN || 'https://www.openagentskill.com')
if (!['https://www.openagentskill.com', 'http://localhost:3000', 'http://localhost:3001'].includes(origin.origin) || origin.username || origin.password) {
  throw new Error('OWNER_PUBLISH_ORIGIN must be the production origin or a local development server.')
}
const requestId = values['request-id'] || randomUUID()
console.log(`Publication request ID: ${requestId}. Use --request-id ${requestId} when retrying.`)
const response = await fetch(new URL('/api/admin/skills/publish', origin), {
  method: 'POST', redirect: 'error', signal: AbortSignal.timeout(70000),
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OWNER_PUBLISH_TOKEN}` },
  body: JSON.stringify({
    repository: values.repository, skillPath: values.path, sourceRef: values.ref,
    reason: values.reason, requestId, dryRun: values['dry-run'],
  }),
})
const result = await response.json()
console.log(JSON.stringify(result, null, 2))
if (!response.ok) process.exitCode = 1
