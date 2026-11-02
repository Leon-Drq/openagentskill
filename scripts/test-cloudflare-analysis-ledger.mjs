import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { createD1AnalysisLedger } from '../lib/ai/cloudflare-ledger.ts'
const db = new DatabaseSync(':memory:')
db.exec(readFileSync(new URL('../cloudflare/migrations/analysis/0001_analysis_ledger.sql', import.meta.url), 'utf8'))
let failRead = false
const binding = {
  prepare(sql) { return { sql, values: [], bind(...values) { return { sql, values } } } },
  async batch(statements) {
    db.exec('BEGIN IMMEDIATE')
    try {
      const results = statements.map((s, index) => {
        if (failRead && index === 1) throw new Error('private diagnostic')
        return { success: true, results: db.prepare(s.sql).all(...s.values).map(row => ({ ...row })) }
      })
      db.exec('COMMIT'); return results
    } catch (error) { db.exec('ROLLBACK'); throw error }
  },
}
const ledger = createD1AnalysisLedger(binding)
const key = n => n.toString(16).padStart(64, '0')
const reserve = (n, amount = 0.001) => ledger.rpc('reserve_skill_analysis', {
  p_key: key(n), p_feature: 'test', p_model: 'fixed-test-model', p_reserved_usd: amount,
})
const finish = (id, error = null) => ledger.rpc('finish_skill_analysis', {
  p_id: id, p_response: error ? null : JSON.stringify({ text: "safe ' bound content", reviewedAt: new Date().toISOString() }),
  p_input_tokens: 20, p_output_tokens: 10, p_error: error,
})
const clear = () => db.exec('DELETE FROM skill_analysis_ledger')
const total = () => db.prepare('SELECT count(*) AS n, coalesce(sum(reserved_microusd),0) AS spent FROM skill_analysis_ledger').get()

for (const amount of [0, -1, 0.100001, NaN, Infinity, '0.01']) assert.ok((await reserve(1, amount)).error)
assert.equal(total().n, 0)
failRead = true
assert.ok((await reserve(1)).error)
assert.equal(total().n, 0, 'batch rollback removes an uncertain reservation before inference')
failRead = false

const same = await Promise.all(Array.from({ length: 30 }, () => reserve(1)))
assert.equal(same.filter(r => r.data?.status === 'reserved').length, 1)
assert.equal(same.filter(r => r.data?.status === 'cooldown').length, 29)
const first = same.find(r => r.data?.status === 'reserved').data.id
assert.equal((await finish(first)).error, null)
assert.equal((await reserve(1)).data.status, 'cached')
await finish(first, 'late-failure')
assert.equal((await reserve(1)).data.status, 'cached', 'late failure cannot replace a completed review')
db.exec("UPDATE skill_analysis_ledger SET created_at = created_at - 86405000")
assert.equal((await reserve(1)).data.status, 'cached', 'seven-day cache outlives one-day cooldown')
db.exec('UPDATE skill_analysis_ledger SET cache_until = 0')
assert.equal((await reserve(1)).data.status, 'reserved')

clear()
const countResults = await Promise.all(Array.from({ length: 140 }, (_, n) => reserve(n)))
assert.equal(countResults.filter(r => r.data?.status === 'reserved').length, 100)
assert.equal(countResults.filter(r => r.data?.status === 'budget_exhausted').length, 40)
assert.equal(total().n, 100)
assert.equal(total().spent, 100_000)
clear()
const priceResults = await Promise.all(Array.from({ length: 30 }, (_, n) => reserve(n, 0.1)))
assert.equal(priceResults.filter(r => r.data?.status === 'reserved').length, 20)
assert.equal(total().spent, 2_000_000)
for (const result of priceResults.filter(r => r.data?.id)) await finish(result.data.id, 'provider_unavailable')
assert.equal((await reserve(100)).data.status, 'budget_exhausted', 'failed calls retain their full reserved spend')
assert.equal((await reserve(1)).data.status, 'cooldown', 'failures cannot retry their key during cooldown')
db.exec('UPDATE skill_analysis_ledger SET created_at = created_at - 86405000')
assert.equal((await reserve(100)).data.status, 'reserved', 'budget expires after a full rolling day')

clear()
await reserve(1, 0.0000011)
assert.equal(total().spent, 2, 'fractional microdollars round up')
const injection = await ledger.rpc('reserve_skill_analysis', { p_key: key(2), p_feature: "x'); DROP TABLE skill_analysis_ledger; --", p_model: 'test', p_reserved_usd: 0.001 })
assert.equal(injection.data.status, 'reserved')
assert.equal(total().n, 2)
assert.ok((await ledger.rpc('unsupported', {})).error)
db.close()
console.log('D1 analysis ledger: real SQLite constraints, atomic reservations, shared count/spend limits, cooldown/cache expiry, retained failed costs, immutable completion, bound input and batch rollback passed.')
