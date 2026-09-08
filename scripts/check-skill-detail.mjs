import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const origin = (process.argv[2] || 'http://localhost:3108').replace(/\/$/, '')
const baseline = process.argv[3] ? JSON.parse(readFileSync(process.argv[3], 'utf8')) : []
const slugs = ['singpenguin-ppt', 'design-taste-frontend', 'larashero3-dotcom-lieflat-charts', 'yanliudesign-mono-color-skill', 'browser-use-video-use', 'obra-using-superpowers']
for (const slug of slugs) {
  const response = await fetch(`${origin}/skills/${slug}`, {signal:AbortSignal.timeout(30000)})
  assert.equal(response.status,200,slug)
  const html = await response.text()
  assert.ok(html.includes('data-skill-profile="v2"'),slug)
  assert.ok(html.includes('data-skill-document-section'),slug)
  if (slug === 'obra-using-superpowers') {
    for (const marker of ['data-full-document', 'data-document-metadata', 'data-document-original', 'skill-document-scroll']) assert.ok(html.includes(marker), marker)
  }
  assert.equal([...html.matchAll(/<h1\b[^>]*>/g)].length,1,slug)
  const canonical = html.match(/<link rel="canonical" href="([^"]+)/)?.[1]
  const robots = html.match(/<meta name="robots" content="([^"]+)/)?.[1]
  assert.equal(canonical,`https://www.openagentskill.com/skills/${slug}`)
  const before = baseline.find(p=>p.slug===slug)
  if (before) {
    assert.equal(robots,before.robots,`${slug}: index policy`)
    assert.equal(html.match(/<title>(.*?)<\/title>/s)?.[1],before.title,`${slug}: title`)
  }
  // Inspect script content only; never sanitize or render fetched HTML.
  const scripts = [...html.matchAll(/<script\b([^>]*)>(.*?)<\/script\b[^>]*>/gsi)]
  const machine = JSON.parse(scripts.find(m=>m[1].includes('id="agent-skill-metadata"'))?.[2] || 'null')
  assert.ok(machine?.install?.source_evidence,slug)
  const schemas = scripts.filter(m=>m[1].includes('application/ld+json')).map(m=>JSON.parse(m[2]))
  const graph = schemas.find(s=>s['@graph'])?.['@graph']
  assert.ok(graph?.some(s=>s['@type']==='BreadcrumbList'),slug)
  const entity = graph.find(s=>s['@id']?.endsWith('#skill'))
  for (const key of ['offers','aggregateRating','operatingSystem']) assert.equal(entity[key],undefined,`${slug}: unproven ${key}`)
  const api = await fetch(`${origin}/api/skills/${slug}/install`,{signal:AbortSignal.timeout(30000)})
  assert.equal(api.status,200,`${slug}: install API`)
  const handoff = await api.json()
  assert.equal(handoff.source_evidence.status,machine.install.source_evidence.status,`${slug}: source status consistency`)
  if (!handoff.source_evidence.canOfferInstall) {
    assert.equal(handoff.recommended_command,'')
    assert.equal(handoff.safety_gate.auto_install_allowed,false)
    assert.equal(machine.install.ready,false)
    assert.equal(machine.trust.auto_install.allowed,false)
    assert.ok(handoff.install_targets.every(t=>t.kind==='agent-prompt'))
  }
  if (slug==='singpenguin-ppt') assert.equal(handoff.source_evidence.status,'unverified')
  console.log({slug,robots,source:handoff.source_evidence.status,bytes:Buffer.byteLength(html),beforeBytes:before?.bytes})
}
for (const locale of ['en','zh','ja','ko','es','de','fr','id']) {
  const response = await fetch(`${origin}/skills/singpenguin-ppt?lang=${locale}`,{signal:AbortSignal.timeout(30000)})
  assert.equal(response.status,200,locale)
  const html=await response.text()
  assert.ok(html.includes('data-skill-profile="v2"'),locale)
  const canonical = html.match(/<link rel="canonical" href="([^"]+)/i)?.[1]
  assert.equal(new URL(canonical).href, 'https://www.openagentskill.com/skills/singpenguin-ppt', locale)
}
console.log('Detail HTTP smoke passed: six profiles, canonical/title/index baseline, source document controls, eight languages, schema and API consistency.')
