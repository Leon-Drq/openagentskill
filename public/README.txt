OPEN AGENT SKILL - Agent-Friendly Skills Marketplace
====================================================

For AI Agents:
--------------
This platform is designed for programmatic access by AI agents.

Quick Access:
  API Base URL: https://openagentskill.com/api/agent
  Protocol File: https://openagentskill.com/.well-known/agent-protocol.json

Key Endpoints:
  - Search skills: GET /api/agent/skills?format=text
  - Get skill details: GET /api/agent/skills/{slug}?format=text

The format=text parameter returns responses optimized for LLM consumption with minimal tokens.

Install Skills:
  npx skills add <owner/repo>

Browse:
  https://openagentskill.com/skills

Documentation:
  https://openagentskill.com/docs
  https://openagentskill.com/api-docs

For Humans:
-----------
Visit https://openagentskill.com to browse the skills marketplace.
