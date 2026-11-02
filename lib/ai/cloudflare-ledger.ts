import { randomUUID } from 'node:crypto'

interface Statement {
  bind(...values: (string | number | null)[]): Statement
}
interface Result { success: boolean; results?: Record<string, unknown>[] }
export interface AnalysisDatabase {
  prepare(sql: string): Statement
  batch(statements: Statement[]): Promise<Result[]>
}
const day = 86_400_000
const tokenCount = (value: unknown): number | null => {
  if (value === null) return null
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new Error('invalid token count')
  return Number(value)
}
const sqlNow = 'CAST(unixepoch(\'subsec\') * 1000 AS INTEGER)'

/** Private D1 implementation of the two analysis RPC contracts. */
export function createD1AnalysisLedger(db: AnalysisDatabase) {
  return { async rpc(name: string, args: Record<string, unknown>): Promise<{
    data: Record<string, unknown> | null; error: Error | null;
  }> {
    try {
      if (name === 'reserve_skill_analysis') {
        const { p_key: key, p_feature: feature, p_model: model, p_reserved_usd: usd } = args
        if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key)
          || typeof feature !== 'string' || !feature.length || feature.length > 120
          || typeof model !== 'string' || !model.length || model.length > 160
          || typeof usd !== 'number' || !Number.isFinite(usd) || usd <= 0 || usd > 0.1) throw new Error('invalid reservation')
        const amount = Math.ceil(usd * 1_000_000)
        const id = randomUUID()
        // A single conditional INSERT atomically checks both the shared budget
        // and this key's cache/cooldown. There is no read-then-write race across
        // workers. D1 batch rolls back the insertion if the result read fails.
        const result = await db.batch([
          db.prepare(`INSERT INTO skill_analysis_ledger
            (id, request_key, feature, model, reserved_microusd, created_at, cache_until)
            SELECT ?1, ?2, ?3, ?4, ?5, ${sqlNow}, ${sqlNow} + ${7 * day}
            WHERE NOT EXISTS (
              SELECT 1 FROM (SELECT status, cache_until, created_at FROM skill_analysis_ledger
                WHERE request_key = ?2 ORDER BY created_at DESC, rowid DESC LIMIT 1)
              WHERE (status = 'complete' AND cache_until > ${sqlNow}) OR created_at > ${sqlNow} - ${day}
            ) AND (SELECT count(*) FROM skill_analysis_ledger WHERE created_at >= ${sqlNow} - ${day}) < 100
              AND (SELECT coalesce(sum(reserved_microusd), 0) FROM skill_analysis_ledger
                WHERE created_at >= ${sqlNow} - ${day}) + ?5 <= 2000000
            RETURNING id`).bind(id, key, feature, model, amount),
          db.prepare(`SELECT id, status, response,
            (cache_until > ${sqlNow}) AS cached,
            (created_at > ${sqlNow} - ${day}) AS cooldown
            FROM skill_analysis_ledger WHERE request_key = ?1
            ORDER BY created_at DESC, rowid DESC LIMIT 1`).bind(key),
        ])
        if (result.length !== 2 || result.some(r => !r.success)) throw new Error('database unavailable')
        if (result[0].results?.[0]?.id === id) return { data: { status: 'reserved', id }, error: null }
        const previous = result[1].results?.[0]
        if (previous?.status === 'complete' && previous.cached === 1) {
          return { data: { status: 'cached', response: previous.response }, error: null }
        }
        return { data: { status: previous?.cooldown === 1 ? 'cooldown' : 'budget_exhausted' }, error: null }
      }
      if (name === 'finish_skill_analysis') {
        const { p_id: id, p_response: response, p_error: error } = args
        if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)
          || (response !== null && typeof response !== 'string')
          || (error !== null && typeof error !== 'string')
          || (error === null && (typeof response !== 'string' || response.length > 30_000))) throw new Error('invalid completion')
        const results = await db.batch([db.prepare(`UPDATE skill_analysis_ledger
          SET status = ?1, response = ?2, input_tokens = ?3, output_tokens = ?4,
              error_code = ?5, finished_at = ${sqlNow}
          WHERE id = ?6 AND status = 'reserved'`).bind(error === null ? 'complete' : 'failed',
            response === null ? null : response.slice(0, 30_000), tokenCount(args.p_input_tokens),
            tokenCount(args.p_output_tokens), error === null ? null : error.slice(0, 120), id)])
        if (results.length !== 1 || !results[0].success) throw new Error('database unavailable')
        return { data: null, error: null }
      }
      throw new Error('unsupported operation')
    } catch {
      // D1 diagnostics may include SQL or bound data; do not expose them.
      return { data: null, error: new Error('analysis_ledger_unavailable') }
    }
  } }
}

export async function cloudflareAnalysisLedger() {
  const { getCloudflareContext } = await import('@opennextjs/cloudflare')
  const db = (getCloudflareContext().env as { ANALYSIS_DB?: AnalysisDatabase }).ANALYSIS_DB
  if (!db) throw new Error('analysis_ledger_unavailable')
  return createD1AnalysisLedger(db)
}
