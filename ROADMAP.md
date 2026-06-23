# OpenAgentSkill Roadmap

OpenAgentSkill is building the skill layer for AI agents: a registry, trust layer, recommendation API, and outcome feedback loop for reusable agent skills.

## North Star

Let an AI agent find, compare, install, and report outcomes for the right reusable skill automatically.

## Current Focus

### 1. High-Quality Supply

- Expand toward 20,000+ approved skill listings.
- Keep MCP-only repositories excluded from automated imports.
- Improve scenario coverage for coding, research, finance, data, design, marketing, legal, education, security, browser automation, RAG, PDF parsing, and sports analytics.
- Add richer machine-readable metadata to every listing:
  - suitable tasks
  - supported agents
  - install command
  - Trust Score
  - risk level
  - alternatives
  - do-not-use-for guidance

### 2. Trust Score

- Upgrade Trust Score from metadata scoring into a public adoption signal.
- Improve scoring dimensions:
  - README/SKILL.md completeness
  - license clarity
  - recent maintenance
  - stars/forks/issues activity
  - install command availability
  - unsafe shell/env/token/network risk hints
  - dependency and runtime risk
  - outcome feedback
- Make audit pages clearer for agents and human reviewers.

### 3. Agent Resolve API

- Make `/api/agent/resolve` the default interface for agents.
- Strengthen ranking with task fit, Trust Score, audit risk, install readiness, and outcome evidence.
- Return:
  - best skill
  - alternatives
  - install plan
  - risk explanation
  - expected setup
  - agent-specific handoff for Codex, Claude Code, Cursor, and CLI usage

### 4. Outcome Feedback Loop

- Encourage agents to report whether a resolved skill worked.
- Feed aggregate outcomes into:
  - rankings
  - Trust Score
  - skill detail pages
  - use-case pages
  - future recommendations
- Add public breakdowns for setup friction, risk blocks, and failed installs.

### 5. Creator Growth Loop

- Make every community-indexed listing claimable.
- Help authors add OpenAgentSkill badges to their READMEs.
- Generate high-quality X share cards and launch copy.
- Create creator pages and official listings.
- Build a stronger incentive for authors to submit, claim, and maintain their skills.

### 6. Programmatic SEO

- Keep generating real, useful pages with actual skill lists:
  - Best AI agent skills for web scraping
  - Best Codex skills for finance analysis
  - Claude Code skills for PDF parsing
  - Best AI agent skills for football analytics
  - OpenAgentSkill vs skills.sh
  - OpenAgentSkill vs agentskills.io
- Avoid thin marketing pages.
- Every page should include real skills, quality signals, install guidance, and agent use cases.

## Completed

- Public skill directory.
- High-star GitHub auto-indexer.
- MCP exclusion policy.
- Scenario import profiles.
- Skill detail pages.
- Audit pages.
- Trust Score v4.
- Resolve API.
- Agent Integration Kit.
- README badges.
- Outcome feedback API.
- Outcome Loop page.
- Use-case pages.
- Comparison pages.
- Creator claim flow.
- X share/reply draft system.

## Near-Term Milestones

- [ ] Use outcome evidence more directly in Resolve ranking.
- [ ] Add more high-quality skill author badges and README adoption examples.
- [ ] Improve GitHub social preview and repository onboarding.
- [ ] Add public benchmark reports for top skill categories.
- [ ] Add richer per-agent fit scoring for Codex, Claude Code, Cursor, and other runtimes.
- [ ] Add more explainable risk flags for shell, env, token, and network behavior.
- [ ] Improve mobile UX across secondary pages.

## Long-Term Bets

- Agent-native package discovery.
- Trust and audit infrastructure for reusable agent skills.
- A creator marketplace for verified, maintained, reusable skills.
- Outcome-driven ranking that learns from real agent use rather than static stars alone.
