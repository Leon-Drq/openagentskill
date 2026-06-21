import { NextRequest, NextResponse } from 'next/server'
import { getAgentIntegrationKit } from '@/lib/agent-integration-kit'

export const revalidate = 3600

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  'X-Agent-Friendly': 'true',
}

function textResponse(payload: ReturnType<typeof getAgentIntegrationKit>) {
  return new NextResponse(
    `OpenAgentSkill Agent Integration Kit
Version: ${payload.version}

Purpose:
${payload.purpose}

Canonical:
- Page: ${payload.canonical_page}
- API: ${payload.api}
- Resolve API: ${payload.resolve_api}
- Manifest: ${payload.manifest}
- llms.txt: ${payload.llms}

Recommended Flow:
${payload.recommended_flow.map((item, index) => `${index + 1}. ${item}`).join('\n')}

Supported Agents:
${payload.supported_agents.map((agent) => `- ${agent.name}: ${agent.surface}
  Resolve: ${agent.resolve_url}
  Best for: ${agent.best_for.join(', ')}
  Setup:
${agent.setup_steps.map((step) => `    - ${step}`).join('\n')}
`).join('\n')}

Stable Response Fields:
${payload.stable_response_fields.map((field) => `- ${field}`).join('\n')}

Safety Rules:
${payload.safety_rules.map((rule) => `- ${rule}`).join('\n')}
`,
    {
      headers: {
        ...CACHE_HEADERS,
        'Content-Type': 'text/plain; charset=utf-8',
      },
    }
  )
}

export async function GET(request: NextRequest) {
  const payload = getAgentIntegrationKit()
  const format = request.nextUrl.searchParams.get('format') || 'json'

  if (format === 'text') return textResponse(payload)
  return NextResponse.json(payload, { headers: CACHE_HEADERS })
}
