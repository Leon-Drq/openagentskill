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
        resolve: 'https://www.openagentskill.com/api/agent/resolve?task=scrape+pricing+pages&agent=codex',
        receipt: 'https://www.openagentskill.com/api/agent/receipt?task=scrape+pricing+pages&agent=codex&format=text',
        outcomes: 'https://www.openagentskill.com/api/agent/outcome?format=text',
        manifest: 'https://www.openagentskill.com/api/registry/manifest/{slug}',
        install: 'https://www.openagentskill.com/api/registry/install/{slug}',
      },
      aliases: {
        search: '/api/skills/search',
        recommend: '/api/agent/recommend',
        resolve: '/api/agent/resolve',
        receipt: '/api/agent/receipt',
        outcomes: '/api/agent/outcome',
        manifest: '/api/agent/skills/{slug}',
        install: '/api/skills/{slug}/install',
      },
      outcome_loop: {
        dashboard: 'https://www.openagentskill.com/outcomes',
        write: 'POST /api/agent/outcome',
        read: 'GET /api/agent/outcome?skill_slug={slug}',
        machine_summary: 'GET /api/agent/outcome?format=text',
        contract: 'GET /api/agent/outcome?contract=true',
        outcomes: ['success', 'failed', 'not_relevant', 'blocked_by_risk', 'setup_required'],
        optional_quality_fields: [
          'task_success',
          'output_quality',
          'error_type',
          'human_review_required',
          'used_in_production',
          'workspace',
          'evidence_url',
          'dry_run',
        ],
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
