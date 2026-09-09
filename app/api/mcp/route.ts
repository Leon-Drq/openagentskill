import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveAgentSkill } from '@/lib/agent-resolve'
import { searchSkills } from '@/lib/db/skills'
import { buildInstallHandoff } from '@/lib/registry'
import { getSkillBySlugOrFallbackStrict } from '@/lib/skill-fallbacks'
import { getLatestRankingSnapshot } from '@/lib/ranking-snapshots'
import { searchShowcaseWorkflows, getShowcaseTaskPackage } from '@/lib/showcase-discovery'
import { SHOWCASE_AGENT_TARGETS } from '@/lib/showcase-task'
import { locales } from '@/lib/i18n/config'
import { getSkillSourceEvidence } from '@/lib/skills/source-evidence'
import { getReviewEvidence } from '@/lib/skills/review-evidence'

export const dynamic = 'force-dynamic'

const SERVER_INFO = { name: 'openagentskill', version: '1.1.0' }
const TOOLS = [
  { name: 'find_workflows', description: 'Find curated visual examples and reusable starting tasks for websites, slides, images, videos or documents. Returns source-linked references, not execution or safety approval.', annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }, inputSchema: { type: 'object', properties: { query: { type: 'string', maxLength: 200 }, category: { type: 'string', enum: ['all', 'web', 'slides', 'image', 'video', 'document'] }, limit: { type: 'integer', minimum: 1, maximum: 20 }, offset: { type: 'integer', minimum: 0, maximum: 1000 }, lang: { type: 'string', enum: [...locales] } } } },
  { name: 'get_workflow', description: 'Read a Gallery task package: inputs, expected output, prerequisites, source evidence, licenses and pre-execution checklist. Does not install or run anything; consult the current skill review before use.', annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }, inputSchema: { type: 'object', properties: { slug: { type: 'string', maxLength: 150 }, agent: { type: 'string', enum: [...SHOWCASE_AGENT_TARGETS] }, lang: { type: 'string', enum: [...locales] } }, required: ['slug'] } },
  { name: 'search_skills', description: 'Search published Agent Skills by task or keyword. Inspect source and review evidence before proposing installation.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 20 } }, required: ['query'] } },
  { name: 'resolve_task', description: 'Resolve one concrete task into a best match, safer/popular/new lanes, install receipt, and outcome contract.', inputSchema: { type: 'object', properties: { task: { type: 'string' }, agent: { type: 'string' }, max_risk: { type: 'string' }, limit: { type: 'integer', minimum: 2, maximum: 10 } }, required: ['task'] } },
  { name: 'get_skill', description: 'Get canonical metadata for one skill slug.', inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] } },
  { name: 'get_install_plan', description: 'Get the safe install handoff and receipt contract for one skill.', inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] } },
  { name: 'get_rankings', description: 'Read the latest evidence-based daily ranking snapshot.', inputSchema: { type: 'object', properties: { slug: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 30 } } } },
  { name: 'report_outcome', description: 'Report a real agent result using the event id returned by resolve_task.', inputSchema: { type: 'object', properties: { event_id: { type: 'string' }, skill_slug: { type: 'string' }, task: { type: 'string' }, agent: { type: 'string' }, outcome: { type: 'string', enum: ['success', 'failed', 'not_relevant', 'blocked_by_risk', 'setup_required'] }, install_used: { type: 'boolean' }, dry_run: { type: 'boolean' } }, required: ['event_id', 'skill_slug', 'task'] } },
]

const CallSchema = z.object({ name: z.string(), arguments: z.record(z.string(), z.unknown()).optional().default({}) })

function result(id: unknown, payload: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result: payload }, { headers: { 'Cache-Control': 'no-store' } })
}

function error(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } }, { status: code === -32600 ? 400 : 200 })
}

function toolResult(payload: unknown) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], structuredContent: payload }
}

async function callTool(request: NextRequest, name: string, args: Record<string, unknown>) {
  if (name === 'find_workflows') {
    const input = z.object({ query: z.string().trim().max(200).default(''), category: z.enum(['all', 'web', 'slides', 'image', 'video', 'document']).default('all'), limit: z.number().int().min(1).max(20).default(8), offset: z.number().int().min(0).max(1000).default(0), lang: z.enum(locales).default('en') }).safeParse(args)
    if (!input.success) throw new Error('Invalid workflow filters')
    const { lang, ...options } = input.data
    return searchShowcaseWorkflows({ ...options, locale: lang })
  }
  if (name === 'get_workflow') {
    const input = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,150}$/), agent: z.enum(SHOWCASE_AGENT_TARGETS).default('auto'), lang: z.enum(locales).default('en') }).safeParse(args)
    if (!input.success) throw new Error('Invalid workflow options')
    const task = getShowcaseTaskPackage(input.data.slug, input.data.lang, input.data.agent)
    if (!task) throw new Error('Workflow not found')
    return task
  }
  if (name === 'search_skills') {
    const query = String(args.query || '').trim()
    if (!query) throw new Error('query is required')
    const limit = Math.min(Math.max(Number(args.limit || 8), 1), 20)
    const skills = await searchSkills(query, limit)
    return { query, skills: skills.slice(0, limit).map((skill) => ({ slug: skill.slug, name: skill.name, description: skill.description, category: skill.category, stars: skill.github_stars, install: getSkillSourceEvidence(skill).canOfferInstall ? skill.install_command : null, source_evidence: getSkillSourceEvidence(skill), review_evidence: getReviewEvidence(skill), url: `https://www.openagentskill.com/skills/${skill.slug}` })) }
  }
  if (name === 'resolve_task') {
    const task = String(args.task || '').trim()
    if (!task) throw new Error('task is required')
    return resolveAgentSkill({ task, agent: String(args.agent || 'auto'), limit: Math.min(Math.max(Number(args.limit || 6), 2), 10), constraints: { max_risk: String(args.max_risk || 'medium'), needs_install_command: true } })
  }
  if (name === 'get_skill' || name === 'get_install_plan') {
    const slug = String(args.slug || '').trim()
    if (!slug) throw new Error('slug is required')
    const skill = await getSkillBySlugOrFallbackStrict(slug)
    if (!skill) throw new Error(`Skill not found: ${slug}`)
    if (name === 'get_install_plan') return buildInstallHandoff(skill)
    return { slug: skill.slug, name: skill.name, description: skill.description, version: skill.version, category: skill.category, tags: skill.tags, stars: skill.github_stars, repository: skill.repository, install: getSkillSourceEvidence(skill).canOfferInstall ? skill.install_command : null, source_evidence: getSkillSourceEvidence(skill), review_evidence: getReviewEvidence(skill), url: `https://www.openagentskill.com/skills/${skill.slug}` }
  }
  if (name === 'get_rankings') {
    const slug = String(args.slug || 'highest-quality-agent-skills')
    const snapshot = await getLatestRankingSnapshot(slug)
    return snapshot ? { ...snapshot, items: snapshot.items.slice(0, Math.min(Math.max(Number(args.limit || 10), 1), 30)) } : { ranking_slug: slug, status: 'snapshot_pending', fallback_api: `/api/agent/rankings?slug=${encodeURIComponent(slug)}` }
  }
  if (name === 'report_outcome') {
    const response = await fetch(new URL('/api/agent/outcome', request.nextUrl.origin), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...args, agent: args.agent || 'mcp', outcome: args.outcome || 'success', install_used: args.install_used === true, dry_run: args.dry_run === true }) })
    const payload = await response.json()
    if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'Outcome was not accepted')
    return payload
  }
  throw new Error(`Unknown tool: ${name}`)
}

export async function GET() {
  return NextResponse.json({ name: SERVER_INFO.name, version: SERVER_INFO.version, protocol: 'Model Context Protocol', transport: 'streamable-http-json', endpoint: 'https://www.openagentskill.com/api/mcp', tools: TOOLS.map((tool) => tool.name) })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { jsonrpc?: string; id?: unknown; method?: string; params?: unknown } | null
  if (!body || body.jsonrpc !== '2.0' || !body.method) return error(body?.id ?? null, -32600, 'Invalid JSON-RPC request')
  if (body.method === 'notifications/initialized') return new NextResponse(null, { status: 202 })
  if (body.method === 'initialize') return result(body.id, { protocolVersion: '2025-06-18', capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: 'Use resolve_task before get_install_plan, then report_outcome after one narrow run.' })
  if (body.method === 'ping') return result(body.id, {})
  if (body.method === 'tools/list') return result(body.id, { tools: TOOLS })
  if (body.method === 'tools/call') {
    const parsed = CallSchema.safeParse(body.params)
    if (!parsed.success) return error(body.id, -32602, 'Invalid tool call parameters')
    try { return result(body.id, toolResult(await callTool(request, parsed.data.name, parsed.data.arguments))) }
    catch (cause) { return result(body.id, { content: [{ type: 'text', text: cause instanceof Error ? cause.message : 'Tool call failed' }], isError: true }) }
  }
  return error(body.id, -32601, `Method not found: ${body.method}`)
}
