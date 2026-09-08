import { type BlogGenerateResult } from '@/lib/blog/generate'
import { prepareEditorialWeek } from '@/lib/blog/editorial'
import { submitIndexNowUrls, type IndexNowSubmitResult } from '@/lib/indexnow'

export interface SeoDripOptions {
  perRun?: number
  dailyLimit?: number
  candidatePool?: number
}

export interface SeoDripResult {
  status: 'generated' | 'skipped'
  reason?: string
  dailyLimit: number
  alreadyGeneratedToday: number
  remainingToday: number
  attempted: number
  generated: number
  candidatesChecked: number
  results: Array<BlogGenerateResult & { skill_slug?: string }>
  indexing: IndexNowSubmitResult
  window: {
    start: string
    end: string
  }
}

function utcDayWindow(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const end = new Date(start.getTime() + 86_400_000)
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

export async function runSeoDrip(_options: SeoDripOptions = {}): Promise<SeoDripResult> {
  void _options
  await prepareEditorialWeek()
  const window = utcDayWindow()
  return {
    status: 'skipped', reason: 'Weekly editorial queue prepared: 20 researched articles, no per-skill AI generation.',
    dailyLimit: 0, alreadyGeneratedToday: 0, remainingToday: 0, attempted: 0, generated: 0,
    candidatesChecked: 0, results: [], indexing: await submitIndexNowUrls([]), window,
  }
}
