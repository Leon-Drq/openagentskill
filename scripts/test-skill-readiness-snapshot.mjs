import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { analyze, licenseRecorded, maintenanceState, csvCell, sha256 } from './build-skill-readiness-snapshot.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const base = new URL('../public/research/skill-readiness-2026-10-18/', import.meta.url)
const sourceBytes = readFileSync(new URL('source.json', base))
const manifest = JSON.parse(readFileSync(new URL('manifest.json', base), 'utf8'))
const source = JSON.parse(sourceBytes)
const report = analyze(source, manifest)

assert.equal(sha256(sourceBytes), manifest.sourceSha256)
assert.equal(report.rows.length, source.skills.length)
for (const group of report.groups) {
  assert.equal(group.licenseRecorded + group.licenseNotRecorded, group.records)
  assert.equal(group.within180Days + group.olderThan180Days + group.unknownDate + group.futureDate, group.records)
  assert.equal(group.installPathFlag + group.noInstallPathFlag, group.records)
  assert.equal(group.licenseAndInstallPath + group.installPathWithoutLicense + group.licenseWithoutInstallPath + group.neitherLicenseNorInstallPath, group.records)
  assert.ok(group.allThreeSignals <= Math.min(group.licenseRecorded, group.within180Days, group.installPathFlag))
}
assert.equal(report.groups[1].records, source.skills.filter(row => row.classification === 'agent-skill').length)
assert.equal(report.groups[1].installPathFlag, source.skills.filter(row => row.classification === 'agent-skill' && row.installReady === true).length)

assert.equal(licenseRecorded(' UNKNOWN '), false)
assert.equal(licenseRecorded(null), false)
assert.equal(licenseRecorded('MIT'), true)
assert.equal(licenseRecorded('Custom'), true)
assert.equal(maintenanceState(null, '2026-10-18T00:00:00Z'), 'unknown')
assert.equal(maintenanceState('not a date', '2026-10-18T00:00:00Z'), 'unknown')
assert.equal(maintenanceState('2026-10-19T00:00:00Z', '2026-10-18T00:00:00Z'), 'future-dated')
assert.equal(maintenanceState('2026-04-21T00:00:00Z', '2026-10-18T00:00:00Z'), 'within-180-days')
assert.equal(maintenanceState('2026-04-20T23:59:59Z', '2026-10-18T00:00:00Z'), 'older-than-180-days')
assert.equal(csvCell('=HYPERLINK("https://example.com")'), '"\'=HYPERLINK(""https://example.com"")"')
assert.throws(() => analyze({ ...source, skills: undefined }, manifest), /row-level skills/)
assert.throws(() => analyze({ ...source, metrics: { analyzedCandidates: 1 } }, manifest), /row count/)
assert.throws(() => analyze({ ...source, skills: [...source.skills.slice(0, -1), source.skills[0]] }, manifest), /Duplicate/)

for (const script of ['scripts/build-skill-readiness-snapshot.mjs', 'public/research/skill-readiness-2026-10-18/reproduce.mjs']) {
  const result = spawnSync(process.execPath, [script, '--check'], { cwd: root, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr || result.stdout)
}
console.log(`Frozen metadata snapshot checks passed (${report.rows.length} rows, ${report.groups[1].records} source-classified agent-skill records).`)
