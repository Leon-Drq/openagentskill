import { publicCachedRoute } from './public-cached-routing'
import { isContentQueryKey } from './public-page-routing'
import { getExternalSkill } from './skills/external-catalog'
import { getMotionEntry } from './motion/catalog'

// Explicit public data routes only. Payments, sessions, owner publication and
// webhooks keep their existing authentication/transaction and retry contracts.
const dataApis = /^\/api\/(?:registry(?:\/|$)|skills\/(?:search|lookup|engagement|[^/]+\/(?:install|download|download-action))(?:\/|$)|agent\/(?:resolve|recommend|skills|rankings|evals|outcome|feedback|receipt|funnel|weekly-report|growth-readiness|discovery|tasks|packs)(?:\/|$)|audits\/|badge\/|activity$|events\/skill$|showcase\/engagement$|cron\/|indexer\/)/

export function maintenanceRoute(pathname: string, query: URLSearchParams): 'api' | 'page' | null {
  if (dataApis.test(pathname)) return 'api'
  const path = pathname.replace(/^\/(zh|ja|ko|es|de|fr|id)(?=\/|$)/, '') || '/'
  const contentQuery = [...query.keys()].some(key => key !== 'lang' && isContentQueryKey(key))
  if (path === '/skills') {
    // Finite browse states use the saved model. Free-text and compound live
    // queries receive an honest temporary failure, not unrelated saved results.
    return publicCachedRoute(pathname, query) ? null : 'page'
  }
  const detail = path.match(/^\/skills\/([^/]+)(\/(?:audit|evals))?$/)
  if (detail && !['new', 'external'].includes(detail[1])) {
    // Only real static products bypass this gate; a slug prefix is insufficient.
    if (!detail[2] && (getExternalSkill(detail[1]) || getMotionEntry(detail[1]))) return null
    return 'page'
  }
  if (/^\/alternatives\/[^/]+$/.test(path)) return 'page'
  if (contentQuery && /^\/(resolve|compare|tasks|skill-packs)$/.test(path)) return 'page'
  return null
}
