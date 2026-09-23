/** Pure presentation rules shared by public profiles, editing, and regression tests. */
export function publicWebsite(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}

export function repositoryStars(skills: { github_repo?: string | null; repository?: string | null; github_stars?: number | null }[]) {
  const repos = new Map<string, number>()
  for (const skill of skills) {
    const raw = (skill.github_repo || skill.repository || '').trim().toLowerCase()
    const key = raw.replace(/^https?:\/\/github\.com\//, '').replace(/\.git\/?$/, '').replace(/\/$/, '')
    if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(key)) continue
    const stars = Number(skill.github_stars)
    if (Number.isFinite(stars) && stars >= 0) repos.set(key, Math.max(repos.get(key) || 0, stars))
  }
  return [...repos.values()].reduce((sum, stars) => sum + stars, 0)
}

/** Thirty UTC calendar dates, including today, matching the daily aggregate. */
export function creatorDateWindow(now = new Date()) {
  const end = now.toISOString().slice(0, 10)
  const start = new Date(`${end}T00:00:00Z`)
  start.setUTCDate(start.getUTCDate() - 29)
  return { start: start.toISOString().slice(0, 10), end }
}

export const serializeCreatorSchema = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

/** PostgREST caps result pages. Never present a truncated or failed read as a total. */
export async function readCreatorDailyPages<T>(fetchPage: (offset: number) => PromiseLike<{ data: T[] | null; error?: unknown }>) {
  const rows: T[] = []
  for (let offset = 0; offset < 20_000; offset += 1000) {
    const { data, error } = await fetchPage(offset)
    if (error || !data) return { data: null }
    rows.push(...data)
    if (data.length < 1000) return { data: rows }
  }
  return { data: null }
}
