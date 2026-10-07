// Only public source identities; never export contact, submission or review data.
export const MEDIA_FEED_SELECT = 'slug,name,github_repo,repository,source_path,source_ref,source_commit_sha,primary_category,created_at'
export const MEDIA_FEED_PAGE_SIZE = 500
export function mediaFeedCursor(value: string | null) {
  if (value !== null && !/^[a-z0-9][a-z0-9-]{0,239}$/.test(value)) throw new Error('Invalid cursor')
  return value
}
