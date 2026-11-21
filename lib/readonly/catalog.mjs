// Public, frozen data only. Never add account, submission-contact or entitlement fields.
export const PUBLIC_FIELDS = ['slug','name','description','long_description','tagline','author_name','author_url',
  'repository','github_repo','github_stars','github_forks','category','primary_category','tags','frameworks',
  'taxonomy_tags','output_types','version','license','license_status','install_command','npm_package',
  'ai_review_approved','listing_status','ai_review_issues','quality_score','site_downloads',
  'github_last_pushed_at','source_ref','source_path','source_commit_sha','source_content_hash',
  'source_sync_status','created_at','updated_at']
export const PUBLICATION_SQL = "(t.ai_review_approved=1 OR t.listing_status IN ('owner_published','static_checked'))"
const arrays = new Set(['tags','frameworks','taxonomy_tags','output_types','ai_review_issues'])
const numeric = new Set(['github_stars','github_forks','quality_score','site_downloads'])
export const validSlug = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,239}$/.test(value)
export function publicRow(row) {
  if (!validSlug(row.slug) || typeof row.name !== 'string' || !row.name.trim() ||
    !(row.ai_review_approved === true || row.ai_review_approved === 1 || ['owner_published','static_checked'].includes(row.listing_status))) return null
  return Object.fromEntries(PUBLIC_FIELDS.map(key => {
    let value = row[key]
    if (arrays.has(key)) {
      if (typeof value === 'string') try { value=JSON.parse(value) } catch { value=[] }
      value=Array.isArray(value) ? value.filter(s=>typeof s==='string').map(s=>s.slice(0,1000)).slice(0,40) : []
    } else if (numeric.has(key)) value=Number.isFinite(Number(value)) && value!==null ? Math.max(0,Number(value)) : null
    else if (key==='ai_review_approved') value=value===true || value===1
    else value=typeof value==='string' ? value.slice(0,key==='long_description'?6000:key==='description'?6000:2000) : null
    return [key,value]
  }))
}
export function skillExportQuery() {
  const columns=PUBLIC_FIELDS.map(key=>key==='long_description'?`substr(t.${key},1,6000) AS ${key}`:`t.${key}`).join(',')
  return `SELECT t.rowid AS export_cursor,${columns} FROM skills t JOIN directory_skill_ids d ON d.id=t.id
    WHERE ${PUBLICATION_SQL} AND t.rowid>? ORDER BY t.rowid LIMIT 400`
}
export function safeUrl(input) {
  if (typeof input!=='string') return null
  if (/^#[a-zA-Z0-9_.:-]+$/.test(input)) return input
  if (/^\/(?!\/)/.test(input) && !/[\\\x00-\x1f]/.test(input)) return input
  try { const url=new URL(input); return url.protocol==='https:' && !url.username && !url.password ? url.href : null } catch { return null }
}
export function assertCatalog(data) {
  if(data.version!==1 || !Number.isFinite(Date.parse(data.capturedAt)) || Date.parse(data.capturedAt)>Date.now()+60000 ||
    !Array.isArray(data.skills) || !data.skills.length || data.skills.length>50000) throw new Error('Invalid public catalog')
  const seen=new Set()
  for(const row of data.skills) {
    if(!publicRow(row) || seen.has(row.slug) || Object.keys(row).some(key=>!PUBLIC_FIELDS.includes(key))) throw new Error('Invalid or private catalog record')
    seen.add(row.slug)
  }
  return data
}
