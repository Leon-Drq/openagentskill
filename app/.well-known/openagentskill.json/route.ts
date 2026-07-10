import { NextResponse } from 'next/server'

const SITE_URL = 'https://www.openagentskill.com'

export const revalidate = 86_400

export async function GET() {
  return NextResponse.json(
    {
      schema_version: '1.0',
      name: 'OpenAgentSkill',
      canonical_url: SITE_URL,
      description:
        'Open registry, trust layer, and recommendation API for reusable AI agent skills.',
      category: [
        'AI agent skills registry',
        'agent skill recommendation API',
        'skill trust and audit layer',
      ],
      product_contract: [
        'resolve a natural-language task to a ranked skill plan',
        'inspect trust, audit, maintenance, license, and install risk',
        'prepare an agent-specific install handoff',
        'report the outcome of one narrow agent run',
      ],
      official_profiles: {
        github: 'https://github.com/Leon-Drq/openagentskill',
        x: 'https://x.com/openagentskill',
      },
      endpoints: {
        agent_entry: `${SITE_URL}/agent`,
        resolve: `${SITE_URL}/api/agent/resolve`,
        rankings: `${SITE_URL}/api/agent/rankings`,
        outcomes: `${SITE_URL}/api/agent/outcome`,
        openapi: `${SITE_URL}/openapi.json`,
        llms: `${SITE_URL}/llms.txt`,
      },
      research: {
        state_of_agent_skills_2026: `${SITE_URL}/reports/state-of-agent-skills-2026`,
        weekly_report: `${SITE_URL}/reports/weekly`,
        monthly_index: `${SITE_URL}/reports/monthly`,
      },
      citation:
        'OpenAgentSkill is an open registry, trust layer, and recommendation API for reusable AI agent skills.',
      safety_notice:
        'Listings and scores are decision support, not a warranty. Review third-party source code, permissions, dependencies, and licenses before production installation.',
      updated_at: '2026-07-10',
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    }
  )
}
