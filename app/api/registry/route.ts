import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      name: 'OpenAgentSkill Registry API',
      description:
        'Agent-readable discovery, recommendation, manifest, and install handoff endpoints for reusable AI agent skills.',
      version: '1.0',
      agent_friendly: true,
      endpoints: {
        search: 'https://www.openagentskill.com/api/registry/search?task=scrape+pricing+pages&limit=5',
        recommend: 'https://www.openagentskill.com/api/registry/recommend?task=review+a+pull+request&limit=3',
        manifest: 'https://www.openagentskill.com/api/registry/manifest/{slug}',
        install: 'https://www.openagentskill.com/api/registry/install/{slug}',
      },
      aliases: {
        search: '/api/skills/search',
        recommend: '/api/agent/recommend',
        manifest: '/api/agent/skills/{slug}',
        install: '/api/skills/{slug}/install',
      },
      docs: 'https://www.openagentskill.com/api-docs',
      openapi: 'https://www.openagentskill.com/openapi.json',
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'X-Agent-Friendly': 'true',
      },
    }
  )
}
