import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      openapi: '3.1.0',
      info: {
        title: 'OpenAgentSkill Agent API',
        version: '2.0.0',
        description: 'Resolve, inspect, and install AI agent skills from OpenAgentSkill.',
      },
      servers: [{ url: 'https://www.openagentskill.com' }],
      paths: {
        '/api/registry': {
          get: {
            summary: 'Get Registry API index and canonical endpoints',
            responses: { '200': { description: 'Registry API index' } },
          },
        },
        '/api/registry/search': {
          get: {
            summary: 'Search the skill registry by task, platform, category, or query',
            parameters: [
              { name: 'task', in: 'query', required: false, schema: { type: 'string' } },
              { name: 'q', in: 'query', required: false, schema: { type: 'string' } },
              { name: 'category', in: 'query', required: false, schema: { type: 'string' } },
              { name: 'platform', in: 'query', required: false, schema: { type: 'string' } },
              { name: 'safety', in: 'query', required: false, schema: { type: 'string', enum: ['verified', 'reviewed', 'experimental', 'blocked', 'all'] } },
              { name: 'include_blocked', in: 'query', required: false, schema: { type: 'boolean' } },
              { name: 'min_stars', in: 'query', required: false, schema: { type: 'number' } },
              { name: 'limit', in: 'query', required: false, schema: { type: 'number' } },
              { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'text'] } },
            ],
            responses: { '200': { description: 'Ranked registry search results' } },
          },
        },
        '/api/registry/recommend': {
          get: {
            summary: 'Recommend skills for one task using registry ranking, trust signals, and safety gates',
            parameters: [
              { name: 'task', in: 'query', required: true, schema: { type: 'string' } },
              { name: 'limit', in: 'query', required: false, schema: { type: 'number' } },
              { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'text'] } },
            ],
            responses: { '200': { description: 'Task-to-skill recommendations' } },
          },
        },
        '/api/registry/manifest/{slug}': {
          get: {
            summary: 'Get one agent-readable registry manifest',
            parameters: [
              { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'text'] } },
            ],
            responses: { '200': { description: 'Registry skill manifest' } },
          },
        },
        '/api/registry/install/{slug}': {
          get: {
            summary: 'Get install handoff for one registry skill',
            parameters: [
              { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'text'] } },
            ],
            responses: { '200': { description: 'Registry install handoff' } },
          },
        },
        '/api/agent/resolve': {
          get: {
            summary: 'Resolve a task into recommendation.best_skill, alternatives, Trust Score v4, safety gate, install plan, feedback contract, and agent_handoff',
            parameters: [
              { name: 'task', in: 'query', required: true, schema: { type: 'string' } },
              { name: 'agent', in: 'query', required: false, schema: { type: 'string', enum: ['auto', 'codex', 'claude-code', 'cursor', 'openagentskill-cli'] } },
              { name: 'max_risk', in: 'query', required: false, schema: { type: 'string' } },
              { name: 'min_stars', in: 'query', required: false, schema: { type: 'number' } },
              { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'text'] } },
            ],
            responses: {
              '200': {
                description:
                  'Resolved skill plan. Read recommendation.agent_contract, feedback, and agent_handoff for the stable machine contract, plus recommendation.best_skill, recommendation.install, recommendation.why_recommended, recommendation.trust_score_v4, recommendation.risk, recommendation.machine_metadata, and recommendation.alternatives. recommendation.trust_score_v3 remains as a backwards-compatible alias.',
              },
            },
          },
          post: {
            summary: 'Resolve a task with JSON constraints',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['task'],
                    properties: {
                      task: { type: 'string' },
                      agent: { type: 'string' },
                      limit: { type: 'number' },
                      constraints: { type: 'object' },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description:
                  'Resolved skill plan with the same recommendation.agent_contract, agent_handoff, and recommendation.* fields returned by GET.',
              },
            },
          },
        },
        '/api/agent/outcome': {
          get: {
            summary: 'Read aggregate agent outcome statistics for skill adoption and success signals',
            parameters: [
              { name: 'skill_slug', in: 'query', required: false, schema: { type: 'string' } },
              {
                name: 'format',
                in: 'query',
                required: false,
                schema: { type: 'string', enum: ['json', 'text'] },
                description: 'Use format=text for a compact machine-readable plain text summary.',
              },
            ],
            responses: { '200': { description: 'Agent outcome aggregate stats' } },
          },
          post: {
            summary: 'Report the result of an agent trying a resolved skill',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['event_id', 'skill_slug', 'task'],
                    properties: {
                      event_id: { type: 'string' },
                      skill_slug: { type: 'string' },
                      task: { type: 'string' },
                      agent: { type: 'string' },
                      outcome: {
                        type: 'string',
                        enum: ['success', 'failed', 'not_relevant', 'blocked_by_risk', 'setup_required'],
                      },
                      install_used: { type: 'boolean' },
                      risk_blocked: { type: 'boolean' },
                      setup_required: { type: 'boolean' },
                      time_to_useful_ms: { type: 'number' },
                      notes: { type: 'string' },
                      metadata: { type: 'object' },
                    },
                  },
                },
              },
            },
            responses: { '200': { description: 'Outcome recorded through a controlled RPC' } },
          },
        },
        '/api/agent/integration-kit': {
          get: {
            summary: 'Get copy-paste integration templates for Codex, Claude Code, Cursor, and agent runtimes',
            parameters: [
              { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'text'] } },
            ],
            responses: {
              '200': {
                description:
                  'Agent Integration Kit with supported_agents, recommended_flow, stable_response_fields, and safety_rules. Use before calling /api/agent/resolve from an agent runtime.',
              },
            },
          },
        },
        '/api/agent/tasks': {
          get: {
            summary: 'List agent task definitions',
            parameters: [{ name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'text'] } }],
            responses: { '200': { description: 'Task catalog' } },
          },
        },
        '/api/agent/tasks/{slug}': {
          get: {
            summary: 'Get one task with ranked skills',
            parameters: [
              { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'limit', in: 'query', required: false, schema: { type: 'number' } },
              { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'text'] } },
            ],
            responses: { '200': { description: 'Task detail and ranked skills' } },
          },
        },
        '/api/agent/skills': {
          get: {
            summary: 'Search agent-readable skill profiles with trust, audit, supply, and safety fields',
            parameters: [
              { name: 'q', in: 'query', required: false, schema: { type: 'string' } },
              { name: 'category', in: 'query', required: false, schema: { type: 'string' } },
              { name: 'platform', in: 'query', required: false, schema: { type: 'string' } },
              { name: 'trust', in: 'query', required: false, schema: { type: 'string' } },
              { name: 'safety', in: 'query', required: false, schema: { type: 'string', enum: ['verified', 'reviewed', 'experimental', 'blocked', 'all'] } },
              { name: 'track', in: 'query', required: false, schema: { type: 'string' } },
              { name: 'max_risk', in: 'query', required: false, schema: { type: 'string', enum: ['low', 'medium', 'high'] } },
              { name: 'limit', in: 'query', required: false, schema: { type: 'number' } },
              { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'text'] } },
            ],
            responses: { '200': { description: 'Skill search results with safety_gate and safety profile fields' } },
          },
        },
        '/api/agent/skills/{slug}': {
          get: {
            summary: 'Get one agent-readable skill profile',
            parameters: [
              { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'max_risk', in: 'query', required: false, schema: { type: 'string', enum: ['low', 'medium', 'high'] } },
              { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'text'] } },
            ],
            responses: { '200': { description: 'Skill profile with agent_readable_metadata and machine_metadata fields' } },
          },
        },
        '/api/agent/evals': {
          get: {
            summary: 'Run registry evals or fetch a pre-install Trust + Eval contract for one skill',
            parameters: [
              { name: 'slug', in: 'query', required: false, schema: { type: 'string' } },
              { name: 'skill_slug', in: 'query', required: false, schema: { type: 'string' } },
              { name: 'slugs', in: 'query', required: false, schema: { type: 'string' }, description: 'Comma-separated candidate skill slugs for batch pre-install comparison.' },
              { name: 'skill_slugs', in: 'query', required: false, schema: { type: 'string' }, description: 'Alias for slugs.' },
              { name: 'candidates', in: 'query', required: false, schema: { type: 'string' }, description: 'Alias for slugs.' },
              { name: 'task', in: 'query', required: false, schema: { type: 'string' } },
              { name: 'max_risk', in: 'query', required: false, schema: { type: 'string', enum: ['low', 'medium', 'high'] } },
              { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'text'] } },
            ],
            responses: {
              '200': {
                description:
                  'Without slug/slugs: registry recommendation regression checks. With slug: one skill eval. With slugs: ranked batch Trust + Eval comparison for candidate skills.',
              },
            },
          },
        },
        '/api/skills/{slug}/install': {
          get: {
            summary: 'Get install command, agent prompt, and safety checklist',
            parameters: [
              { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'text'] } },
            ],
            responses: { '200': { description: 'Install handoff' } },
          },
        },
        '/api/agent/discovery': {
          get: {
            summary: 'Public-safe GitHub auto-discovery status',
            responses: { '200': { description: 'Discovery pipeline status, health, filters, schedule, and cross-domain query coverage' } },
          },
        },
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600',
      },
    }
  )
}
