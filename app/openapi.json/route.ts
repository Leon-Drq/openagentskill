import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      openapi: '3.1.0',
      info: {
        title: 'OpenAgentSkill Agent API',
        version: '1.0.0',
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
              { name: 'min_stars', in: 'query', required: false, schema: { type: 'number' } },
              { name: 'limit', in: 'query', required: false, schema: { type: 'number' } },
              { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'text'] } },
            ],
            responses: { '200': { description: 'Ranked registry search results' } },
          },
        },
        '/api/registry/recommend': {
          get: {
            summary: 'Recommend skills for one task using registry ranking and trust signals',
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
            summary: 'Resolve a task into a selected skill and install plan',
            parameters: [
              { name: 'task', in: 'query', required: true, schema: { type: 'string' } },
              { name: 'agent', in: 'query', required: false, schema: { type: 'string', enum: ['auto', 'codex', 'claude-code', 'cursor', 'openagentskill-cli'] } },
              { name: 'max_risk', in: 'query', required: false, schema: { type: 'string' } },
              { name: 'min_stars', in: 'query', required: false, schema: { type: 'number' } },
              { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'text'] } },
            ],
            responses: { '200': { description: 'Resolved skill plan' } },
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
            responses: { '200': { description: 'Resolved skill plan' } },
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
        '/api/agent/skills/{slug}': {
          get: {
            summary: 'Get one agent-readable skill profile',
            parameters: [
              { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['json', 'text'] } },
            ],
            responses: { '200': { description: 'Skill profile' } },
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
            responses: { '200': { description: 'Discovery pipeline status, filters, schedule, and cross-domain query coverage' } },
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
