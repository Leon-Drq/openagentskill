export async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label = 'operation'
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })

  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}
