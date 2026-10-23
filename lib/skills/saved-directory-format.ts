// The emergency read model is public metadata, not a database backup or an
// approval mechanism. Keep this allowlist deliberately free of contact data,
// raw instructions, credentials, submissions and arbitrary nested objects.
export const SAVED_DIRECTORY_STRING_FIELDS = [
  'id', 'slug', 'name', 'description', 'tagline', 'author_name', 'author_url',
  'repository', 'github_repo', 'category', 'version', 'license', 'install_command',
  'npm_package', 'submission_source', 'listing_status', 'github_language',
  'github_last_pushed_at', 'source_ref', 'source_path', 'source_commit_sha',
  'source_content_hash', 'source_sync_status', 'created_at', 'updated_at',
] as const
const numbers = ['github_stars', 'github_forks', 'quality_score', 'downloads', 'site_downloads', 'used_by', 'rating', 'review_count'] as const
const booleans = ['verified', 'publisher_verified', 'ai_review_approved'] as const
const arrays = ['tags', 'frameworks', 'ai_review_issues'] as const
export const SAVED_DIRECTORY_MAX_AGE_MS = 30 * 86_400_000
export type SavedDirectoryRow = Record<string, string | number | boolean | string[] | null>

export function publicSavedRow(value: unknown): SavedDirectoryRow | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || /^(fallback|snapshot)-/.test(row.id) || row.submission_source === 'fallback' || row.submission_source === 'curated_snapshot') return null
  if (row.ai_review_approved !== true && row.listing_status !== 'owner_published' && row.listing_status !== 'static_checked') return null
  if (typeof row.slug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,239}$/.test(row.slug)) return null
  if (typeof row.name !== 'string' || typeof row.description !== 'string' || typeof row.created_at !== 'string' || !Number.isFinite(Date.parse(row.created_at))) return null
  const result: SavedDirectoryRow = {}
  for (const key of SAVED_DIRECTORY_STRING_FIELDS) {
    const field = row[key]
    if (typeof field === 'string' && field.length <= (key === 'description' ? 6000 : 2000)) result[key] = field
    else if (field === null) result[key] = null
  }
  for (const key of numbers) if (typeof row[key] === 'number' && Number.isFinite(row[key]) && row[key] >= 0) result[key] = row[key]
  for (const key of booleans) if (typeof row[key] === 'boolean') result[key] = row[key]
  for (const key of arrays) result[key] = Array.isArray(row[key]) ? row[key].filter((x: unknown) => typeof x === 'string' && x.length <= 1000).slice(0, 40) : []
  return result
}

export type SavedDirectory = {
  version: 1
  coverage: 'partial'
  source: 'local-public-cache' | 'public-data-api'
  savedFrom: string
  savedThrough: string
  rows: SavedDirectoryRow[]
}

export function usableSavedDirectory(value: SavedDirectory, now = Date.now()) {
  const oldest = Date.parse(value.savedFrom), newest = Date.parse(value.savedThrough)
  return value.version === 1 && value.coverage === 'partial' && value.rows.length > 0 && value.rows.length <= 2000
    && Number.isFinite(oldest) && Number.isFinite(newest) && oldest <= newest
    && newest <= now + 60_000 && now - oldest <= SAVED_DIRECTORY_MAX_AGE_MS
}
