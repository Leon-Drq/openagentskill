#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'

const ENV_FILES = ['.env.production.local', '.env.local', '.env']

function loadEnvFile(file) {
  if (!existsSync(file)) return
  const text = readFileSync(file, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const index = line.indexOf('=')
    if (index === -1) continue

    const key = line.slice(0, index).trim()
    let value = line.slice(index + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (value && !process.env[key]) process.env[key] = value
  }
}

for (const file of ENV_FILES) loadEnvFile(file)

const siteUrl = process.env.BACKFILL_SITE_URL || 'https://www.openagentskill.com'
const token = process.env.INDEXER_TRIGGER_SECRET || process.env.CRON_SECRET || process.env.INDEXER_SECRET
const runs = Math.max(1, Number(process.env.BACKFILL_RUNS || 20))
const targetNew = Math.max(1, Number(process.env.BACKFILL_TARGET_NEW || 500))
const targetTotal = Math.max(20_000, Number(process.env.BACKFILL_TARGET_TOTAL || 20_000))
const minStars = Math.max(100, Number(process.env.BACKFILL_MIN_STARS || 500))
const maxSearchRequests = Math.max(1, Number(process.env.BACKFILL_MAX_SEARCH_REQUESTS || 30))
const maxStaleDays = Math.max(30, Number(process.env.BACKFILL_MAX_STALE_DAYS || 1460))
const startSeed = Math.max(0, Number(process.env.BACKFILL_PAGE_SEED || 0))
const runDelayMs = Math.max(0, Number(process.env.BACKFILL_RUN_DELAY_MS || (runs > 1 ? 65_000 : 0)))
const domains = (process.env.BACKFILL_DOMAINS || '')
  .split(',')
  .map((domain) => domain.trim())
  .filter(Boolean)

if (!token) {
  console.error('Missing INDEXER_TRIGGER_SECRET, CRON_SECRET, or INDEXER_SECRET. Run `vercel env pull .env.production.local` or provide one in the shell.')
  process.exit(1)
}

async function runOnce(pageSeed) {
  const response = await fetch(`${siteUrl.replace(/\/$/, '')}/api/indexer/run`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'bulk',
      targetNew,
      targetTotal,
      minStars,
      maxSearchRequests,
      maxStaleDays,
      strictQuality: true,
      includeCollections: false,
      pageSeed,
      ...(domains.length ? { domains } : {}),
    }),
  })

  const text = await response.text()
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    payload = { raw: text }
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`)
  }

  return payload
}

console.log(
  JSON.stringify(
    {
      siteUrl,
      runs,
      targetNew,
      targetTotal,
      minStars,
      maxSearchRequests,
      maxStaleDays,
      runDelayMs,
      domains,
    },
    null,
    2
  )
)

let totalImported = 0
let lastSummary = null

for (let i = 0; i < runs; i += 1) {
  const pageSeed = startSeed + i
  console.log(`[backfill] run ${i + 1}/${runs}, pageSeed=${pageSeed}`)
  const payload = await runOnce(pageSeed)
  const summary = payload.summary || {}
  lastSummary = summary
  totalImported += Number(summary.imported || 0)
  console.log(
    JSON.stringify(
      {
        imported: summary.imported || 0,
        updated: summary.updated || 0,
        existingApproved: summary.existingApproved,
        remainingToTarget: summary.remainingToTarget,
        searchRequests: summary.searchRequests,
        candidatesFound: summary.candidatesFound,
        skippedExisting: summary.skippedExisting,
        skippedMcp: summary.skippedMcp,
        skippedLowRelevance: summary.skippedLowRelevance,
        skippedStale: summary.skippedStale,
        skippedCollections: summary.skippedCollections,
        skippedWeakMetadata: summary.skippedWeakMetadata,
        errors: summary.errors || 0,
      },
      null,
      2
    )
  )

  if (summary.remainingToTarget === 0 || summary.targetNew === 0) break
  if (runDelayMs > 0 && i + 1 < runs) {
    console.log(`[backfill] waiting ${runDelayMs}ms before the next run to respect GitHub Search API limits`)
    await new Promise((resolve) => setTimeout(resolve, runDelayMs))
  }
}

console.log(
  JSON.stringify(
    {
      totalImported,
      lastSummary,
    },
    null,
    2
  )
)
