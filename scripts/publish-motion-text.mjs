// Owner-operated publication of source text. Never installs or executes sources.
// The archive and paid text must stay outside the public repository.
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
if (args.includes('--help')) {
  console.log('node --env-file=.env.commerce.local scripts/publish-motion-text.mjs --archive <private source archive> --version <version> [--publish]\nValidates all 233 sources. --publish uploads private text and creates immutable releases using the server-only Supabase key.')
  process.exit(0)
}
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined
const archive = option('--archive'), version = option('--version')
if (!archive || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,49}$/.test(version || '')) throw Error('Use --help')
const catalog = JSON.parse(await readFile(new URL('../lib/motion/catalog.json', import.meta.url), 'utf8'))
const manifest = JSON.parse(await readFile(resolve(archive, 'manifest.json'), 'utf8'))
const skillSources = {
  'motion-lexnlin-6161a6': ['Leonxlnx--cinetic', 'skills/cinetic/SKILL.md'],
  'motion-anthonyriera-9b1b2a': ['Rieranthony--product-film-skill', 'plugins/product-film/skills/product-film/SKILL.md'],
  'motion-jake11moran-a269c4': ['heygen-com--hyperframes-community-skills', 'skills/session-story/SKILL.md'],
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const deliveries = []
if (catalog.entries.length !== 233 || new Set(catalog.entries.map(e => e.id)).size !== 233) throw Error('Unexpected catalog')
for (const entry of catalog.entries) {
  const original = manifest.cases.find(c => c.id === entry.id)
  if (!original || original.sourceUrl !== entry.sourceUrl) throw Error(`Missing or mismatched source: ${entry.id}`)
  let bytes, kind
  if (entry.sourceKind === 'prompt') {
    bytes = await readFile(resolve(archive, 'cases', entry.id, 'prompt.txt'))
    if (hash(bytes) !== entry.promptSha256 || hash(bytes) !== original.promptSha256) throw Error(`Prompt hash mismatch: ${entry.id}`)
    kind = 'prompt'
  } else {
    const source = skillSources[entry.id]
    if (!source) throw Error(`Unknown Skill source: ${entry.id}`)
    const root = resolve(archive, 'repositories', source[0], 'source')
    const instructions = await readFile(resolve(root, source[1]), 'utf8')
    const license = await readFile(resolve(root, 'LICENSE'), 'utf8')
    if (!instructions.startsWith('---') || !license.trim()) throw Error(`Invalid Skill source: ${entry.id}`)
    bytes = Buffer.from(`${instructions}\n\n---\nOriginal source: ${entry.sourceRepo}\nOriginal creator: ${entry.sourceCreatorName}\n\nOriginal repository license:\n\n${license}`)
    kind = 'skill-instructions'
  }
  new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  if (!bytes.length || bytes.length > 1048576) throw Error(`Invalid text size: ${entry.id}`)
  const sha256 = hash(bytes)
  deliveries.push({ bytes, row: { skill_slug: entry.id, version, delivery_kind: kind, sha256, size_bytes: bytes.length,
    object_path: `${entry.id}/${version}/${sha256}.txt` } })
}
console.log(`Validated ${deliveries.filter(d => d.row.delivery_kind === 'prompt').length} original prompts and ${deliveries.filter(d => d.row.delivery_kind === 'skill-instructions').length} original Skill instructions with licenses.`)
if (!args.includes('--publish')) process.exit(0)
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
if (!key || !url || key === '[SENSITIVE]') throw Error('Missing server credentials')
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const bucket = await db.storage.getBucket('skill-packages')
if (bucket.error || bucket.data.public || !bucket.data.allowed_mime_types?.includes('text/plain')) throw Error('Private text-enabled bucket required')
let done = 0
for (const { bytes, row } of deliveries) {
  const existing = await db.from('commerce_releases').select('sha256,withdrawn,delivery_kind').eq('skill_slug', row.skill_slug).eq('version', version).maybeSingle()
  if (existing.error) throw Error('Release lookup failed')
  if (existing.data && (existing.data.sha256 !== row.sha256 || existing.data.withdrawn || existing.data.delivery_kind !== row.delivery_kind)) throw Error(`Immutable release conflict: ${row.skill_slug}`)
  const upload = await db.storage.from('skill-packages').upload(row.object_path, bytes, { contentType: 'text/plain', upsert: false })
  if (upload.error && String(upload.error.statusCode) !== '409') throw Error(`Private upload failed: ${row.skill_slug}`)
  const stored = await db.storage.from('skill-packages').download(row.object_path)
  if (stored.error || !stored.data || hash(Buffer.from(await stored.data.arrayBuffer())) !== row.sha256) throw Error(`Stored text mismatch: ${row.skill_slug}`)
  if (!existing.data) {
    const published = await db.from('commerce_releases').insert(row)
    if (published.error) throw Error(`Release publication failed: ${row.skill_slug}`)
  }
  if (++done % 25 === 0 || done === deliveries.length) console.log(`Verified private text releases: ${done}/${deliveries.length}`)
}
