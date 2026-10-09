// Only bounded channel labels and public paths enter analytics. Never persist
// search text, task prompts, receipt fragments, credentials or referrer URLs.
export const GROWTH_ATTRIBUTION_KEY = 'openagentskill.growth.v1'
export const GROWTH_SESSION_MS = 30 * 60 * 1000

export interface GrowthAttribution {
  acquisition_source: string
  acquisition_channel: 'ai_search' | 'organic_search' | 'campaign' | 'referral' | 'direct'
  landing_path: string
}

const aiSources: Record<string, string> = {
  'chatgpt.com': 'chatgpt', 'chat.openai.com': 'chatgpt',
  'perplexity.ai': 'perplexity', 'claude.ai': 'claude',
  'gemini.google.com': 'gemini', 'copilot.microsoft.com': 'copilot',
}
const searchSources: Record<string, string> = {
  'google.com': 'google', 'google.co.uk': 'google', 'google.de': 'google',
  'google.fr': 'google', 'google.co.jp': 'google', 'google.co.in': 'google',
  'bing.com': 'bing', 'duckduckgo.com': 'duckduckgo', 'search.yahoo.com': 'yahoo',
  'baidu.com': 'baidu',
}
const hostKey = (host: string) => host.toLowerCase().replace(/^www\./, '')

export function analyticsPath(path: string) {
  try {
    const pathname = new URL(path, 'https://www.openagentskill.com').pathname
    // Private/account URLs must not become high-cardinality identifiers.
    if (/^\/(?:[a-z]{2}\/)?(?:auth|profile|creator|admin|api)(?:\/|$)/.test(pathname)) return '/private'
    return pathname.slice(0, 300)
  } catch { return '/' }
}

export function inferGrowthAttribution(href: string, referrer: string): GrowthAttribution {
  const url = new URL(href, 'https://www.openagentskill.com')
  const landing_path = analyticsPath(url.pathname)
  const campaign = hostKey(url.searchParams.get('utm_source') || '')
  if (aiSources[campaign]) return { acquisition_source: aiSources[campaign], acquisition_channel: 'ai_search', landing_path }
  if (campaign) return { acquisition_source: 'campaign', acquisition_channel: 'campaign', landing_path }
  try {
    const host = hostKey(new URL(referrer).hostname)
    if (host === hostKey(url.hostname)) return { acquisition_source: 'direct', acquisition_channel: 'direct', landing_path }
    if (aiSources[host]) return { acquisition_source: aiSources[host], acquisition_channel: 'ai_search', landing_path }
    if (searchSources[host]) return { acquisition_source: searchSources[host], acquisition_channel: 'organic_search', landing_path }
    return { acquisition_source: 'referral', acquisition_channel: 'referral', landing_path }
  } catch { return { acquisition_source: 'direct', acquisition_channel: 'direct', landing_path } }
}

export function analyticsPageType(path: string) {
  const normalized = analyticsPath(path).replace(/^\/(?:zh|ja|ko|es|de|fr|id)(?=\/|$)/, '') || '/'
  if (normalized === '/') return 'home'
  if (/^\/skills\/[^/]+$/.test(normalized)) return 'skill_detail'
  if (normalized === '/skills') return 'directory'
  if (/^\/(?:best|tasks|use-cases|collections|rankings)(?:\/|$)/.test(normalized)) return 'topic'
  if (/^\/(?:guides|blog)(?:\/|$)/.test(normalized)) return 'guide'
  if (normalized.startsWith('/showcase')) return 'example'
  return 'other'
}

export const ACTIVATION_EVENTS = new Set([
  'skill_install_copy', 'skill_install_start', 'showcase_task_copy',
  'showcase_handoff_copy', 'localized_resolve_copy_install',
])

export interface GrowthSession { attribution: GrowthAttribution; lastSeen: number; activated: boolean }

export function readGrowthSession(raw: string | null, now: number): GrowthSession | null {
  try {
    const value = JSON.parse(raw || 'null') as GrowthSession | null
    if (!value || !Number.isFinite(value.lastSeen) || value.lastSeen > now || now - value.lastSeen >= GROWTH_SESSION_MS || typeof value.activated !== 'boolean') return null
    const a = value.attribution
    if (!a || !['ai_search','organic_search','campaign','referral','direct'].includes(a.acquisition_channel) ||
      !['chatgpt','perplexity','claude','gemini','copilot','google','bing','duckduckgo','yahoo','baidu','campaign','referral','direct'].includes(a.acquisition_source) ||
      typeof a.landing_path !== 'string' || !a.landing_path.startsWith('/') || a.landing_path !== analyticsPath(a.landing_path)) return null
    return value
  } catch { return null }
}
