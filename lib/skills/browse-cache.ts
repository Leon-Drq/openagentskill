import { SKILL_CATEGORIES } from './taxonomy'
import { MOTION_CATEGORY } from '../motion/shared'
import { isContentQueryKey } from '../public-page-routing'

const sorts = ['quality', 'stars', 'fresh', 'new', 'trending', 'downloads'] as const
const categories = new Set<string>([...SKILL_CATEGORIES.map(row => row[0]), MOTION_CATEGORY])
const accesses = new Set(['free', 'paid', 'third-party'])
const allowed = new Set(['sort', 'page', 'category', 'access', 'featured', 'examples', 'view'])
export const BROWSE_CACHE_MAX_PAGE = 10

export type BrowseVariant = { key: string; params: Record<string, string> }

/** Only common, finite browse states; free text and compound filters stay dynamic.
 * At most 8 locales × 6 sorts × 10 pages × (1 + 20 categories + 3 access + 2 flags).
 * Attribution and transport never become model keys or cached client state.
 */
export function directoryBrowseVariant(query: URLSearchParams): BrowseVariant | null {
  for (const key of query.keys()) {
    if (!isContentQueryKey(key)) continue
    if (!allowed.has(key) || query.getAll(key).length !== 1) return null
  }
  const sort = query.get('sort') ?? 'quality'
  const page = query.get('page') ?? '1'
  if (!sorts.includes(sort as typeof sorts[number]) || !/^[1-9]\d*$/.test(page) || Number(page) > BROWSE_CACHE_MAX_PAGE) return null
  const category = query.get('category') ?? 'all'
  const access = query.get('access') ?? 'all'
  if (category !== 'all' && !categories.has(category)) return null
  if (access !== 'all' && !accesses.has(access)) return null
  for (const flag of ['featured', 'examples']) if (query.has(flag) && !['true', 'false'].includes(query.get(flag)!)) return null
  if (query.has('view') && !['all', 'skills'].includes(query.get('view')!)) return null
  const featured = query.has('featured') ? query.get('featured') === 'true' : query.get('view') === 'skills'
  const choices: [string, string][] = []
  if (category !== 'all') choices.push(['category', category])
  if (access !== 'all') choices.push(['access', access])
  if (featured) choices.push(['featured', 'true'])
  if (query.get('examples') === 'true') choices.push(['examples', 'true'])
  if (choices.length > 1) return null
  const [facet, value] = choices[0] || ['all', 'all']
  return {
    key: `${sort}~${page}~${facet}~${value}`,
    params: { sort, page, ...(facet === 'all' ? {} : { [facet]: value }) },
  }
}

/** Validate internal path keys as strictly as public inputs. No arbitrary ISR keys. */
export function parseDirectoryBrowseVariant(key: string): BrowseVariant | null {
  const parts = key.split('~')
  if (parts.length !== 4) return null
  const [sort, page, facet, value] = parts
  if (facet !== 'all' && !['category', 'access', 'featured', 'examples'].includes(facet)) return null
  const query = new URLSearchParams({ sort, page, ...(facet === 'all' ? {} : { [facet]: value }) })
  const variant = directoryBrowseVariant(query)
  return variant?.key === key ? variant : null
}
