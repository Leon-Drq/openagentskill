import assert from 'node:assert/strict'

// Node's type-stripping runner needs the explicit extension for this standalone test.
// @ts-expect-error TS5097 is expected for this standalone Node test entrypoint.
import { createResilientTimeoutFetch } from '../lib/supabase/resilient-fetch.ts'

type CircuitGlobal = typeof globalThis & {
  __openagentskillSupabaseCircuit?: unknown
}

async function main() {
  const shared = globalThis as CircuitGlobal
  shared.__openagentskillSupabaseCircuit = undefined

  const originalFetch = globalThis.fetch
  let upstreamCalls = 0

  globalThis.fetch = async () => {
    upstreamCalls += 1
    return new Response('upstream unavailable', { status: 522 })
  }

  try {
    const guardedFetch = createResilientTimeoutFetch(100)

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await guardedFetch('https://example.test')
      assert.equal(response.status, 522)
    }

    await assert.rejects(
      () => guardedFetch('https://example.test'),
      /circuit is temporarily open/
    )
    assert.equal(upstreamCalls, 3)
    console.log('Supabase circuit breaker regression test passed.')
  } finally {
    globalThis.fetch = originalFetch
    shared.__openagentskillSupabaseCircuit = undefined
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
