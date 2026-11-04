import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function parseCsv(text) {
  const rows = []; let row = [], value = '', quoted = false
  text = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++ } else quoted = !quoted
    } else if (c === ',' && !quoted) { row.push(value); value = '' }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(value); if (row.some(v => v.trim())) rows.push(row); row = []; value = ''
    } else value += c
  }
  if (quoted) throw new Error('Unclosed quoted CSV field')
  row.push(value); if (row.some(v => v.trim())) rows.push(row)
  return rows
}

const topics = [
  { topic: 'presentation', pattern: /ppt|powerpoint|presentation|slides|演示|幻灯/, page: '/best/presentation-generation', brand: /ppt master|dashi|guizang/ },
  { topic: 'architecture', pattern: /archify|architecture.*diagram|mermaid|draw\.?io|架构图|流程图/, page: '/best/architecture-diagram-skills', brand: /archify/ },
  { topic: 'frontend', pattern: /frontend|front.end|ui.?ux|figma|taste skill|前端|界面设计/, page: '/best/frontend-design-skills', brand: /figma|taste skill|ui.?ux pro max/ },
  { topic: 'spreadsheet', pattern: /excel|xlsx|spreadsheet|表格/, page: '/best/claude-excel-skills', brand: /anthropic/ },
  { topic: 'pdf', pattern: /pdf|ocr/, page: '/best/claude-code-pdf-parsing', brand: /anthropic/ },
  { topic: 'video', pattern: /remotion|vox director|video.*skill|skill.*video|视频/, page: '/best/video-creation', brand: /remotion|vox director/ },
]

export function analyzeSearchOpportunities(csv) {
  const [header, ...rows] = parseCsv(csv)
  if (!header) throw new Error('Empty CSV')
  const find = aliases => header.findIndex(h => aliases.includes(h.trim().toLowerCase()))
  const columns = { query: find(['top queries', 'query', 'queries', '热门查询', '查询次数最多的查询', '查询']), clicks: find(['clicks', '点击次数', '点击量']), impressions: find(['impressions', '展示次数', '展示量']), position: find(['position', 'average position', '排名', '平均排名']) }
  if (Object.values(columns).some(index => index < 0)) throw new Error('Use a Search Console Queries CSV with query, clicks, impressions and position. A Pages export cannot establish keyword demand.')
  const all = rows.map(row => {
    const number = field => { const value = row[columns[field]]?.trim(); if (!value) throw new Error(`Missing ${field}`); const n = Number(value.replace(/,/g, '')); if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid ${field}`); return n }
    const query = row[columns.query]?.trim(); if (!query) throw new Error('Missing query')
    const impressions = number('impressions'), clicks = number('clicks'), position = number('position')
    const match = topics.find(t => t.pattern.test(query.toLowerCase()))
    return { query, clicks, impressions, ctr: impressions ? clicks / impressions : 0, position, topic: match?.topic || 'other', containsBrand: /open.?agent.?skill/i.test(query) || !!match?.brand.test(query.toLowerCase()), suggestedPage: match?.page || null }
  })
  return {
    generatedAt: new Date().toISOString(),
    scope: 'Observed website search impressions, not market search volume. Suggested pages are editorial mappings, not measured query-to-page attribution. Preserve export dates, country, device and filters separately; manually review search intent.',
    queryRows: all.length,
    opportunities: all.filter(r => r.topic !== 'other' && !/open.?agent.?skill/i.test(r.query) && r.impressions >= 100 && r.position >= 4 && r.position <= 20).sort((a, b) => b.impressions - a.impressions),
    observedTopics: topics.map(t => ({ topic: t.topic, clicks: all.filter(r => r.topic === t.topic).reduce((sum, r) => sum + r.clicks, 0), impressions: all.filter(r => r.topic === t.topic).reduce((sum, r) => sum + r.impressions, 0) })),
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output] = process.argv.slice(2)
  if (!input || !output) throw new Error('Usage: node scripts/analyze-search-opportunities.mjs <Queries.csv> <report.json>')
  writeFileSync(output, JSON.stringify(analyzeSearchOpportunities(readFileSync(input, 'utf8')), null, 2) + '\n', { flag: 'wx' })
  console.log('Saved opportunity report. Review time range, filters and intent before changing pages.')
}
