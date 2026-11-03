/** Only fixed categories leave this boundary: D1 errors may contain SQL values. */
export function d1ErrorCode(error: unknown): string {
  const messages: string[] = []
  let current = error
  for (let i = 0; i < 4 && current instanceof Error; i++, current = current.cause) messages.push(current.message)
  const text = messages.join(' ')
  if (/network connection lost|replica disconnected|transient issue on remote node/i.test(text)) return 'D1_TRANSIENT_CONNECTION'
  if (/reset because its code was updated|storage caused object to be reset/i.test(text)) return 'D1_TRANSIENT_RESET'
  if (/overloaded|SQLITE_BUSY|database is locked/i.test(text)) return 'D1_OVERLOADED'
  if (/CPU time|memory limit|exceeded.*timeout|too many.*(?:variable|parameter)|too many SQL variables/i.test(text)) return 'D1_RESOURCE_LIMIT'
  if (/constraint failed/i.test(text)) return 'D1_CONSTRAINT'
  if (/no such (?:table|column)|syntax error/i.test(text)) return 'D1_SCHEMA_ERROR'
  return 'D1_OPERATION_FAILED'
}

export function logD1Failure(error: unknown, operation: string): string {
  const code = d1ErrorCode(error)
  console.error('[d1-operation]', { code, operation })
  return code
}

/** Call only for reads or explicitly idempotent operations, never arbitrary writes. */
export async function retryIdempotentD1<T>(operation: () => Promise<T>, label: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await operation() } catch (error) {
      const code = d1ErrorCode(error)
      if (attempt >= 2 || !['D1_TRANSIENT_CONNECTION','D1_TRANSIENT_RESET','D1_OVERLOADED'].includes(code)) throw error
      console.warn('[d1-retry]', { operation: label, code, attempt: attempt + 1 })
      await new Promise(resolve => setTimeout(resolve, 150 * 2 ** attempt + Math.floor(Math.random() * 100)))
    }
  }
}
