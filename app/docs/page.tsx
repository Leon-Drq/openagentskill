import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Documentation - Open Agent Skill',
  description: 'Complete documentation for building, publishing, and using agent skills on the Open Agent Skill platform.',
}

export default function DocsPage() {
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
              <Link href="/docs" className="text-foreground underline">
                {'Documentation'}
              </Link>
              <Link href="/api" className="text-secondary hover:text-foreground">
                {'API'}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="grid gap-12 lg:grid-cols-4">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <nav className="sticky top-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-sm">{'Getting Started'}</h3>
                <ul className="space-y-1 text-sm text-secondary">
                  <li><a href="#introduction" className="hover:text-foreground">{'Introduction'}</a></li>
                  <li><a href="#quick-start" className="hover:text-foreground">{'Quick Start'}</a></li>
                  <li><a href="#installation" className="hover:text-foreground">{'Installation'}</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-sm">{'Using Skills'}</h3>
                <ul className="space-y-1 text-sm text-secondary">
                  <li><a href="#finding-skills" className="hover:text-foreground">{'Finding Skills'}</a></li>
                  <li><a href="#installing-skills" className="hover:text-foreground">{'Installing Skills'}</a></li>
                  <li><a href="#integration" className="hover:text-foreground">{'Framework Integration'}</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-sm">{'Building Skills'}</h3>
                <ul className="space-y-1 text-sm text-secondary">
                  <li><a href="#creating-skills" className="hover:text-foreground">{'Creating Skills'}</a></li>
                  <li><a href="#skill-spec" className="hover:text-foreground">{'Skill Specification'}</a></li>
                  <li><a href="#testing" className="hover:text-foreground">{'Testing'}</a></li>
                  <li><a href="#publishing" className="hover:text-foreground">{'Publishing'}</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-sm">{'Advanced'}</h3>
                <ul className="space-y-1 text-sm text-secondary">
                  <li><a href="#workflows" className="hover:text-foreground">{'Workflow Composition'}</a></li>
                  <li><a href="#mcp" className="hover:text-foreground">{'MCP Integration'}</a></li>
                  <li><a href="/api" className="hover:text-foreground">{'API Reference'}</a></li>
                </ul>
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <article className="lg:col-span-3 max-w-3xl">
            <h1 className="font-display text-5xl font-bold mb-6" id="introduction">
              {'Documentation'}
            </h1>
            <p className="text-xl text-secondary mb-12 leading-relaxed">
              {'Complete guide to building, publishing, and using agent skills on the Open Agent Skill platform.'}
            </p>

            {/* Introduction */}
            <section className="mb-16">
              <h2 className="font-display text-3xl font-semibold mb-4">{'What is Open Agent Skill?'}</h2>
              <p className="text-lg leading-relaxed mb-4">
                {'Open Agent Skill is an open marketplace for AI agent capabilities. It provides a standardized way to discover, share, and compose skills across different agent frameworks like LangChain, AutoGPT, CrewAI, and more.'}
              </p>
              <p className="text-lg leading-relaxed text-secondary">
                {'Think of it as NPM for agent intelligence — a unified registry where developers can publish reusable capabilities and agents can dynamically discover and integrate them.'}
              </p>
            </section>

            {/* Quick Start */}
            <section className="mb-16" id="quick-start">
              <h2 className="font-display text-3xl font-semibold mb-6">{'Quick Start'}</h2>
              
              <div className="border border-border bg-card p-6 mb-6">
                <h3 className="font-semibold mb-3">{'1. Find a Skill'}</h3>
                <p className="text-secondary mb-4">{'Browse the marketplace to find skills that match your needs:'}</p>
                <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto mb-4">
{`# Browse skills
https://openagentskill.com/skills

# Or search via API
curl https://openagentskill.com/api/agent/skills?q=research`}
                </pre>
              </div>

              <div className="border border-border bg-card p-6 mb-6">
                <h3 className="font-semibold mb-3">{'2. Install the Skill'}</h3>
                <p className="text-secondary mb-4">{'Install using pip or npm:'}</p>
                <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto">
{`# Python
pip install oas-advanced-web-research

# Node.js
npm install @openagentskill/advanced-web-research`}
                </pre>
              </div>

              <div className="border border-border bg-card p-6">
                <h3 className="font-semibold mb-3">{'3. Use in Your Agent'}</h3>
                <p className="text-secondary mb-4">{'Integrate with your framework:'}</p>
                <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto">
{`# LangChain example
from oas import load_skill
from langchain.agents import initialize_agent

research_skill = load_skill("advanced-web-research")
tools = [research_skill.as_langchain_tool()]

agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent="zero-shot-react-description"
)`}
                </pre>
              </div>
            </section>

            {/* Finding Skills */}
            <section className="mb-16" id="finding-skills">
              <h2 className="font-display text-3xl font-semibold mb-6">{'Finding Skills'}</h2>
              <p className="text-lg leading-relaxed mb-6">
                {'Skills can be discovered through the web interface, agent-friendly API, or programmatically within your code.'}
              </p>

              <h3 className="text-xl font-semibold mb-4">{'Web Interface'}</h3>
              <p className="text-secondary mb-4">
                {'Browse skills at '}
                <Link href="/skills" className="underline text-foreground">
                  {'/skills'}
                </Link>
                {' with filtering by category, platform, pricing, and search.'}
              </p>

              <h3 className="text-xl font-semibold mb-4 mt-8">{'Agent API'}</h3>
              <p className="text-secondary mb-4">
                {'AI agents can query the API for structured or plain-text responses:'}
              </p>
              <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto mb-6">
{`# JSON format (structured)
GET /api/agent/skills?q=code+review&platform=langchain

# Text format (LLM-friendly)
GET /api/agent/skills?q=code+review&format=text`}
              </pre>

              <h3 className="text-xl font-semibold mb-4 mt-8">{'Programmatic Discovery'}</h3>
              <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto">
{`from oas import discover_skills

# Search for skills
skills = discover_skills(
    query="data visualization",
    category="data-analysis",
    platform="langchain"
)

for skill in skills:
    print(f"{skill.name}: {skill.tagline}")`}
              </pre>
            </section>

            {/* Installing Skills */}
            <section className="mb-16" id="installing-skills">
              <h2 className="font-display text-3xl font-semibold mb-6">{'Installing Skills'}</h2>
              <p className="text-lg leading-relaxed mb-6">
                {'Skills are distributed as standard packages through PyPI and NPM.'}
              </p>

              <h3 className="text-xl font-semibold mb-4">{'Python Installation'}</h3>
              <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto mb-6">
{`# Install a specific skill
pip install oas-skill-name

# Install with extras
pip install oas-skill-name[full]

# Install from requirements
oas-skill-name>=1.0.0`}
              </pre>

              <h3 className="text-xl font-semibold mb-4">{'Node.js Installation'}</h3>
              <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto">
{`# npm
npm install @openagentskill/skill-name

# yarn
yarn add @openagentskill/skill-name

# pnpm
pnpm add @openagentskill/skill-name`}
              </pre>
            </section>

            {/* Framework Integration */}
            <section className="mb-16" id="integration">
              <h2 className="font-display text-3xl font-semibold mb-6">{'Framework Integration'}</h2>
              <p className="text-lg leading-relaxed mb-6">
                {'Open Agent Skill provides adapters for all major agent frameworks.'}
              </p>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4">{'LangChain'}</h3>
                  <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto">
{`from oas import load_skill

skill = load_skill("advanced-web-research")
tool = skill.as_langchain_tool()

# Use in agent
agent = initialize_agent(tools=[tool], ...)`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">{'CrewAI'}</h3>
                  <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto">
{`from oas import load_skill
from crewai import Agent, Task

skill = load_skill("code-review-assistant")

agent = Agent(
    role="Code Reviewer",
    tools=[skill.as_crewai_tool()],
    ...
)`}
                  </pre>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">{'AutoGPT'}</h3>
                  <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto">
{`from oas import load_skill

skill = load_skill("api-orchestrator")
plugin = skill.as_autogpt_plugin()

# Register in AutoGPT config`}
                  </pre>
                </div>
              </div>
            </section>

            {/* Creating Skills */}
            <section className="mb-16" id="creating-skills">
              <h2 className="font-display text-3xl font-semibold mb-6">{'Creating Skills'}</h2>
              <p className="text-lg leading-relaxed mb-6">
                {'Build your own skills and share them with the community.'}
              </p>

              <h3 className="text-xl font-semibold mb-4">{'Skill Structure'}</h3>
              <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto mb-6">
{`my-skill/
├── skill.yaml          # Skill manifest
├── src/
│   ├── __init__.py
│   └── skill.py        # Main skill implementation
├── tests/
│   └── test_skill.py
├── README.md
└── requirements.txt`}
              </pre>

              <h3 className="text-xl font-semibold mb-4">{'Skill Manifest (skill.yaml)'}</h3>
              <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto">
{`name: my-custom-skill
version: 1.0.0
description: A brief description of what this skill does
category: automation
tags:
  - workflow
  - integration
  
compatibility:
  - platform: langchain
    version: ">=0.1.0"
  - platform: crewai
    version: ">=0.2.0"

dependencies:
  - requests>=2.28.0
  - beautifulsoup4>=4.11.0

author:
  name: Your Name
  email: you@example.com

license: MIT`}
              </pre>
            </section>

            {/* Testing */}
            <section className="mb-16" id="testing">
              <h2 className="font-display text-3xl font-semibold mb-6">{'Testing Skills'}</h2>
              <p className="text-lg leading-relaxed mb-6">
                {'Comprehensive testing ensures your skill works across frameworks and edge cases.'}
              </p>

              <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto mb-6">
{`# Run tests locally
oas test

# Test compatibility with frameworks
oas test --framework langchain
oas test --framework crewai

# Run benchmarks
oas benchmark`}
              </pre>

              <p className="text-secondary">
                {'All skills are automatically tested on the platform before publication to ensure quality and compatibility.'}
              </p>
            </section>

            {/* Publishing */}
            <section className="mb-16" id="publishing">
              <h2 className="font-display text-3xl font-semibold mb-6">{'Publishing Skills'}</h2>
              <p className="text-lg leading-relaxed mb-6">
                {'Share your skills with the community through the Open Agent Skill marketplace.'}
              </p>

              <pre className="bg-muted p-4 font-mono text-sm overflow-x-auto mb-6">
{`# Login to OAS
oas login

# Validate your skill
oas validate

# Publish to marketplace
oas publish

# Update existing skill
oas publish --update`}
              </pre>

              <p className="text-secondary mt-6">
                {'Published skills undergo automated testing and community review. Verified skills meet additional quality standards.'}
              </p>
            </section>

            {/* Workflows */}
            <section className="mb-16" id="workflows">
              <h2 className="font-display text-3xl font-semibold mb-6">{'Workflow Composition'}</h2>
              <p className="text-lg leading-relaxed mb-6">
                {'Combine multiple skills into complex workflows using the visual composer or programmatic API.'}
              </p>

              <p className="text-secondary mb-4">
                {'The workflow composer allows you to chain skills, add conditional logic, and create reusable automation patterns without writing integration code.'}
              </p>

              <Link 
                href="/composer" 
                className="inline-block border border-foreground bg-foreground px-6 py-3 text-background hover:opacity-80 transition-opacity"
              >
                {'Open Workflow Composer'}
              </Link>
            </section>

            {/* MCP Integration */}
            <section className="mb-16" id="mcp">
              <h2 className="font-display text-3xl font-semibold mb-6">{'MCP Integration'}</h2>
              <p className="text-lg leading-relaxed mb-6">
                {'Open Agent Skill supports the Model Context Protocol (MCP) for standardized agent communication.'}
              </p>

              <p className="text-secondary">
                {'MCP allows agents to expose resources and tools in a framework-agnostic way. All OAS skills automatically provide MCP-compatible interfaces when supported by the underlying framework.'}
              </p>
            </section>
          </article>
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
            <Link href="/api" className="hover:text-foreground">{'API'}</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
