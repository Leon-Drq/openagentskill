// Metadata-only maintenance. Produces a backed-up plan and guarded SQL for an
// authenticated owner/operator to execute; never mutates data while planning.
// Load credentials with node --env-file=<private file>, never command-line tokens.
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { register } from 'node:module'
register('./test-owner-publication-loader.mjs', import.meta.url)
const { repairStoredSkillSummary } = await import('../lib/skills/source-summary.ts')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const input = process.argv.find(arg => arg.startsWith('--input='))?.slice(8)
if (!input && (!url || !key)) throw new Error('Supabase server credentials required')
const client = !input ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null
const markers = ['>', '>-', '>+', '|', '|-', '|+']
const { data, error } = input ? { data: JSON.parse(readFileSync(input, 'utf8')), error: null } : await client.from('skills')
  .select('id,slug,description,tagline,long_description,source_content_hash')
  .or(`description.in.(${markers.join(',')}),tagline.in.(${markers.join(',')})`)
  .order('id').limit(1000)
if (error) throw new Error(error.message)
if (data.length === 1000) throw new Error('Candidate limit reached; paginate before applying')
const plan = data.flatMap(row => {
  const repaired = repairStoredSkillSummary(row)
  if (repaired === row) return []
  return [{ id: row.id, slug: row.slug, hash: row.source_content_hash,
    before: { description: row.description, tagline: row.tagline },
    after: { description: repaired.description, tagline: repaired.tagline } }]
})
mkdirSync('.codex-tmp', { recursive: true })
const path = `.codex-tmp/source-summary-repair-${new Date().toISOString().replaceAll(':', '-')}.json`
writeFileSync(path, JSON.stringify(plan, null, 2))
const payload = JSON.stringify(plan).replaceAll("'", "''")
let delimiter = '$summary_repair$'
while (payload.includes(delimiter)) delimiter = delimiter.replace('$summary', '$xsummary')
const snapshot = `select jsonb_agg(to_jsonb(s) - 'description' - 'tagline' - 'updated_at' - 'search_document' - 'primary_category' - 'taxonomy_tags' - 'output_types' - 'taxonomy_version' order by s.id) from public.skills s where s.id in (select (p->>'id')::uuid from jsonb_array_elements(plan) p)`
const sql = `do ${delimiter}
declare plan jsonb := '${payload}'::jsonb; before_state jsonb; after_state jsonb; changed integer;
begin
  -- Lock candidates so the comparison and source guards see one version.
  perform 1 from public.skills s where s.id in (select (p->>'id')::uuid from jsonb_array_elements(plan) p) for update;
  before_state := (${snapshot});
  update public.skills s set description = p->'after'->>'description', tagline = p->'after'->>'tagline'
  from jsonb_array_elements(plan) p
  where s.id = (p->>'id')::uuid
    and s.description is not distinct from p->'before'->>'description'
    and s.tagline is not distinct from p->'before'->>'tagline'
    and s.source_content_hash is not distinct from p->>'hash';
  get diagnostics changed = row_count;
  if changed <> jsonb_array_length(plan) then raise exception 'Source changed since plan: abort summary repair'; end if;
  after_state := (${snapshot});
  if before_state is distinct from after_state then raise exception 'Summary repair changed source, review or publication evidence'; end if;
end ${delimiter};\n`
const sqlPath = path.replace('.json', '.sql')
writeFileSync(sqlPath, sql)
console.log(JSON.stringify({ candidates: data.length, repairable: plan.length, backup: path, guardedSql: sqlPath }))
