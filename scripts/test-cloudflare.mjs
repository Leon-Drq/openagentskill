import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dispatchScheduled, migrationResponse, previewHeaders } from '../cloudflare/runtime.mjs'

const schedules = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url))).crons

test('apex redirect preserves path and query parameters', () => {
  const response = migrationResponse(new Request('https://openagentskill.com/zh/skills?q=video'), {})
  assert.equal(response.status, 308)
  assert.equal(response.headers.get('Location'), 'https://www.openagentskill.com/zh/skills?q=video')
})

test('preview prevents writes, auth callbacks, cron GETs, and indexing', async () => {
  const env = { MIGRATION_READ_ONLY: '1' }
  for (const path of ['/api/payments/webhook', '/api/x/post-daily', '/auth/callback?code=example', '/profile', '/creator']) {
    const result = migrationResponse(new Request(`https://preview.workers.dev${path}`), env)
    assert.equal(result.status, 503, path)
    assert.equal(result.headers.get('Cache-Control'), 'private, no-store')
  }
  assert.equal(migrationResponse(new Request('https://preview.workers.dev/', { method: 'POST' }), env).status, 503)
  assert.equal(migrationResponse(new Request('https://preview.workers.dev/skills'), env), null)
  assert.match(await migrationResponse(new Request('https://preview.workers.dev/robots.txt'), env).text(), /Disallow: \//)
  assert.equal(previewHeaders(new Response('public content'), env).headers.get('X-Robots-Tag'), 'noindex, nofollow')
  assert.equal(migrationResponse(new Request('https://www.openagentskill.com/api/payments/webhook', { method: 'POST' }), {}), null)
})

test('preview and disabled scheduling perform zero outbound calls', async () => {
  const env = { CRON_SECRET: 'test-only', WORKER_SELF_REFERENCE: { fetch() { assert.fail('unexpected dispatch') } } }
  await dispatchScheduled({ cron: schedules[0].schedule }, env, schedules)
  await dispatchScheduled({ cron: schedules[0].schedule }, { ...env, CRON_ENABLED: '1', MIGRATION_READ_ONLY: '1' }, schedules)
})

test('each existing schedule dispatches exactly its matching jobs inside the account', async () => {
  for (const cron of new Set(schedules.map(job => job.schedule))) {
    const paths = []
    const env = {
      CRON_ENABLED: '1', CRON_SECRET: 'test-only',
      WORKER_SELF_REFERENCE: { async fetch(request) {
        const url = new URL(request.url)
        assert.equal(url.origin, 'https://www.openagentskill.com')
        assert.equal(request.headers.get('Authorization'), 'Bearer test-only')
        assert.equal(request.redirect, 'manual')
        paths.push(url.pathname)
        return new Response('ok')
      } },
    }
    await dispatchScheduled({ cron }, env, schedules)
    assert.deepEqual(paths, schedules.filter(job => job.schedule === cron).map(job => job.path))
  }
})

test('cron failures are visible and never silently retried', async () => {
  let calls = 0
  const env = { CRON_ENABLED: '1', CRON_SECRET: 'test-only', WORKER_SELF_REFERENCE: { async fetch() { calls++; return new Response(null, { status: 503 }) } } }
  await assert.rejects(dispatchScheduled({ cron: schedules[0].schedule }, env, schedules), /HTTP 503/)
  assert.equal(calls, 1)
  await assert.rejects(dispatchScheduled({ cron: 'invalid' }, env, schedules), /Unknown cron/)
  await assert.rejects(dispatchScheduled({ cron: schedules[0].schedule }, { CRON_ENABLED: '1' }, schedules), /credentials/)
})
