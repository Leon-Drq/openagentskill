// The dated model is deliberately fixed: no automatic provider/model fallback.
export const CLOUDFLARE_REVIEW_MODEL = '@cf/deepseek-ai/deepseek-v4-flash-0731'
// Checked 2026-11-02: $0.44/M input and $1.32/M output, below the
// existing conservative $0.50/$2.00 reservation envelope.
// https://developers.cloudflare.com/workers-ai/models/deepseek-v4-flash-0731/
export interface WorkersAIBinding {
  run(model: string, input: Record<string, unknown>, options: {
    signal: AbortSignal; returnRawResponse: true;
  }): Promise<Response>
}

const tokenCount = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null

/** Called only after a durable cost reservation. Never retries an inference. */
export async function generateWithWorkersAI(ai: WorkersAIBinding, prompt: string, signal: AbortSignal) {
  if (!prompt || Buffer.byteLength(prompt, 'utf8') > 30_000) throw new Error('input_limit')
  signal.throwIfAborted()
  const response = await ai.run(CLOUDFLARE_REVIEW_MODEL, {
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2, max_completion_tokens: 2048, reasoning_effort: 'none',
    stream: false, n: 1, store: false,
  }, { signal, returnRawResponse: true })
  if (!response.ok || !response.body) {
    await response.body?.cancel()
    throw new Error('provider_unavailable')
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0, complete = false
  try {
    while (true) {
      signal.throwIfAborted()
      const { value, done } = await reader.read()
      if (done) { complete = true; break }
      size += value.byteLength
      if (size > 65_536) throw new Error('provider_response_limit')
      chunks.push(value)
    }
  } finally {
    if (!complete) await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  const result = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  const choice = result?.choices?.[0]
  if (result?.choices?.length !== 1 || choice?.finish_reason !== 'stop'
    || typeof choice.message?.content !== 'string' || !choice.message.content.trim()
    || choice.message.tool_calls?.length || choice.message.refusal) throw new Error('provider_response_invalid')
  const inputTokens = tokenCount(result.usage?.prompt_tokens)
  const outputTokens = tokenCount(result.usage?.completion_tokens)
  if (outputTokens !== null && outputTokens > 2048) throw new Error('provider_response_limit')
  return { text: choice.message.content, usage: { inputTokens, outputTokens } }
}

export async function cloudflareGeneration(prompt: string) {
  const { getCloudflareContext } = await import('@opennextjs/cloudflare')
  const binding = (getCloudflareContext().env as { AI?: WorkersAIBinding }).AI
  if (!binding) throw new Error('provider_not_configured')
  return generateWithWorkersAI(binding, prompt, AbortSignal.timeout(30_000))
}
