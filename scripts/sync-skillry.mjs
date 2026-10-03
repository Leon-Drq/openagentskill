import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'
import { digest, fetchPublicPage, parseSkillryDirectory, parseSkillryTerms, planSnapshot } from './skillry/core.mjs'

export async function syncSkillry({ root = fileURLToPath(new URL('../', import.meta.url)), fetcher = fetch, now = new Date().toISOString() } = {}) {
  const file = path.join(root, 'lib/skills/skillry-snapshot.json')
  const previous = JSON.parse(await readFile(file, 'utf8'))
  const policy = JSON.parse(await readFile(path.join(root, 'scripts/skillry/policy.json'), 'utf8'))
  if (policy.paidPermitted && !policy.permissionReference) throw Error('Paid catalog requires a recorded partner permission')
  // Two bounded public reads. No account, paid package, media download,
  // hidden API or per-product crawler. Parser/source failures publish nothing.
  const terms = await fetchPublicPage('https://skillry.dev/terms', fetcher)
  if (digest(parseSkillryTerms(terms)) !== policy.termsContentSha256) throw Error('Source terms changed; retain the previous release until reviewed')
  const html = await fetchPublicPage('https://skillry.dev/skills', fetcher)
  const rows = parseSkillryDirectory(html)
  const next = planSnapshot(rows, previous, { now, sourceHash: digest(html), paidPermitted: policy.paidPermitted })
  if (!next.entries.length) throw Error('No eligible entries; refusing to publish an empty source')
  const changed = JSON.stringify(previous) !== JSON.stringify(next)
  const oldSlugs = new Set([...(previous.entries || []), ...(previous.archived || [])].map(row => row.sourceSlug))
  const added = next.entries.filter(row => !oldSlugs.has(row.sourceSlug))
  const sql = added.length ? `-- Only provider interaction identities; never alter GitHub reviews or submission scores.\ninsert into public.provider_skill_catalog(slug,provider,source_url) values\n${added.map(row => `  ('skillry-${row.sourceSlug.slice(3)}','skillry','https://skillry.dev/skills/${row.sourceSlug}')`).join(',\n')}\non conflict (slug) do nothing;\n` : null
  await mkdir(path.join(root, 'artifacts'), { recursive: true })
  await writeFile(path.join(root, 'artifacts/skillry-sync-report.json'), JSON.stringify({ checkedAt: now, sourceCount: rows.length, eligible: next.entries.length, free: next.entries.filter(row => row.priceUsdCents === 0).length, paid: next.entries.filter(row => row.priceUsdCents > 0).length, changed, added: added.length, archived: next.archived.length, paidAwaitingPermission: policy.paidPermitted ? 0 : rows.filter(row => row.downloadCount > 10 && row.priceUsdCents > 0).length }, null, 2) + '\n')
  // Always overwrite this artifact so an unchanged run cannot reuse old SQL.
  await writeFile(path.join(root, 'artifacts/skillry-new-identities.sql'), sql || '-- No new interaction identities.\n')
  if (changed) await writeFile(file, JSON.stringify(next, null, 2) + '\n')
  console.log(JSON.stringify({ changed, added: added.length, eligible: next.entries.length, paidPermitted: policy.paidPermitted }))
  return { changed, added, sql, snapshot: next }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await syncSkillry()
