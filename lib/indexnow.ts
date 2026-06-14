const SITE_URL = 'https://www.openagentskill.com'
const SITE_HOST = 'www.openagentskill.com'
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '2c3f8b6e7f9a4b18ad0c9136f61d5a2e'
export const INDEXNOW_KEY_LOCATION =
  process.env.INDEXNOW_KEY_LOCATION || `${SITE_URL}/${INDEXNOW_KEY}.txt`

export interface IndexNowSubmitResult {
  skipped: boolean
  success: boolean
  status: number | null
  submitted: string[]
  message: string
  responseBody?: string
}

export function normalizeIndexNowUrl(value: string): string | null {
  if (!value) return null

  try {
    const url = new URL(value, SITE_URL)
    if (!['www.openagentskill.com', 'openagentskill.com'].includes(url.hostname)) return null
    url.protocol = 'https:'
    url.hostname = SITE_HOST
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

export function buildIndexNowUrlsForSkill(slug: string) {
  const encodedSlug = encodeURIComponent(slug)
  return [
    `/skills/${encodedSlug}`,
    `/skills/${encodedSlug}/audit`,
    `/api/agent/skills/${encodedSlug}`,
    '/skills',
    '/trending',
    '/hot',
    '/agent',
    '/agent-skills',
    '/ai-agent-skills',
    '/sitemap.xml',
  ]
}

export function collectIndexNowUrlsFromIndexerResults(
  results: Array<{ status?: string; slug?: string }> = []
) {
  const urls = new Set<string>()

  for (const result of results) {
    if (!result.slug) continue
    if (result.status !== 'indexed' && result.status !== 'updated') continue
    for (const url of buildIndexNowUrlsForSkill(result.slug)) {
      const normalized = normalizeIndexNowUrl(url)
      if (normalized) urls.add(normalized)
    }
  }

  return Array.from(urls)
}

export function getBaselineIndexNowUrls() {
  return [
    '/',
    '/skills',
    '/agent',
    '/agent-skills',
    '/ai-agent-skills',
    '/skills-registry',
    '/openagentskill',
    '/trending',
    '/hot',
    '/best',
    '/tasks',
    '/rankings',
    '/reports/weekly',
    '/alternatives/agentskills-io',
    '/sitemap.xml',
  ]
    .map((url) => normalizeIndexNowUrl(url))
    .filter((url): url is string => Boolean(url))
}

export async function submitIndexNowUrls(urls: string[]): Promise<IndexNowSubmitResult> {
  const urlList = Array.from(
    new Set(
      urls
        .map((url) => normalizeIndexNowUrl(url))
        .filter((url): url is string => Boolean(url))
    )
  ).slice(0, 10_000)

  if (process.env.INDEXNOW_DISABLED === 'true') {
    return {
      skipped: true,
      success: true,
      status: null,
      submitted: urlList,
      message: 'IndexNow submission disabled by INDEXNOW_DISABLED=true.',
    }
  }

  if (urlList.length === 0) {
    return {
      skipped: true,
      success: true,
      status: null,
      submitted: [],
      message: 'No valid OpenAgentSkill URLs to submit.',
    }
  }

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        host: SITE_HOST,
        key: INDEXNOW_KEY,
        keyLocation: INDEXNOW_KEY_LOCATION,
        urlList,
      }),
    })
    const responseBody = await response.text().catch(() => '')

    return {
      skipped: false,
      success: response.ok,
      status: response.status,
      submitted: urlList,
      message: response.ok
        ? `Submitted ${urlList.length} URL${urlList.length === 1 ? '' : 's'} to IndexNow.`
        : `IndexNow returned HTTP ${response.status}.`,
      responseBody: responseBody || undefined,
    }
  } catch (error) {
    return {
      skipped: false,
      success: false,
      status: null,
      submitted: urlList,
      message: error instanceof Error ? error.message : 'IndexNow submission failed.',
    }
  }
}
