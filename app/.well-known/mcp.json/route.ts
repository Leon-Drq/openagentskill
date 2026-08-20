import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({
    name: 'OpenAgentSkill',
    description: 'Task-to-skill resolution, safe install handoffs, rankings, and verified outcome feedback.',
    transport: { type: 'streamable-http', url: 'https://www.openagentskill.com/api/mcp' },
    capabilities: ['search_skills', 'resolve_task', 'get_skill', 'get_install_plan', 'get_rankings', 'report_outcome'],
    documentation: 'https://www.openagentskill.com/agent/integration-kit',
  }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } })
}
