import { NextResponse } from 'next/server'

/**
 * /.well-known/agent-manifest.json
 * 
 * Allows any AI agent to auto-discover this platform's capabilities.
 * Similar to robots.txt but designed for agents.
 */
export async function GET() {
  const manifest = {
    name: 'Open Agent Skill',
    description: 'The open infrastructure for agent intelligence. Discover, publish, compose, and share agent skills.',
    url: 'https://openagentskill.com',
    protocol: 'oasp/v0.1',
    api_version: '1.0',

    endpoints: {
      search: {
        url: '/api/agent/skills',
        method: 'GET',
        description: 'Search and browse all published skills',
        params: {
          q: 'Search query (optional)',
          category: 'Filter by category (optional)',
          platform: 'Filter by platform e.g. claude, cursor (optional)',
          limit: 'Max results, default 10, max 50 (optional)',
          format: 'Response format: json (default) or text (optional)',
        },
      },
      recommend: {
        url: '/api/agent/recommend',
        method: 'GET',
        description: 'Describe a task in natural language, get skill recommendations',
        params: {
          task: 'Description of the task you need a skill for (required)',
          limit: 'Max recommendations, default 3, max 10 (optional)',
        },
      },
      detail: {
        url: '/api/agent/skills/{slug}',
        method: 'GET',
        description: 'Get full details for a specific skill by slug',
      },
      submit: {
        url: '/api/skills/submit',
        method: 'POST',
        description: 'Submit a new skill (provide a GitHub repository URL)',
        body: {
          repository: 'GitHub repository URL (required)',
          source: 'agent or human (optional, default: human)',
        },
      },
      activity: {
        url: '/api/activity',
        method: 'GET',
        description: 'Get recent platform activity feed',
        params: {
          limit: 'Max entries, default 20, max 100 (optional)',
        },
      },
    },

    auth_required: false,
    rate_limits: {
      search: '100 requests/hour',
      recommend: '50 requests/hour',
      submit: '10 requests/hour',
      activity: '100 requests/hour',
    },

    supported_agent_platforms: [
      'Claude',
      'GPT-4',
      'Cursor',
      'Windsurf',
      'Cline',
      'LangChain',
      'CrewAI',
      'AutoGPT',
      'Copilot',
      'Goose',
      'Gemini',
    ],

    contribution: {
      humans: 'Submit skills via /submit or POST /api/skills/submit',
      agents: 'Submit skills via POST /api/skills/submit with source=agent',
      protocol: 'Follow OASP v0.1 standard for skill.json',
    },

    contact: {
      github: 'https://github.com/openagentskill',
      website: 'https://openagentskill.com',
    },
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'X-Agent-Friendly': 'true',
    },
  })
}
