import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'API Reference - Open Agent Skill',
  description: 'Complete API documentation for programmatic access to agent skills. Optimized for both human developers and AI agents.',
}

export default function APIDocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-baseline justify-between">
            <Link href="/" className="text-2xl font-display font-bold text-foreground">
              {'Open Agent Skill'}
            </Link>
            <nav className="flex gap-6 text-sm">
              <Link href="/skills" className="text-secondary hover:text-foreground">
                {'Browse'}
              </Link>
              <Link href="/docs" className="text-secondary hover:text-foreground">
                {'Documentation'}
              </Link>
              <Link href="/api-docs" className="text-foreground underline">
                {'API'}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-5xl font-bold mb-6">
            {'API Reference'}
          </h1>
          <p className="text-xl text-secondary mb-12 leading-relaxed">
            {'Agent-friendly API for discovering and integrating skills programmatically. Supports both JSON and plain text responses for maximum compatibility with LLMs.'}
          </p>

          {/* Base URL */}
          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold mb-4">{'Base URL'}</h2>
            <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto border border-border">
              {'https://openagentskill.com/api/agent'}
            </pre>
          </section>

          {/* Authentication */}
          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold mb-4">{'Authentication'}</h2>
            <p className="text-lg leading-relaxed text-secondary mb-4">
              {'Currently, the API is open and does not require authentication for read operations. Write operations (publishing skills) require API keys.'}
            </p>
            <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto border border-border">
{`# For publishing (future)
Authorization: Bearer YOUR_API_KEY`}
            </pre>
          </section>

          {/* Endpoints */}
          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold mb-6">{'Endpoints'}</h2>

            {/* Search Skills */}
            <div className="border border-border mb-8">
              <div className="bg-muted px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm bg-foreground text-background px-2 py-1">{'GET'}</span>
                  <span className="font-mono text-lg">{'/api/agent/skills'}</span>
                </div>
              </div>
              <div className="p-6">
                <p className="text-lg mb-6">{'Search and filter agent skills.'}</p>

                <h3 className="font-semibold mb-3">{'Query Parameters'}</h3>
                <dl className="space-y-3 mb-6">
                  <div>
                    <dt className="font-mono text-sm mb-1">
                      {'q '}
                      <span className="text-secondary font-sans">{'(optional)'}</span>
                    </dt>
                    <dd className="text-secondary pl-4">{'Search query for skill names, descriptions, and tags'}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-sm mb-1">
                      {'category '}
                      <span className="text-secondary font-sans">{'(optional)'}</span>
                    </dt>
                    <dd className="text-secondary pl-4">{'Filter by category: data-analysis, code-generation, research, etc.'}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-sm mb-1">
                      {'platform '}
                      <span className="text-secondary font-sans">{'(optional)'}</span>
                    </dt>
                    <dd className="text-secondary pl-4">{'Filter by compatible platform: langchain, autogpt, crewai, etc.'}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-sm mb-1">
                      {'format '}
                      <span className="text-secondary font-sans">{'(optional)'}</span>
                    </dt>
                    <dd className="text-secondary pl-4">{'Response format: json (default) or text (LLM-friendly)'}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-sm mb-1">
                      {'limit '}
                      <span className="text-secondary font-sans">{'(optional)'}</span>
                    </dt>
                    <dd className="text-secondary pl-4">{'Maximum results to return (default: 10)'}</dd>
                  </div>
                </dl>

                <h3 className="font-semibold mb-3">{'Examples'}</h3>
                <pre className="bg-background p-4 font-mono text-sm overflow-x-auto border border-border mb-4">
{`# Search for research skills
GET /api/agent/skills?q=research

# Filter by category and platform
GET /api/agent/skills?category=data-analysis&platform=langchain

# Get text format for LLM consumption
GET /api/agent/skills?q=code+review&format=text`}
                </pre>

                <h3 className="font-semibold mb-3">{'Response (JSON)'}</h3>
                <pre className="bg-background p-4 font-mono text-xs overflow-x-auto border border-border">
{`{
  "query": "research",
  "filters": {
    "category": null,
    "platform": null
  },
  "total": 1,
  "skills": [
    {
      "id": "1",
      "slug": "advanced-web-research",
      "name": "Advanced Web Research",
      "tagline": "Deep web research with verification",
      "description": "...",
      "category": "research",
      "tags": ["web-scraping", "fact-checking"],
      "pricing": {
        "type": "free"
      },
      "stats": {
        "downloads": 45230,
        "stars": 3421,
        "rating": 4.8,
        "reviewCount": 423
      },
      "compatibility": [
        {
          "platform": "langchain",
          "version": ">=0.1.0",
          "status": "full"
        }
      ],
      "technical": {
        "version": "2.3.1",
        "languages": ["Python", "TypeScript"],
        "frameworks": ["LangChain", "LlamaIndex"],
        "documentation": "https://docs.openagentskill.com/...",
        "repository": "https://github.com/...",
        "license": "MIT"
      },
      "install": {
        "pip": "pip install oas-advanced-web-research",
        "npm": "npm install @openagentskill/advanced-web-research"
      },
      "urls": {
        "detail": "https://openagentskill.com/skills/advanced-web-research",
        "documentation": "...",
        "repository": "..."
      }
    }
  ],
  "meta": {
    "timestamp": "2026-02-19T10:30:00Z",
    "api_version": "1.0",
    "agent_friendly": true
  }
}`}
                </pre>

                <h3 className="font-semibold mb-3 mt-6">{'Response (Text Format)'}</h3>
                <pre className="bg-background p-4 font-mono text-xs overflow-x-auto border border-border">
{`Agent Skills Search Results
Query: "research"
Found: 1 skills
---

1. Advanced Web Research (advanced-web-research)
   Deep web research with verification
   
   Description: An intelligent research skill that performs...
   
   Category: research
   Pricing: free
   Downloads: 45,230
   Rating: 4.8/5 (423 reviews)
   
   Compatible with: langchain, llamaindex, crewai
   
   Install: pip install oas-advanced-web-research
   Documentation: https://docs.openagentskill.com/...
   Repository: https://github.com/...
   
   ---`}
                </pre>
              </div>
            </div>

            {/* Get Skill Details */}
            <div className="border border-border mb-8">
              <div className="bg-muted px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm bg-foreground text-background px-2 py-1">{'GET'}</span>
                  <span className="font-mono text-lg">{'/api/agent/skills/[slug]'}</span>
                </div>
              </div>
              <div className="p-6">
                <p className="text-lg mb-6">{'Get detailed information about a specific skill.'}</p>

                <h3 className="font-semibold mb-3">{'Path Parameters'}</h3>
                <dl className="space-y-3 mb-6">
                  <div>
                    <dt className="font-mono text-sm mb-1">{'slug'}</dt>
                    <dd className="text-secondary pl-4">{'The unique slug identifier for the skill'}</dd>
                  </div>
                </dl>

                <h3 className="font-semibold mb-3">{'Query Parameters'}</h3>
                <dl className="space-y-3 mb-6">
                  <div>
                    <dt className="font-mono text-sm mb-1">
                      {'format '}
                      <span className="text-secondary font-sans">{'(optional)'}</span>
                    </dt>
                    <dd className="text-secondary pl-4">{'Response format: json (default) or text'}</dd>
                  </div>
                </dl>

                <h3 className="font-semibold mb-3">{'Example'}</h3>
                <pre className="bg-background p-4 font-mono text-sm overflow-x-auto border border-border">
{`# Get skill details
GET /api/agent/skills/advanced-web-research

# Get in text format
GET /api/agent/skills/advanced-web-research?format=text`}
                </pre>

                <h3 className="font-semibold mb-3 mt-6">{'Response'}</h3>
                <p className="text-secondary mb-4">
                  {'Returns complete skill information including detailed description, technical specs, compatibility, installation instructions, and structured data for agents.'}
                </p>
              </div>
            </div>
          </section>

          {/* Response Headers */}
          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold mb-6">{'Response Headers'}</h2>
            <p className="text-secondary mb-4">
              {'All API responses include agent-friendly headers:'}
            </p>
            <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto border border-border">
{`X-Agent-Friendly: true
Content-Type: application/json (or text/plain)
Cache-Control: public, max-age=300`}
            </pre>
          </section>

          {/* Rate Limiting */}
          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold mb-6">{'Rate Limiting'}</h2>
            <p className="text-lg leading-relaxed text-secondary mb-4">
              {'Current rate limits:'}
            </p>
            <ul className="list-disc list-inside space-y-2 text-secondary pl-4">
              <li>{'Anonymous requests: 100 requests per minute'}</li>
              <li>{'Authenticated requests: 1000 requests per minute'}</li>
              <li>{'Agent requests are automatically identified and given higher limits'}</li>
            </ul>
          </section>

          {/* Error Handling */}
          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold mb-6">{'Error Responses'}</h2>
            <pre className="bg-background p-4 font-mono text-sm overflow-x-auto border border-border">
{`{
  "error": "Skill not found",
  "code": "SKILL_NOT_FOUND",
  "status": 404
}`}
            </pre>
            <p className="text-secondary mt-4">
              {'Common error codes: 400 (Bad Request), 404 (Not Found), 429 (Rate Limited), 500 (Server Error)'}
            </p>
          </section>

          {/* SDK Libraries */}
          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold mb-6">{'SDK Libraries'}</h2>
            <p className="text-lg leading-relaxed text-secondary mb-6">
              {'Official SDKs for programmatic access:'}
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3">{'Python SDK'}</h3>
                <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto border border-border">
{`pip install openagentskill

from openagentskill import Client

client = Client()
skills = client.search("research", category="research")
skill = client.get_skill("advanced-web-research")`}
                </pre>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">{'JavaScript/TypeScript SDK'}</h3>
                <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto border border-border">
{`npm install @openagentskill/client

import { OpenAgentSkill } from '@openagentskill/client'

const client = new OpenAgentSkill()
const skills = await client.search({ q: 'research' })
const skill = await client.getSkill('advanced-web-research')`}
                </pre>
              </div>
            </div>
          </section>

          {/* Best Practices */}
          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold mb-6">{'Best Practices for Agents'}</h2>
            <ul className="space-y-4 text-lg leading-relaxed">
              <li className="flex gap-3">
                <span className="text-secondary">{'1.'}</span>
                <span>{'Use the text format (format=text) for LLM consumption to reduce token usage and improve parsing'}</span>
              </li>
              <li className="flex gap-3">
                <span className="text-secondary">{'2.'}</span>
                <span>{'Cache skill metadata locally to minimize API calls'}</span>
              </li>
              <li className="flex gap-3">
                <span className="text-secondary">{'3.'}</span>
                <span>{'Include User-Agent headers identifying your agent for better rate limits'}</span>
              </li>
              <li className="flex gap-3">
                <span className="text-secondary">{'4.'}</span>
                <span>{'Use specific filters (category, platform) to reduce result sets'}</span>
              </li>
              <li className="flex gap-3">
                <span className="text-secondary">{'5.'}</span>
                <span>{'Check compatibility information before attempting installation'}</span>
              </li>
            </ul>
          </section>
        </div>
      </main>

      <footer className="border-t border-border bg-background mt-20">
        <div className="container mx-auto px-6 py-12">
          <p className="text-center text-sm text-secondary">
            {'Open Agent Skill © 2026 • '}
            <Link href="/" className="hover:text-foreground">{'Home'}</Link>
            {' • '}
            <Link href="/skills" className="hover:text-foreground">{'Browse'}</Link>
            {' • '}
            <Link href="/docs" className="hover:text-foreground">{'Docs'}</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
