import { randomUUID } from 'node:crypto'
import { loadEnvFile } from 'node:process'
import { parseArgs } from 'node:util'
import { readFileSync } from 'node:fs'

try { loadEnvFile(new URL('../.env.owner.local', import.meta.url)) } catch (error) {
  if (error.code !== 'ENOENT') throw error
}

const { values } = parseArgs({ options: {
  repository: { type: 'string' }, path: { type: 'string' }, ref: { type: 'string' },
  reason: { type: 'string' }, 'request-id': { type: 'string' },
  'metadata-only': { type: 'boolean', default: false }, 'metadata-file': { type: 'string' }, 'submission-id': { type: 'string' },
  'dry-run': { type: 'boolean', default: false }, check: { type: 'boolean', default: false }, help: { type: 'boolean', default: false },
} })

if (values.help) {
  console.log('pnpm owner:publish --check (read-only production connection check)')
  console.log('pnpm owner:publish --repository owner/repo --path SKILL.md --reason "Site owner publication" [--ref COMMIT] [--dry-run] [--request-id UUID]')
  console.log('pnpm owner:publish --metadata-only --repository owner/repo --path SKILL.md --metadata-file product.json --reason "Owner requested product correction" [--submission-id UUID] [--dry-run]')
  process.exit(0)
}
if (!values.check && (!values.repository || !values.reason || values.reason.trim().length < 10)) {
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
if (values['metadata-only'] && (!values['metadata-file'] || !values.path || values.ref || values.check)) throw new Error('Metadata-only requires --metadata-file and --path; it cannot change source or be used with --check.')
if (!values['metadata-only'] && (values['metadata-file'] || values['submission-id'])) throw new Error('Use --metadata-only to update product information without publication.')
if (!values.check) console.log(`Publication request ID: ${requestId}. Use --request-id ${requestId} when retrying.`)
const response = await fetch(new URL(values['metadata-only'] ? '/api/admin/skills/product-metadata' : '/api/admin/skills/publish', origin), {
  method: values.check ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(70000),
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OWNER_PUBLISH_TOKEN}` },
  body: values.check ? undefined : values['metadata-only'] ? JSON.stringify({
    repository: values.repository, skillPath: values.path, submissionId: values['submission-id'],
    productMetadata: JSON.parse(readFileSync(values['metadata-file'], 'utf8')), reason: values.reason, requestId, dryRun: values['dry-run'],
  }) : JSON.stringify({
    repository: values.repository, skillPath: values.path, sourceRef: values.ref,
    reason: values.reason, requestId, dryRun: values['dry-run'],
  }),
})
const result = await response.json()
console.log(JSON.stringify(result, null, 2))
if (!response.ok) process.exitCode = 1
