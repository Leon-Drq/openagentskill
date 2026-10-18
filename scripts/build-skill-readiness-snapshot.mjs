#!/usr/bin/env node
/** Frozen, reproducible public metadata audit. No registry credentials or Skill execution. */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const SNAPSHOT_ID = 'skill-readiness-2026-10-18'
export const SOURCE_URL = 'https://www.openagentskill.com/reports/state-of-agent-skills-2026.json'
export const REPORT_URL = `https://www.openagentskill.com/reports/${SNAPSHOT_ID}`
const DAY = 86_400_000
const ownPath = fileURLToPath(import.meta.url)
const ownDirectory = path.dirname(ownPath)
const defaultDirectory = existsSync(path.join(ownDirectory, 'source.json'))
  ? ownDirectory
  : path.resolve(ownDirectory, '..', 'public', 'research', SNAPSHOT_ID)

export function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex') }
export function percent(count, denominator) { return denominator ? Math.round(count / denominator * 1000) / 10 : 0 }

export function licenseRecorded(value) {
  return typeof value === 'string' && !['', 'unknown', 'none', 'n/a', 'unlicensed'].includes(value.trim().toLowerCase())
}

export function maintenanceState(value, referenceTime) {
  if (!value) return 'unknown'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 'unknown'
  const elapsed = Date.parse(referenceTime) - timestamp
  if (elapsed < 0) return 'future-dated'
  return elapsed <= 180 * DAY ? 'within-180-days' : 'older-than-180-days'
}

function required(condition, message) {
  if (!condition) throw new Error(message)
}

export function analyze(source, provenance) {
  required(Array.isArray(source.skills) && source.skills.length > 0, 'Source must include non-empty row-level skills; aggregate/shortlist data is insufficient.')
  required(Number.isFinite(Date.parse(source.generatedAt)), 'Source generatedAt must be a valid timestamp.')
  required(source.metrics?.analyzedCandidates === source.skills.length, 'Source row count differs from analyzedCandidates.')
  required(new Set(source.skills.map(row => row.slug)).size === source.skills.length, 'Duplicate row slugs are not allowed.')
  const rows = source.skills.map((row, index) => {
    required(typeof row.slug === 'string' && row.slug.length > 0, `Row ${index} lacks slug.`)
    required(typeof row.repository === 'string' && typeof row.license === 'string', `Row ${index} lacks repository/license metadata.`)
    required(typeof row.installReady === 'boolean', `Row ${index} lacks a boolean installReady field.`)
    required(typeof row.classification === 'string', `Row ${index} lacks classification.`)
    const maintenance = maintenanceState(row.lastPushedAt, source.generatedAt)
    return {
      sourcePosition: index + 1,
      slug: row.slug,
      name: row.name,
      repository: row.repository,
      sourceClassification: row.classification,
      licenseValue: row.license,
      licenseRecorded: licenseRecorded(row.license),
      sourceLastPushedAt: row.lastPushedAt,
      maintenanceState: maintenance,
      installPathFlag: row.installReady,
      canonicalUrl: row.canonicalUrl,
    }
  })
  const strictRows = rows.filter(row => row.sourceClassification === 'agent-skill')
  const summarize = (subset, label) => {
    const count = predicate => subset.filter(predicate).length
    return {
      label,
      records: subset.length,
      uniqueRepositories: new Set(subset.map(row => row.repository.toLowerCase())).size,
      licenseRecorded: count(row => row.licenseRecorded),
      licenseNotRecorded: count(row => !row.licenseRecorded),
      within180Days: count(row => row.maintenanceState === 'within-180-days'),
      olderThan180Days: count(row => row.maintenanceState === 'older-than-180-days'),
      unknownDate: count(row => row.maintenanceState === 'unknown'),
      futureDate: count(row => row.maintenanceState === 'future-dated'),
      installPathFlag: count(row => row.installPathFlag),
      noInstallPathFlag: count(row => !row.installPathFlag),
      allThreeSignals: count(row => row.licenseRecorded && row.maintenanceState === 'within-180-days' && row.installPathFlag),
      licenseAndInstallPath: count(row => row.licenseRecorded && row.installPathFlag),
      installPathWithoutLicense: count(row => !row.licenseRecorded && row.installPathFlag),
      licenseWithoutInstallPath: count(row => row.licenseRecorded && !row.installPathFlag),
      neitherLicenseNorInstallPath: count(row => !row.licenseRecorded && !row.installPathFlag),
    }
  }
  const groups = [summarize(rows, 'Quality-ranked source sample'), summarize(strictRows, 'Source-classified agent-skill subset')]
  return {
    id: SNAPSHOT_ID,
    title: 'Agent Skill Readiness: A Frozen Metadata Snapshot',
    version: 1,
    reportUrl: REPORT_URL,
    capturedAt: provenance.capturedAt,
    referenceTime: source.generatedAt,
    sourceUrl: SOURCE_URL,
    sourceSha256: provenance.sourceSha256,
    sourceSampleDescription: source.methodology?.analyzedSample || 'Selection description unavailable in source.',
    unit: 'Registry record, not unique repository, user, installation, or independent experiment.',
    maintenanceRule: '0 <= referenceTime - sourceLastPushedAt <= 180 * 86400000 milliseconds; missing/invalid and future timestamps remain separate.',
    groups,
    classifications: [...new Set(rows.map(row => row.sourceClassification))].sort().map(classification => ({ classification, records: rows.filter(row => row.sourceClassification === classification).length })),
    licenseValues: [...new Set(rows.map(row => row.licenseValue))].sort().map(value => ({ value, records: rows.filter(row => row.licenseValue === value).length })),
    limitations: [
      'A quality-ranked, non-random registry sample; percentages do not estimate the wider Agent Skill ecosystem.',
      'Source classification is a metadata heuristic, not a manual confirmation that a repository contains a usable Skill.',
      'installReady is copied as installPathFlag: the registry can produce a primary install command. It does not measure README instructions, prerequisites, compatibility, installation success, or task success.',
      'The source lastPushedAt field may fall back from the GitHub push timestamp to the registry updated_at timestamp. Recent metadata cannot establish recent code maintenance.',
      'License values are copied from registry metadata; license texts, SPDX validity, permissions, and legal compatibility were not inspected.',
      'Multiple records may refer to one repository. Record-level observations are not independent repository-level observations.',
      'No third-party Skill was downloaded or executed. Trust scores and reported agent outcomes are not evaluated in this study.',
      'The upstream report can use a curated fallback when its live query fails; its JSON does not expose which read path ran. This study preserves the public response without claiming direct database provenance.',
    ],
    rows,
  }
}

export function csvCell(value) {
  let text = value == null ? '' : String(value)
  // Keep downloaded CSV safe to open in spreadsheet applications.
  if (/^[=+@-]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function renderCsv(rows) {
  const columns = ['sourcePosition', 'slug', 'name', 'repository', 'sourceClassification', 'licenseValue', 'licenseRecorded', 'sourceLastPushedAt', 'maintenanceState', 'installPathFlag', 'canonicalUrl']
  return [columns.join(','), ...rows.map(row => columns.map(key => csvCell(row[key])).join(','))].join('\n') + '\n'
}

const xml = text => String(text).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character]))

function renderChart(report) {
  const metrics = [['licenseRecorded', 'License value recorded'], ['within180Days', 'Timestamp within 180 days'], ['installPathFlag', 'Install-path flag present'], ['allThreeSignals', 'All three metadata signals']]
  const parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="780" viewBox="0 0 1200 780" role="img" aria-labelledby="title description">', '<title id="title">Readiness metadata in a quality-ranked registry snapshot</title>', '<desc id="description">A non-random sample. Install-path flags do not establish successful installation. Exact counts and denominators are written beside each bar.</desc>', '<rect width="1200" height="780" fill="#F8F7F3"/>', '<g font-family="Arial, sans-serif" fill="#171717">', '<text x="48" y="57" font-size="31">What readiness metadata is actually recorded?</text>', `<text x="48" y="91" font-size="17" fill="#626262">Frozen ${xml(report.capturedAt.slice(0, 10))} · Non-random, quality-ranked sample · Records, not unique repositories</text>`]
  report.groups.forEach((group, groupIndex) => {
    const base = 142 + groupIndex * 252
    parts.push(`<text x="48" y="${base}" font-size="21">${xml(group.label)} (n = ${group.records})</text>`)
    metrics.forEach(([key, label], index) => {
      const y = base + 30 + index * 42
      const share = percent(group[key], group.records)
      parts.push(`<text x="48" y="${y + 18}" font-size="16">${xml(label)}</text>`, `<rect x="335" y="${y}" width="570" height="25" rx="3" fill="#DDDBD4"/>`, `<rect x="335" y="${y}" width="${570 * share / 100}" height="25" rx="3" fill="#006B4F"/>`, `<text x="925" y="${y + 18}" font-size="16">${group[key]}/${group.records} (${share}%)</text>`)
    })
  })
  parts.push('<text x="48" y="665" font-size="17">Install-path flag ≠ tested installation. A recent timestamp may reflect a registry edit.</text>', '<text x="48" y="697" font-size="16" fill="#626262">Source: OpenAgentSkill public report JSON. No Skill execution or license-text verification.</text>', `<text x="48" y="735" font-size="16" fill="#006B4F">${xml(REPORT_URL)}</text>`, '</g></svg>')
  return parts.join('\n') + '\n'
}

export function renderMethods(report) {
  return `# ${report.title}\n\nVersion 1; captured ${report.capturedAt}; source generated ${report.referenceTime}.\n\nReport: ${REPORT_URL}\n\n## Sample\n\n${report.sourceSampleDescription}\n\nAll ${report.groups[0].records} entries from the public response's skills array are retained. The topSkills shortlist is not used. The second cohort contains the ${report.groups[1].records} rows whose upstream classification is exactly agent-skill. No stars, trust, or outcome threshold is applied by this analysis. Unit: ${report.unit}\n\n## Measurements\n\n- licenseRecorded: a trimmed, case-insensitive license value other than blank, unknown, none, n/a, or unlicensed. This is a metadata-presence measure, not a legal or license-text review. Other values are preserved, not inferred.\n- within180Days: ${report.maintenanceRule} This uses the source report generation time, not the time a reader reruns the script.\n- installPathFlag: exact copy of the source boolean installReady. In the registry implementation it indicates a non-empty primary install command. Raw installation instructions are not present in this dataset, so their quality is not measured.\n- allThreeSignals: the intersection of licenseRecorded, within-180-days, and installPathFlag on the same row.\n- Percentages: count divided by the named cohort's record count, rounded to one decimal. Unique repository counts use lowercase exact strings; no alias resolution is attempted.\n- Source lastPushedAt can fall back to registry updated_at; do not describe this measure as confirmed code maintenance.\n\n## Results\n\n${report.groups.map(group => `- ${group.label}: ${group.records} records, ${group.uniqueRepositories} distinct repository strings; ${group.licenseRecorded} recorded license values; ${group.within180Days} timestamps within 180 days; ${group.installPathFlag} install-path flags; ${group.allThreeSignals} with all three.`).join('\n')}\n\n## Reproduce\n\nDownload source.json, manifest.json, dataset.json, records.csv, readiness-chart.svg, methods.md, and reproduce.mjs into one directory. Run Node.js 20 or later:\n\n\`\`\`sh\nnode reproduce.mjs --check\n\`\`\`\n\nThis command is offline. It checks the SHA-256 of the exact frozen source bytes, regenerates every output in memory, and compares bytes. A mismatch fails without replacing files. From the repository use \`node scripts/build-skill-readiness-snapshot.mjs --check\`. Running without --check rewrites derived outputs from the frozen source; --capture only creates a new capture when source.json and manifest.json do not already exist.\n\nSource URL: ${SOURCE_URL}\n\nSource SHA-256: ${report.sourceSha256}\n\nCSV formula-like strings are prefixed with an apostrophe for spreadsheet safety; JSON preserves source strings. The frozen source retains the full public response, including upstream metrics that this analysis does not validate.\n\n## Limitations\n\n${report.limitations.map(value => `- ${value}`).join('\n')}\n\n## Suggested citation\n\nOpenAgentSkill (2026). Agent Skill Readiness: A Frozen Metadata Snapshot. Version 1, captured ${report.capturedAt.slice(0, 10)}. ${REPORT_URL}\n\nWhen quoting a percentage, include the cohort and its denominator. For this site's original code, chart, and analysis, see the repository's existing MIT license (https://github.com/Leon-Drq/openagentskill/blob/be2b8d6b106de8c1b7cb5ca925501a1ae727e08b/LICENSE). This report does not grant new rights to the upstream raw dataset or third-party software. Please cite the dated report when quoting its findings.\n`
}

export async function main(args = process.argv.slice(2)) {
  required(args.every(arg => ['--capture', '--check'].includes(arg)), 'Supported flags: --capture or --check.')
  required(!(args.includes('--capture') && args.includes('--check')), 'Capture and check cannot be combined.')
  const directory = defaultDirectory
  mkdirSync(directory, { recursive: true })
  const rawPath = path.join(directory, 'source.json')
  const manifestPath = path.join(directory, 'manifest.json')
  if (args.includes('--capture')) {
    required(!existsSync(rawPath) && !existsSync(manifestPath), 'Refusing to replace a frozen capture. Use a new versioned snapshot for new data.')
    const response = await fetch(SOURCE_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30_000) })
    required(response.ok, `Public source returned HTTP ${response.status}.`)
    const raw = Buffer.from(await response.arrayBuffer())
    const provenance = { version: 1, sourceUrl: SOURCE_URL, capturedAt: new Date().toISOString(), sourceSha256: sha256(raw), sourceBytes: raw.length, sourceGeneratedAt: JSON.parse(raw.toString('utf8')).generatedAt, outputs: {} }
    analyze(JSON.parse(raw.toString('utf8')), provenance)
    writeFileSync(rawPath, raw, { flag: 'wx' })
    writeFileSync(manifestPath, JSON.stringify(provenance, null, 2) + '\n', { flag: 'wx' })
  }
  required(existsSync(rawPath) && existsSync(manifestPath), 'Frozen source is missing. Use --capture for the initial public fetch.')
  const raw = readFileSync(rawPath)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  required(sha256(raw) === manifest.sourceSha256 && raw.length === manifest.sourceBytes, 'Frozen source integrity check failed.')
  const source = JSON.parse(raw.toString('utf8'))
  required(source.generatedAt === manifest.sourceGeneratedAt, 'Frozen source generation timestamp differs from manifest.')
  const report = analyze(source, manifest)
  const outputs = {
    'dataset.json': JSON.stringify(report, null, 2) + '\n',
    'records.csv': renderCsv(report.rows),
    'readiness-chart.svg': renderChart(report),
    'methods.md': renderMethods(report),
    'reproduce.mjs': readFileSync(ownPath, 'utf8'),
  }
  for (const [filename, content] of Object.entries(outputs)) {
    if (args.includes('--check')) {
      required(existsSync(path.join(directory, filename)), `Missing output: ${filename}`)
      required(readFileSync(path.join(directory, filename), 'utf8') === content, `Output differs from reproduction: ${filename}`)
      required(manifest.outputs[filename] === sha256(content), `Output hash differs: ${filename}`)
    } else {
      writeFileSync(path.join(directory, filename), content)
      manifest.outputs[filename] = sha256(content)
    }
  }
  if (!args.includes('--check')) writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(JSON.stringify({ mode: args.includes('--check') ? 'verified offline' : 'built from frozen source', sourceSha256: report.sourceSha256, groups: report.groups }, null, 2))
}

if (process.argv[1] && path.resolve(process.argv[1]) === ownPath) await main()
