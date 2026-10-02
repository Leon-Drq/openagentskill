/** Never replay an X mutation: a network failure can occur after acceptance. */
export async function fetchX(input: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<Response> {
  const signal = init.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs)
  const response = await fetch(input, { ...init, signal })
  // Include the response body in the deadline, not just receipt of headers.
  const body = await response.text()
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers })
}
