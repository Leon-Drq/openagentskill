import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveAgentSkill } from '@/lib/agent-resolve'
import { searchSkills } from '@/lib/db/skills'
import { buildInstallHandoff } from '@/lib/registry'
import { getSkillBySlugOrFallbackStrict } from '@/lib/skill-fallbacks'
import { getLatestRankingSnapshot } from '@/lib/ranking-snapshots'

export const dynamic = 'force-dynamic'

const SERVER_INFO = { name: 'openagentskill', version: '1.0.0' }
const TOOLS = [
  { name: 'search_skills', description: 'Search installable Agent Skills by task or keyword.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer', minimum: 1, maximum: 20 } }, required: ['query'] } },
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
  if (name === 'search_skills') {
    const query = String(args.query || '').trim()
    if (!query) throw new Error('query is required')
    const limit = Math.min(Math.max(Number(args.limit || 8), 1), 20)
    const skills = await searchSkills(query, limit)
    return { query, skills: skills.slice(0, limit).map((skill) => ({ slug: skill.slug, name: skill.name, description: skill.description, category: skill.category, stars: skill.github_stars, install: skill.install_command || `npx skills add ${skill.github_repo}`, url: `https://www.openagentskill.com/skills/${skill.slug}` })) }
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
    return { slug: skill.slug, name: skill.name, description: skill.description, category: skill.category, tags: skill.tags, stars: skill.github_stars, repository: skill.repository, install: skill.install_command || `npx skills add ${skill.github_repo}`, url: `https://www.openagentskill.com/skills/${skill.slug}` }
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
