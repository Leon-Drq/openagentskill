import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
import { inspectExport } from './inspect-cloudflare-export.mjs'

test('local export inspection verifies all rows and refuses tampered or incomplete archives', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'openagentskill-export-test-'))
  const write = (file, value) => writeFileSync(join(directory, file), JSON.stringify(value))
  try {
    mkdirSync(join(directory, 'raw'))
    const rows = [['9007199254740993', '中文\nquoted "value"'], ['2', null]]
    const body = rows.map(row => JSON.stringify(row)).join('\n') + '\n'
    const hashSum = rows.reduce((n, row) => n + BigInt.asIntN(64, BigInt(`0x${createHash('md5').update(JSON.stringify(row)).digest('hex').slice(0, 16)}`)), 0n).toString()
    const table = { schema: 'public', name: 'skills', rows: 2, chunk: 1, done: true }
    const manifest = { project: 'rtuodkczrlkxwwtaxwrr', tables: [table], verification: [{ schema: 'public', name: 'skills', row_count: '2', row_hash_sum: hashSum }] }
    write('export-manifest.json', manifest)
    write('catalog-tables.json', [{ schema: 'public', name: 'skills' }])
    write('catalog-columns.json', ['id', 'description'].map((column_name, index) => ({ schema: 'public', name: 'skills', column_name, position: index + 1, not_null: index === 0 })))
    const filename = 'raw/public.skills.00000.jsonl'
    writeFileSync(join(directory, filename), body)
    write(`${filename}.meta.json`, { row_count: '2', raw_bytes: String(Buffer.byteLength(body)), row_hash_sum: hashSum, sha256: createHash('sha256').update(body).digest('hex') })
    const result = await inspectExport(directory)
    assert.equal(result.totalRows, 2)
    assert.equal(result.verifiedChunks, 1)
    assert.equal(result.tables[0].maxRowValueBytes, Buffer.byteLength(rows[0][0] + rows[0][1]))
    assert.ok(!JSON.stringify(result).includes(rows[0][0]), 'reports never contain row values')
    writeFileSync(join(directory, filename), body.replace('9007199254740993', '9007199254740994'))
    await assert.rejects(inspectExport(directory), /integrity mismatch/)
    writeFileSync(join(directory, filename), body)
    manifest.tables[0].done = false
    write('export-manifest.json', manifest)
    await assert.rejects(inspectExport(directory), /Incomplete/)
  } finally {
    assert.ok(resolve(directory).startsWith(resolve(tmpdir()) + '\\') || resolve(directory).startsWith(resolve(tmpdir()) + '/'))
    rmSync(directory, { recursive: true })
  }
})
