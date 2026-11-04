import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import * as jsx from 'react/jsx-runtime'
import ts from 'typescript'
import { TASK_PLAYBOOKS } from '../lib/seo/task-playbooks.ts'
import { analyzeSearchOpportunities } from './analyze-search-opportunities.mjs'

const opportunities = analyzeSearchOpportunities('\uFEFFTop queries,Clicks,Impressions,CTR,Position\r\n"archify, skill",10,"1,200",0.83%,7.2\r\nclaude excel skill,4,200,2%,12\r\nopenagentskill ppt,100,2000,5%,6\r\nppt skill,10,157,6.4%,2\r\npdf skill,1,20,5%,10\r\n')
assert.equal(opportunities.queryRows, 5)
assert.deepEqual(opportunities.opportunities.map(row => row.query), ['archify, skill', 'claude excel skill'])
assert.equal(opportunities.opportunities[0].containsBrand, true)
assert.equal(opportunities.opportunities[1].containsBrand, false)
assert.equal(opportunities.opportunities[0].impressions, 1200)
assert.throws(() => analyzeSearchOpportunities('Page,Clicks,Impressions,Position\n/best/ppt,1,100,8'), /Queries CSV/)
assert.throws(() => analyzeSearchOpportunities('Top queries,Clicks,Impressions,Position\nppt,1,,8'), /Missing impressions/)
assert.throws(() => analyzeSearchOpportunities('Top queries,Clicks,Impressions,Position\n"ppt,1,100,8'), /Unclosed/)

const notes = JSON.parse(readFileSync('public/examples/topic-growth/production-notes.json', 'utf8'))
for (const [file, info] of Object.entries(notes.files)) {
  const bytes = readFileSync('public/examples/topic-growth/' + file)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), info.sha256, file)
}
const extracted = JSON.parse(readFileSync('public/examples/topic-growth/service-usage.json', 'utf8'))
assert.equal(extracted.records.length, 3)
assert.equal(extracted.records.reduce((n, row) => n + row.requests, 0), extracted.totals.requests)
assert.equal(extracted.records.reduce((n, row) => n + row.errors, 0), extracted.totals.errors)
assert.ok(extracted.records.every(row => row.source_page === 1 && row.service !== 'Total'))
const graph = JSON.parse(readFileSync('public/examples/topic-growth/architecture-input.json', 'utf8'))
const svg = readFileSync('public/examples/topic-growth/architecture.svg', 'utf8')
const mermaid = readFileSync('public/examples/topic-growth/architecture.mmd', 'utf8')
for (const edge of graph.edges) {
  assert.ok(svg.includes(`data-from="${edge.from}" data-to="${edge.to}"`))
  assert.ok(mermaid.includes(`${edge.from} -->|${edge.label}| ${edge.to}`))
}
assert.equal((svg.match(/<polygon /g) || []).length, graph.edges.length, 'Direction is visible without renderer-specific markers')
for (const playbook of Object.values(TASK_PLAYBOOKS)) for (const link of playbook.links.filter(link => link.href.startsWith('/examples/'))) readFileSync('public' + link.href)

// Exercise the actual click handler: failed copies cannot count as activation.
const source = ts.transpileModule(readFileSync('components/task-brief-copy.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
for (const outcome of [true, false, new Error('Clipboard blocked')]) {
  const events = [], states = []
  const dependencies = {
    'react/jsx-runtime': jsx,
    react: { useState: initial => [initial, state => states.push(state)] },
    '@/lib/copy-text': { copyText: async text => { assert.equal(text, 'Private user brief'); if (outcome instanceof Error) throw outcome; return outcome } },
    '@/lib/analytics': { trackAnalyticsEvent: (...args) => events.push(args) },
  }
  const exports = {}
  new Function('exports', 'require', source)(exports, name => { assert.ok(name in dependencies); return dependencies[name] })
  const element = exports.TaskBriefCopy({ text: 'Private user brief', topic: 'claude-excel-skills' })
  await element.props.children[0].props.onClick()
  assert.equal(states.at(-1), outcome === true ? 'copied' : 'failed')
  assert.deepEqual(events, outcome === true ? [['task_brief_copy', { topic_slug: 'claude-excel-skills' }]] : [])
  assert.ok(!JSON.stringify(events).includes('Private user brief'))
}
console.log('Topic growth: asset integrity, PDF reconciliation, directed diagram sources and copy success/failure accounting passed.')
