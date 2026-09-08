import 'server-only'
import { generateText } from 'ai'
import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export class DeferredAnalysisError extends Error {}

/** All model calls share a durable reservation, retry cooldown, and cache. Fail closed. */
export async function controlledGeneration(input: {
  model: string; prompt: string; fingerprint: string; feature: string;
}) {
  // Do not silently route a cost-controlled job to an unpriced premium model.
  if (input.model !== 'deepseek/deepseek-v4-flash') throw new DeferredAnalysisError('Model requires an explicit reviewed price envelope')
  const bytes = Buffer.byteLength(input.prompt, 'utf8')
  if (bytes > 30_000) throw new DeferredAnalysisError('Analysis input exceeds the bounded context')
  const maxOutputTokens = 2048
  // Conservative price envelope, NOT a supplier invoice or a supplier-side spending limit.
  const reservationUsd = (bytes * 0.5 + maxOutputTokens * 2) / 1_000_000
  const requestKey = createHash('sha256').update(`${input.feature}:${input.model}:${input.fingerprint}`).digest('hex')
  const db = createAdminClient({ requestTimeoutMs: 12_000 })
  const { data: reservation, error } = await db.rpc('reserve_skill_analysis', {
    p_key: requestKey, p_feature: input.feature, p_model: input.model, p_reserved_usd: reservationUsd,
  })
  if (error) throw new DeferredAnalysisError('Analysis ledger unavailable; queued without calling model')
  if (reservation.status === 'cached') return String(reservation.response)
  if (reservation.status !== 'reserved') throw new DeferredAnalysisError(`Analysis deferred: ${reservation.status}`)
  try {
    const result = await generateText({
      model: input.model, prompt: input.prompt, temperature: 0.2,
      maxOutputTokens, maxRetries: 0, abortSignal: AbortSignal.timeout(30_000),
      providerOptions: { gateway: { tags: [`feature:${input.feature}`, 'policy:risk-first-v1'] } },
    })
    const { error: saveError } = await db.rpc('finish_skill_analysis', {
      p_id: reservation.id, p_response: result.text,
      p_input_tokens: result.usage.inputTokens ?? null,
      p_output_tokens: result.usage.outputTokens ?? null,
      p_error: null,
    })
    if (saveError) throw new DeferredAnalysisError('Unable to persist analysis; reservation retained')
    return result.text
  } catch (error) {
    await db.rpc('finish_skill_analysis', {
      p_id: reservation.id, p_response: null, p_input_tokens: null, p_output_tokens: null,
      p_error: error instanceof Error ? error.name : 'AnalysisError',
    })
    // Never log prompts, source code, raw provider errors, or credentials.
    throw new DeferredAnalysisError('Analysis unavailable; retained reservation and 24-hour cooldown')
  }
}
