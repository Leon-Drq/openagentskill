// Run only for a finished, reviewed package. This is not community publication
// and never changes registry reviews, approvals, rankings or source ownership.
import { readFile, stat, access } from 'node:fs/promises'
import { resolve, dirname, parse } from 'node:path'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
if (args.includes('--help')) {
  console.log('node --env-file=.env.commerce.local scripts/publish-commerce-package.mjs --slug <slug> --version <version> --file <finished.zip> --verified-output\nRequires the server-only Supabase secret. Verify the exact package output against the public preview before passing --verified-output. Withdrawn packages are rejected.')
  process.exit(0)
}
const option = name => args[args.indexOf(name) + 1]
const slug = option('--slug'), version = option('--version'), source = option('--file')
if (!args.includes('--slug') || !args.includes('--version') || !args.includes('--file') || !args.includes('--verified-output')
  || !/^[a-z0-9][a-z0-9-]{0,199}$/.test(slug || '') || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,49}$/.test(version || '') || !source?.endsWith('.zip')) throw new Error('Invalid arguments. Run --help.')
const catalog = JSON.parse(await readFile(new URL('../lib/motion/catalog.json', import.meta.url), 'utf8'))
if (slug !== 'launch-card-studio' && !catalog.entries.some(entry => entry.id === slug)) throw new Error('Unknown first-party Skill')
const file = resolve(source)
for (let dir = dirname(file); dir !== parse(dir).root; dir = dirname(dir)) {
  const withdrawn = await access(resolve(dir, 'WITHDRAWN.txt')).then(() => true, () => false)
  if (withdrawn) throw new Error('Withdrawn archive: cannot publish or deliver this package')
}
const info = await stat(file)
if (!info.isFile() || info.size < 22 || info.size > 100 * 1024 * 1024) throw new Error('Package must be a ZIP smaller than 100 MB')
const bytes = await readFile(file)
if (!bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) || !bytes.includes(Buffer.from('SKILL.md'))) throw new Error('ZIP must contain SKILL.md')
const sha256 = createHash('sha256').update(bytes).digest('hex')
const objectPath = `${slug}/${version}/${sha256}.zip`
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
if (!key || !url) throw new Error('Server Supabase configuration missing')
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const bucket = await db.storage.getBucket('skill-packages')
if (bucket.error || bucket.data.public) throw new Error('A private skill-packages bucket is required')
const existing = await db.from('commerce_releases').select('sha256,withdrawn').eq('skill_slug', slug).eq('version', version).maybeSingle()
if (existing.error) throw new Error('Cannot read package release')
if (existing.data) {
  if (existing.data.sha256 !== sha256 || existing.data.withdrawn) throw new Error('Version is immutable or withdrawn; publish a new version')
  console.log(`Already published: ${slug} ${version}`)
  process.exit(0)
}
const upload = await db.storage.from('skill-packages').upload(objectPath, bytes, { contentType: 'application/zip', upsert: false })
if (upload.error && upload.error.statusCode !== '409') throw new Error('Private package upload failed')
// Download once to verify storage bytes before enabling this release for sale.
const stored = await db.storage.from('skill-packages').download(objectPath)
if (stored.error || !stored.data || createHash('sha256').update(Buffer.from(await stored.data.arrayBuffer())).digest('hex') !== sha256) throw new Error('Stored package checksum mismatch')
const release = await db.from('commerce_releases').insert({ skill_slug: slug, version, object_path: objectPath, sha256, size_bytes: info.size })
if (release.error) throw new Error('Package stored privately but release not published; correct the database error and retry')
console.log(`Published private package: ${slug} ${version} · ${info.size} bytes · sha256 ${sha256}`)
