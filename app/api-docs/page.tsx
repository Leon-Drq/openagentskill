import { Metadata } from 'next'
import Link from 'next/link'
import { MarketingHero, MarketingPageShell } from '@/components/marketing-page'
import { SKILL_SUBMISSION_MIN_STARS } from '@/lib/skills/submission-policy'

export const metadata: Metadata = {
  title: 'API Reference - OpenAgentSkill',
  description: 'Agent-friendly Resolve API for selecting, auditing, and installing AI agent skills programmatically.',
  alternates: {
    canonical: 'https://www.openagentskill.com/api-docs',
  },
}

export default function APIDocsPage() {
  return (
    <MarketingPageShell>
        <MarketingHero
          eyebrow="API Reference"
          title="Agent-friendly discovery, ranking, and install data."
          description="Programmatically discover skills with JSON or plain text responses optimized for LLM consumption."
        />

        <div className="mx-auto max-w-5xl px-6 py-12 sm:py-14 lg:py-16">

        {/* Base URL */}
        <section className="mb-10 sm:mb-12 lg:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">
            {'Base URL'}
          </h2>
          <div className="grid gap-3">
            <div className="bg-card p-4 sm:p-6 font-mono text-sm sm:text-base overflow-x-auto border border-border">
              {'https://www.openagentskill.com/api/registry'}
            </div>
            <div className="bg-card p-4 sm:p-6 font-mono text-sm sm:text-base overflow-x-auto border border-border">
              {'https://www.openagentskill.com/api/agent'}
            </div>
            <div className="bg-card p-4 sm:p-6 font-mono text-sm sm:text-base overflow-x-auto border border-border">
              {'https://www.openagentskill.com/api/skills'}
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-secondary">
            {'Use '}
            <code className="bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{'/api/registry/*'}</code>
            {' for public registry-style discovery and install handoffs, '}
            <code className="bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{'/api/agent/*'}</code>
            {' for full agent payloads, or '}
            <code className="bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{'/api/skills/*'}</code>
            {' for simple registry search and install handoffs.'}
          </p>
        </section>

        {/* Format Parameter */}
        <section className="mb-10 sm:mb-12 lg:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">
            {'Response Formats'}
          </h2>
          <p className="text-base sm:text-lg leading-relaxed mb-4">
            {'All endpoints support two response formats via the '}
            <code className="font-mono text-sm bg-muted px-2 py-1">{'format'}</code>
            {' parameter:'}
          </p>
          <ul className="space-y-3 text-base sm:text-lg leading-relaxed text-secondary mb-6">
            <li>
              <code className="font-mono text-sm bg-muted px-2 py-1 text-foreground">{'format=json'}</code>
              {' (default) - Structured JSON response'}
            </li>
            <li>
              <code className="font-mono text-sm bg-muted px-2 py-1 text-foreground">{'format=text'}</code>
              {' - Plain text optimized for LLM consumption (uses fewer tokens)'}
            </li>
          </ul>
        </section>

        {/* Endpoints */}
        <section className="mb-10 sm:mb-12 lg:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-3 sm:mb-4">
            {'Endpoints'}
          </h2>
          <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
            {[
              { method: 'GET', path: '/api/agent/skills' },
              { method: 'GET', path: '/api/agent/skills/{slug}' },
              { method: 'GET', path: '/api/agent/tasks' },
              { method: 'GET', path: '/api/agent/tasks/{slug}' },
              { method: 'GET', path: '/api/agent/integration-kit' },
              { method: 'POST', path: '/api/agent/resolve' },
              { method: 'GET', path: '/api/agent/receipt' },
              { method: 'GET', path: '/api/agent/discovery' },
              { method: 'GET', path: '/api/agent/recommend' },
              { method: 'GET', path: '/api/agent/evals' },
              { method: 'POST', path: '/api/agent/outcome' },
              { method: 'GET', path: '/api/registry' },
              { method: 'GET', path: '/api/registry/search' },
              { method: 'GET', path: '/api/registry/recommend' },
              { method: 'GET', path: '/api/registry/manifest/{slug}' },
              { method: 'GET', path: '/api/registry/install/{slug}' },
              { method: 'GET', path: '/api/skills/search' },
              { method: 'GET', path: '/api/skills/{slug}/install' },
              { method: 'GET', path: '/api/badge/{slug}' },
              { method: 'GET', path: '/api/agent/packs' },
              { method: 'GET', path: '/api/agent/packs/{slug}' },
              { method: 'GET', path: '/api/agent/rankings' },
              { method: 'GET', path: '/api/agent/weekly-report' },
              { method: 'GET', path: '/api/audits/{slug}' },
              { method: 'POST', path: '/api/agent/feedback' },
              { method: 'POST', path: '/api/skills/submit' },
              { method: 'POST', path: '/api/subscribe' },
            ].map(({ method, path }) => (
              <div key={path} className="flex items-center gap-2 border border-border px-3 py-1.5 text-xs font-mono">
                <span className={method === 'POST' ? 'text-foreground font-bold' : 'text-secondary'}>
                  {method}
                </span>
                <span className="text-secondary">{path}</span>
              </div>
            ))}
          </div>

          <div id="agent-integration-kit" className="scroll-mt-24 border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/agent/integration-kit'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Copy-paste setup templates and stable response fields for Codex, Claude Code, Cursor, and other agent runtimes. Use this before calling Resolve from an agent workflow.'}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 mb-4 sm:mb-6">
                {[
                  'GET /api/agent/integration-kit',
                  'GET /api/agent/integration-kit?format=text',
                  'GET /agent/integration-kit',
                  'GET /.well-known/agent-manifest.json',
                ].map((example) => (
                  <code key={example} className="border border-border bg-card px-3 py-2 font-mono text-xs leading-relaxed">
                    {example}
                  </code>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-secondary">
                {'The payload includes supported_agents, recommended_flow, stable_response_fields, and safety_rules. Agents should copy the platform template, call Resolve, then read agent_handoff before installing.'}
              </p>
            </div>
          </div>

          <div id="registry-api" className="scroll-mt-24 border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/registry/*'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Public registry aliases for agents that need clean, predictable endpoints: search by task, request ranked recommendations, fetch one manifest, or get an install handoff.'}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 mb-4 sm:mb-6">
                {[
                  'GET /api/registry/search?task=analyze+SEC+filings&limit=5',
                  'GET /api/registry/recommend?task=build+a+World+Cup+dashboard',
                  'GET /api/registry/manifest/crawl4ai',
                  'GET /api/registry/install/crawl4ai?format=text',
                ].map((example) => (
                  <code key={example} className="border border-border bg-card px-3 py-2 font-mono text-xs leading-relaxed">
                    {example}
                  </code>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-secondary">
                {'These aliases point to the same ranking, trust, audit, and install data used by the main agent endpoints, but the URL shape is easier to remember and market as a skill registry.'}
              </p>
            </div>
          </div>

          <div id="agent-resolve" className="scroll-mt-24 border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'POST'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/agent/resolve'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Resolve a task into one selected skill, alternatives, an agent safety profile, a policy decision, and a target-specific install plan. This is the canonical endpoint for agent runtime use.'}
              </p>
              <div className="mb-4 grid gap-px border border-border bg-border text-sm sm:mb-6 md:grid-cols-2">
                {[
                  ['recommendation.best_skill', 'Selected skill with web, API, audit, and repository URLs'],
                  ['recommendation.install', 'Command, target, install API, review requirement, and auto-install policy'],
                  ['recommendation.why_recommended', 'Short explainable ranking reasons for agent logs'],
                  ['recommendation.trust_score_v5', 'Trust Score v5 decision, outcome confidence, install policy, compatibility, risk summary, and v4 compatibility data'],
                  ['agent_proven', '0-100 outcome-backed adoption score with recent success/failure, install success, output quality, production use, and unique agent signals'],
                  ['install_receipt', 'Stable install receipt with selected skill, install policy, risk notes, alternatives, outcome event id, and next steps'],
                  ['decision_packet', 'Stable agent contract with selected skill, install plan, trust dimensions, do_not_use_when, alternatives, and outcome_feedback'],
                  ['agent_feedback_loop', 'Outcome reporting contract, quality fields, idempotency, and ranking inputs updated after a run'],
                  ['feedback', 'Outcome event id, outcome API URL, expected outcomes, and ready CLI command for reporting adoption results'],
                  ['agent_handoff', 'Platform copy prompts, API sequence, review checklist, expected output contract, and blocked actions'],
                ].map(([field, detail]) => (
                  <div key={field} className="min-w-0 bg-background p-3">
                    <code className="font-mono text-xs">{field}</code>
                    <p className="mt-2 text-xs leading-relaxed text-secondary">{detail}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 mb-4 sm:mb-6 text-sm sm:text-base">
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'task'}</code>
                  <span className="text-secondary ml-2">{'- Required task description'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'agent'}</code>
                  <span className="text-secondary ml-2">{'- codex, claude-code, cursor, or auto'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'constraints.max_risk'}</code>
                  <span className="text-secondary ml-2">{'- low, medium, or high'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'constraints.needs_install_command'}</code>
                  <span className="text-secondary ml-2">{'- Require install handoff'}</span>
                </div>
              </div>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border whitespace-pre-wrap">
                <code>{`POST /api/agent/resolve
{
  "task": "review a pull request and summarize risky changes",
  "agent": "codex",
  "constraints": {
    "max_risk": "medium",
    "needs_install_command": true,
    "min_stars": 500
  }
}`}</code>
              </div>
              <div className="mt-4 bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border">
                <code>{'GET /api/agent/resolve?task=scrape+pricing+pages&agent=codex&max_risk=medium&format=text'}</code>
              </div>
            </div>
          </div>

          <div id="agent-receipt" className="scroll-mt-24 border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/agent/receipt'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Generate the stable install receipt for one resolved task. Agents should treat this as the pre-install execution record: selected skill, install command, safety policy, risk notes, alternatives, outcome event id, and next steps.'}
              </p>
              <div className="grid gap-px border border-border bg-border text-sm sm:mb-6 md:grid-cols-2">
                {[
                  ['receipt_id', 'Durable id for the selected task-to-skill handoff'],
                  ['selected_skill', 'Skill URL, API URL, audit URL, eval URL, and repository'],
                  ['install', 'Command, target, policy, sandbox-first flag, and human-review requirement'],
                  ['risk', 'Audit label, safety tier, warnings, and do_not_use_when metadata'],
                  ['agent_proven', 'Outcome-backed score, label, summary, and metrics for whether agents have made the skill work'],
                  ['alternatives', 'Fallback skills with install commands and safety scores'],
                  ['outcome_feedback', 'event_id, POST endpoint, payload template, dry_run payload, and CLI example'],
                ].map(([field, detail]) => (
                  <div key={field} className="min-w-0 bg-background p-3">
                    <code className="font-mono text-xs">{field}</code>
                    <p className="mt-2 text-xs leading-relaxed text-secondary">{detail}</p>
                  </div>
                ))}
              </div>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border">
                <code>{'GET /api/agent/receipt?task=scrape+pricing+pages&agent=codex&max_risk=medium&format=text'}</code>
              </div>
            </div>
          </div>

          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/agent/tasks'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Task-first catalog for agents. Use it when the agent knows the job to be done but has not selected a skill yet.'}
              </p>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border">
                <code>{'GET /api/agent/tasks?format=text'}</code>
              </div>
            </div>
          </div>

          <div id="agent-outcome" className="scroll-mt-24 border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'POST'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/agent/outcome'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Report what happened after an agent tried one resolved skill. These aggregate signals feed Trust Score v5, Agent-Proven rankings, skill detail pages, and the public Resolve eval dashboard.'}
              </p>
              <div className="grid gap-px border border-border bg-border text-sm sm:mb-6 md:grid-cols-2">
                {[
                  ['success', 'The skill helped complete the task'],
                  ['failed', 'The skill was attempted but did not work'],
                  ['not_relevant', 'The selected skill did not fit the task'],
                  ['blocked_by_risk', 'The agent stopped because risk was too high'],
                  ['setup_required', 'The skill may work but required extra setup'],
                  ['output_quality', 'Optional 1-5 quality signal for the run output'],
                  ['used_in_production', 'Optional signal that the skill was useful beyond a sandbox run'],
                  ['human_review_required', 'Optional signal that the run needed human inspection before reuse'],
                  ['Agent Proven Score', 'Derived from total outcomes, recent success/failure, install success rate, output quality, production use, unique agents, and risk/setup penalties'],
                  ['error_type', 'Optional install_failed, runtime_error, permission_blocked, low_quality_output, timeout, or other'],
                  ['dry_run', 'Set true to validate a payload without writing a database row'],
                  ['GET /api/agent/outcome?skill_slug=crawl4ai', 'Read aggregate success and install-attempt stats'],
                  ['GET /api/agent/outcome?format=text', 'Read a compact machine-friendly outcome summary'],
                  ['GET /api/agent/outcome?contract=true', 'Read the v3 feedback contract'],
                ].map(([field, detail]) => (
                  <div key={field} className="min-w-0 bg-background p-3">
                    <code className="font-mono text-xs">{field}</code>
                    <p className="mt-2 text-xs leading-relaxed text-secondary">{detail}</p>
                  </div>
                ))}
              </div>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border whitespace-pre-wrap">
                <code>{`POST /api/agent/outcome
{
  "event_id": "resolve_...",
  "skill_slug": "crawl4ai",
  "task": "scrape pricing pages",
  "agent": "codex",
  "outcome": "success",
  "install_used": true,
  "task_success": true,
  "output_quality": 4,
  "workspace": "sandbox",
  "time_to_useful_ms": 120000
}`}</code>
              </div>
            </div>
          </div>

          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/agent/discovery'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Public-safe status for the GitHub auto-discovery pipeline. Shows schedule, filters, thresholds, cross-domain query coverage, indexer health, and recent run summaries.'}
              </p>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border">
                <code>{'GET /api/agent/discovery'}</code>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-secondary">
                {'Private imports can target a domain such as '}
                <code className="bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{'domains:["finance"]'}</code>
                {' for finance, quant, trading, market-data, portfolio, and filings skills.'}
              </p>
            </div>
          </div>

          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/skills/search'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Simple public registry search for humans, tools, and lightweight agents. Accepts task-style queries and returns ranked skills with trust, audit, URLs, and install handoffs.'}
              </p>
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6 text-sm sm:text-base">
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'q'}</code>
                  <span className="text-secondary ml-2">{'- Skill, task, platform, or workflow query'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'task'}</code>
                  <span className="text-secondary ml-2">{'- Alias for q when an agent sends a job description'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'min_stars'}</code>
                  <span className="text-secondary ml-2">{'- Optional minimum GitHub stars filter'}</span>
                </div>
              </div>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border">
                <code>{'GET /api/skills/search?task=scrape+pricing+pages&min_stars=500&limit=5'}</code>
              </div>
            </div>
          </div>

          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/skills/{slug}/install'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Get the install command, agent prompt, target-specific install options, safety checklist, and canonical URLs for one skill.'}
              </p>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border">
                <code>{'GET /api/skills/crawl4ai/install?format=text'}</code>
              </div>
            </div>
          </div>

          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/agent/evals'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Run registry regression checks, pass slug={skill} for one pre-install Trust + Eval contract, or pass slugs={a,b,c} to compare candidate skills before choosing one to install.'}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border">
                  <code>{'GET /api/agent/evals'}</code>
                </div>
                <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border">
                  <code>{'GET /api/agent/evals?slug=crawl4ai&task=scrape+pricing+pages&format=text'}</code>
                </div>
                <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border sm:col-span-2">
                  <code>{'GET /api/agent/evals?slugs=crawl4ai,markitdown&task=parse+PDFs+into+markdown'}</code>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-secondary">
                {'Use '}
                <Link className="underline underline-offset-4" href="/evals/resolve">
                  {'/evals/resolve'}
                </Link>
                {' for the public dashboard view of the same recommendation benchmark.'}
              </p>
              <div className="mt-4 grid gap-px border border-border bg-border text-sm md:grid-cols-2">
                {[
                  ['eval.status', 'passed, review, or failed'],
                  ['eval.decision', 'shortlist, manual_review, or do_not_auto_install'],
                  ['eval.checks', 'Required install gates plus supporting trust checks'],
                  ['eval.validation_plan', 'Concrete sandbox verification steps before production use'],
                ].map(([field, detail]) => (
                  <div key={field} className="min-w-0 bg-background p-3">
                    <code className="font-mono text-xs">{field}</code>
                    <p className="mt-2 text-xs leading-relaxed text-secondary">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/badge/{slug}'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Return an SVG README badge for a listed skill. Use metric=listed, trust, quality, stars, audit, or proven.'}
              </p>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border">
                <code>{'GET /api/badge/crawl4ai?metric=audit'}</code>
              </div>
            </div>
          </div>

          {/* GET /api/agent/skills */}
          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/agent/skills'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Search and filter agent skills.'}
              </p>

              <h3 className="font-semibold mb-3 text-sm sm:text-base">{'Query Parameters'}</h3>
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6 text-sm sm:text-base">
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'q'}</code>
                  <span className="text-secondary ml-2">{'- Search query'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'category'}</code>
                  <span className="text-secondary ml-2">{'- Filter by category'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'platform'}</code>
                  <span className="text-secondary ml-2">{'- Filter by platform'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'trust'}</code>
                  <span className="text-secondary ml-2">{'- Filter by trust tier: production, strong, review, risk'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'sort'}</code>
                  <span className="text-secondary ml-2">{'- Sort by: quality, downloads, stars, trending, fresh, new'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'format'}</code>
                  <span className="text-secondary ml-2">{'- Response format: json or text'}</span>
                </div>
              </div>

              <h3 className="font-semibold mb-3 text-sm sm:text-base">{'Example Request'}</h3>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border mb-4 sm:mb-6">
                <code>{'GET /api/agent/skills?q=web+research&trust=production&format=text'}</code>
              </div>

              <h3 className="font-semibold mb-3 text-sm sm:text-base">{'Example Response (text format)'}</h3>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border whitespace-pre-wrap">
                <code>{`=== Agent Skills Search Results ===

Total: 2 skills found

---
[1] Advanced Web Research
- Slug: advanced-web-research
- Category: Research & Analysis
- Install: npx skills add openagentskill/web-research
- Trust: 91/100 Production candidate
- Downloads: 45,230
- Rating: 4.8/5
- Description: Comprehensive web research with multi-source aggregation

[2] Code Review Assistant
- Slug: code-review-assistant
- Category: Developer Tools
- Install: npx skills add openagentskill/code-review
- Trust: 77/100 Strong shortlist
- Downloads: 38,912
- Rating: 4.7/5
- Description: Automated code review with security analysis`}</code>
              </div>

              <p className="mt-4 text-sm text-secondary">
                {'JSON responses include quality profiles, platform hints, install commands, repository links, and detail URLs.'}
              </p>
            </div>
          </div>

          {/* GET /api/agent/recommend */}
          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/agent/recommend'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Describe a task and get skill recommendations with readiness scores, role fit, risk notes, implementation steps, and related stack suggestions.'}
              </p>
              <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
                {[
                'install_targets',
                'trust.score',
                'audit.audit_score',
                'decision.next_steps',
              ].map((field) => (
                <code key={field} className="border border-border bg-card px-3 py-2 font-mono text-xs">
                  {field}
                  </code>
                ))}
              </div>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border">
                <code>{'GET /api/agent/recommend?task=scrape+websites+and+extract+tables&limit=4'}</code>
              </div>
            </div>
          </div>

          {/* GET /api/agent/packs */}
          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/agent/packs'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Get curated skill packs for complete workflows, including top skills, trust signals, install targets, and install_plan_url for agent execution.'}
              </p>
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6 text-sm sm:text-base">
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'limit'}</code>
                  <span className="text-secondary ml-2">{'- Skills per pack, max 10'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'format'}</code>
                  <span className="text-secondary ml-2">{'- Response format: json or text'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'install_plan_url'}</code>
                  <span className="text-secondary ml-2">{'- Fetch this URL when an agent needs the executable pack plan'}</span>
                </div>
              </div>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border">
                <code>{'GET /api/agent/packs?limit=5&format=text'}</code>
              </div>
            </div>
          </div>

          {/* GET /api/agent/packs/[slug] */}
          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/agent/packs/{slug}'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Get one skill pack with ranked skills, audit scores, trust profiles, install commands, review checklist, outcome feedback, and an executable install_plan object.'}
              </p>
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6 text-sm sm:text-base">
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'install_plan.selected_skills'}</code>
                  <span className="text-secondary ml-2">{'- Ordered skill shortlist with install command, skill URL, audit URL, and risk level'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'install_plan.review_checklist'}</code>
                  <span className="text-secondary ml-2">{'- Pre-install checks an agent should complete before using the pack'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'install_plan.outcome_feedback'}</code>
                  <span className="text-secondary ml-2">{'- Endpoint and required fields for reporting whether the pack worked'}</span>
                </div>
              </div>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border">
                <code>{'GET /api/agent/packs/frontend-engineer-agent-pack?limit=8'}</code>
              </div>
            </div>
          </div>

          {/* GET /api/agent/rankings */}
          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/agent/rankings'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Get ranked skill shortlists by quality, stars, freshness, new arrivals, workflow-specific use cases, or real Agent-Proven outcome evidence.'}
              </p>
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6 text-sm sm:text-base">
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'slug'}</code>
                  <span className="text-secondary ml-2">{'- Ranking slug, e.g. agent-proven, best-by-success-rate, safest-auto-install-skills, best-codex-skills, or best-web-scraping-skills'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'limit'}</code>
                  <span className="text-secondary ml-2">{'- Number of skills to return, max 30'}</span>
                </div>
                <div>
                  <code className="font-mono bg-muted px-2 py-1">{'format'}</code>
                  <span className="text-secondary ml-2">{'- Response format: json or text'}</span>
                </div>
              </div>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border">
                <code>{'GET /api/agent/rankings?slug=agent-proven&limit=5&format=text'}</code>
              </div>
            </div>
          </div>

          {/* GET /api/agent/weekly-report */}
          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/agent/weekly-report'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Get a weekly operating report with editor picks, new skills, maintained projects, and engagement signals.'}
              </p>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border">
                <code>{'GET /api/agent/weekly-report?format=text'}</code>
              </div>
            </div>
          </div>

          {/* GET /api/agent/skills/[slug] */}
          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/agent/skills/{slug}'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Get detailed information about a specific skill.'}
              </p>

              <h3 className="font-semibold mb-3 text-sm sm:text-base">{'Example Request'}</h3>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border mb-4 sm:mb-6">
                <code>{'GET /api/agent/skills/advanced-web-research?format=text'}</code>
              </div>

              <h3 className="font-semibold mb-3 text-sm sm:text-base">{'Example Response (text format)'}</h3>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border whitespace-pre-wrap">
                <code>{`=== Advanced Web Research ===

INSTALL:
npx skills add openagentskill/web-research

DESCRIPTION:
Comprehensive web research with multi-source aggregation

CATEGORY: Research & Analysis
PLATFORMS: LangChain, LlamaIndex

STATS:
- Downloads: 45,230
- Stars: 3,421
- Trust: 91/100 Production candidate
- Rating: 4.8/5 (423 reviews)

TECHNICAL:
- Version: 2.3.1
- Languages: Python, TypeScript
- Repository: https://github.com/openagentskill/web-research
- License: MIT

USAGE:
This skill enables agents to perform comprehensive web research...`}</code>
              </div>
            </div>
          </div>

          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/audits/{slug}'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Get the OpenAgentSkill audit report for a skill, including audit score, risk level, check results, warnings, and signals.'}
              </p>

              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border mb-4 sm:mb-6">
                <code>{'GET /api/audits/crawl4ai'}</code>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                {[
                  'audit.audit_score',
                  'audit.risk_level',
                  'audit.checks[]',
                  'audit.warnings[]',
                ].map((field) => (
                  <code key={field} className="border border-border bg-card px-3 py-2 font-mono text-xs">
                    {field}
                  </code>
                ))}
              </div>
            </div>
          </div>

          <div id="skill-badges" className="scroll-mt-24 border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'GET'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/badge/{slug}'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {'Generate a README-friendly SVG badge for listed status, audit score, trust score, Agent Proven Score, quality score, or GitHub stars.'}
              </p>

              <h3 className="font-semibold mb-3 text-sm sm:text-base">{'Example Markdown'}</h3>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border mb-4 sm:mb-6 whitespace-pre-wrap">
                <code>{`[![Listed](https://www.openagentskill.com/api/badge/crawl4ai?metric=listed&label=Listed)](https://www.openagentskill.com/skills/crawl4ai)

[![Trust](https://www.openagentskill.com/api/badge/crawl4ai?metric=trust&label=Trust)](https://www.openagentskill.com/skills/crawl4ai)

[![Audit](https://www.openagentskill.com/api/badge/crawl4ai?metric=audit&label=Audit)](https://www.openagentskill.com/skills/crawl4ai/audit)

[![Quality](https://www.openagentskill.com/api/badge/crawl4ai?metric=quality&label=Quality)](https://www.openagentskill.com/skills/crawl4ai)

[![Agent Proven](https://www.openagentskill.com/api/badge/crawl4ai?metric=proven&label=Agent%20Proven)](https://www.openagentskill.com/skills/crawl4ai)

[![Stars](https://www.openagentskill.com/api/badge/crawl4ai?metric=stars&label=GitHub)](https://www.openagentskill.com/skills/crawl4ai)`}</code>
              </div>

              <h3 className="font-semibold mb-3 text-sm sm:text-base">{'Query Parameters'}</h3>
              <div className="space-y-3 text-sm sm:text-base">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
                  <code className="font-mono bg-muted px-2 py-1 w-fit shrink-0">{'metric'}</code>
	                  <span className="text-secondary">{'listed, trust, audit, quality, stars, proven, or agent-proven. Defaults to listed.'}</span>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
                  <code className="font-mono bg-muted px-2 py-1 w-fit shrink-0">{'label'}</code>
                  <span className="text-secondary">{'Optional badge label, such as Quality or GitHub.'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* POST /api/skills/submit */}
          <div className="border border-border mb-8 sm:mb-10">
            <div className="bg-muted px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="font-mono text-xs sm:text-sm bg-foreground text-background px-2 py-1 w-fit">
                  {'POST'}
                </span>
                <span className="font-mono text-sm sm:text-base lg:text-lg break-all">
                  {'/api/skills/submit'}
                </span>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-base sm:text-lg mb-4 sm:mb-6">
                {`Submit a GitHub repository as a skill. The repository must have at least ${SKILL_SUBMISSION_MIN_STARS} stars and pass static security analysis plus AI scoring before automatic publishing. Used by OpenClaw and other agents to submit skill candidates.`}
              </p>

              <h3 className="font-semibold mb-3 text-sm sm:text-base">{'Request Body'}</h3>
              <div className="space-y-3 mb-6 text-sm sm:text-base">
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                  <code className="font-mono bg-muted px-2 py-1 w-fit shrink-0">{'repository'}</code>
                  <span className="text-secondary">{'GitHub repository URL (required) — e.g. https://github.com/owner/repo'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                  <code className="font-mono bg-muted px-2 py-1 w-fit shrink-0">{'category'}</code>
                  <span className="text-secondary">{'Skill category (required)'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                  <code className="font-mono bg-muted px-2 py-1 w-fit shrink-0">{'tags'}</code>
                  <span className="text-secondary">{'Array of tags (optional)'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                  <code className="font-mono bg-muted px-2 py-1 w-fit shrink-0">{'submissionSource'}</code>
                  <span className="text-secondary">{'Set to "agent" for automated submissions (optional, default: "web")'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
                  <code className="font-mono bg-muted px-2 py-1 w-fit shrink-0">{'submittedByAgent'}</code>
                  <span className="text-secondary">{'Agent identifier string, e.g. "openclaw-v1.2" (optional)'}</span>
                </div>
              </div>

              <h3 className="font-semibold mb-3 text-sm sm:text-base">{'Example Request'}</h3>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border mb-6 whitespace-pre-wrap">
                <code>{`POST /api/skills/submit
Content-Type: application/json

{
  "repository": "https://github.com/owner/my-skill",
  "category": "Web Scraping",
  "tags": ["crawler", "llm", "python"],
  "submissionSource": "agent",
  "submittedByAgent": "openclaw-v1.2"
}`}</code>
              </div>

              <h3 className="font-semibold mb-3 text-sm sm:text-base">{'Example Response'}</h3>
              <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border whitespace-pre-wrap">
                <code>{`{
  "success": true,
  "approved": true,
  "skill": {
    "id": "...",
    "slug": "owner-my-skill",
    "name": "My Skill"
  },
  "review": {
    "approved": true,
    "totalScore": 36,
    "summary": "High quality skill with clear documentation",
    "policy": {
      "status": "approved",
      "min_stars": ${SKILL_SUBMISSION_MIN_STARS},
      "checks": ["GitHub adoption", "Static security scan", "AI total score"]
    }
  }
}`}</code>
              </div>
            </div>
          </div>
        </section>

        {/* OpenClaw Auto-Submit */}
        <section className="mb-10 sm:mb-12 lg:mb-16 border-t border-border pt-10 sm:pt-12">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-2 sm:mb-3">
            {'OpenClaw Auto-Submit'}
          </h2>
          <p className="text-base sm:text-lg leading-relaxed text-secondary mb-8">
            {'If you use OpenClaw, you can configure it to automatically publish your skills to OpenAgentSkill whenever a repo crosses the 50-star threshold.'}
          </p>

          <div className="space-y-8">
            <div className="flex min-w-0 gap-4 sm:gap-6">
              <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 border border-foreground flex items-center justify-center font-mono text-xs sm:text-sm font-bold">
                {'1'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold mb-2 text-sm sm:text-base">{'Add the webhook to your OpenClaw config'}</h3>
                <p className="text-secondary text-sm mb-3">{'In your openclaw.config.yaml, add the submit endpoint as a publish target:'}</p>
                <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border whitespace-pre-wrap">
                  <code>{`# openclaw.config.yaml
publish:
  - target: openagentskill
    url: https://openagentskill.com/api/skills/submit
    trigger:
      stars_threshold: 50
    payload:
      submissionSource: agent
      submittedByAgent: "openclaw-v1.2"`}</code>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 gap-4 sm:gap-6">
              <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 border border-foreground flex items-center justify-center font-mono text-xs sm:text-sm font-bold">
                {'2'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold mb-2 text-sm sm:text-base">{'OpenClaw will POST automatically when the threshold is reached'}</h3>
                <p className="text-secondary text-sm mb-3">{`Once configured, every time a monitored repo crosses ${SKILL_SUBMISSION_MIN_STARS} stars, OpenClaw will call the submit API with the repo details. You can also trigger it manually:`}</p>
                <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border whitespace-pre-wrap">
                  <code>{`# Manually submit a specific repo via OpenClaw
openclaw publish --target openagentskill --repo owner/my-skill`}</code>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 gap-4 sm:gap-6">
              <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 border border-foreground flex items-center justify-center font-mono text-xs sm:text-sm font-bold">
                {'3'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold mb-2 text-sm sm:text-base">{'AI review runs automatically'}</h3>
                <p className="text-secondary text-sm">{'Submitted skills go through the same review pipeline as manual submissions: minimum-star gate, static security analysis, AI quality scoring, and a final publish policy gate. Only approved skills appear immediately with the activity feed noting they were discovered by OpenClaw.'}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 sm:p-6 border border-border">
            <h3 className="font-semibold mb-3 text-sm sm:text-base">{'Or call the API directly (no OpenClaw required)'}</h3>
            <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border whitespace-pre-wrap">
              <code>{`curl -X POST https://openagentskill.com/api/skills/submit \\
  -H "Content-Type: application/json" \\
  -d '{
    "repository": "https://github.com/your-org/your-skill",
    "category": "Web Scraping",
    "tags": ["python", "llm"],
    "submissionSource": "agent",
    "submittedByAgent": "my-custom-agent"
  }'`}</code>
            </div>
          </div>
        </section>

        {/* Agent Protocol */}
        <section className="mb-10 sm:mb-12 lg:mb-16 border-t border-border pt-10 sm:pt-12">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">
            {'Agent Protocol Discovery'}
          </h2>
          <p className="text-base sm:text-lg leading-relaxed mb-4">
            {'AI agents can automatically discover our API capabilities via the standard agent protocol file:'}
          </p>
          <div className="bg-card p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-x-auto border border-border">
            <code>{'GET /.well-known/agent-protocol.json'}</code>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-10 sm:mb-12 lg:mb-16">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">
            {'Rate Limits'}
          </h2>
          <p className="text-base sm:text-lg leading-relaxed text-secondary">
            {'Currently no rate limits for read operations. Fair use policy applies. For higher limits, '}
            <a href="mailto:api@openagentskill.com" className="underline hover:opacity-60 transition-opacity">
              {'contact us'}
            </a>
            {'.'}
          </p>
        </section>
        </div>
    </MarketingPageShell>
  )
}
